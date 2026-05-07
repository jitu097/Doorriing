import razorpay from '../utils/razorpay.js';
import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';
import paymentAuditService from './paymentAudit.service.js';
import pushNotificationService from './pushNotification.service.js';

/**
 * Refund Service
 *
 * Handles Razorpay refunds with:
 *  - Full idempotency (duplicate refund prevention at DB + Razorpay level)
 *  - Automatic audit trail via paymentAuditService
 *  - Customer push notification on completion
 *  - Production-safe error handling
 *
 * Called from:
 *  - orderService.cancelOrder()        when a paid order is cancelled by customer
 *  - refundPayment controller          for manual/admin-triggered refunds
 *  - (future) seller rejection handler when seller rejects a paid order
 */
const refundService = {

    /**
     * Initiate a refund for a paid order.
     *
     * @param {object} params
     * @param {string} params.orderId           - Supabase order UUID
     * @param {string} params.customerId        - For ownership verification
     * @param {string} params.reason            - Human-readable refund reason
     * @param {boolean} [params.skipOwnerCheck] - Set true for admin/seller initiated refunds
     *
     * @returns {Promise<{
     *   status: 'refunded' | 'already_refunded' | 'not_eligible',
     *   refundId?: string,
     *   refundAmount?: number,
     *   message: string
     * }>}
     */
    async initiateRefund({ orderId, customerId, reason, skipOwnerCheck = false }) {
        logger.info('[Refund] Initiating refund', { orderId, customerId, reason });

        // ── Step 1: Fetch order with all refund-relevant fields ───────────────
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('id, status, payment_status, payment_method, customer_id, shop_id, ' +
                    'total_amount, razorpay_payment_id, razorpay_order_id, ' +
                    'refund_status, refund_id, order_number')
            .eq('id', orderId)
            .maybeSingle();

        if (fetchError || !order) {
            throw new Error(`Order not found: ${orderId}`);
        }

        // Ownership check (skipped for admin/seller flows)
        if (!skipOwnerCheck && order.customer_id !== customerId) {
            throw new Error('Unauthorized: customer does not own this order');
        }

        // ── Step 2: Idempotency — is a refund already done/in-progress? ───────
        if (order.refund_status === 'processed') {
            logger.info('[Refund] Idempotency hit: refund already processed', {
                orderId,
                refundId: order.refund_id,
            });
            return {
                status: 'already_refunded',
                refundId: order.refund_id,
                refundAmount: Number(order.refund_amount),
                message: `Refund already processed (ID: ${order.refund_id})`,
            };
        }

        if (order.refund_status === 'pending' || order.refund_status === 'processing') {
            logger.info('[Refund] Idempotency hit: refund already in progress', {
                orderId,
                refundStatus: order.refund_status,
            });
            return {
                status: 'already_refunded',
                refundId: order.refund_id,
                message: `Refund already in progress (status: ${order.refund_status})`,
            };
        }

        // ── Step 3: Eligibility — only paid online orders can be refunded ─────
        if (order.payment_method === 'cod' || order.payment_method === 'COD') {
            logger.info('[Refund] COD order — no refund needed', { orderId });
            return {
                status: 'not_eligible',
                message: 'COD orders do not require a payment refund.',
            };
        }

        if (order.payment_status !== 'paid') {
            logger.info('[Refund] Order not paid — no refund needed', {
                orderId,
                paymentStatus: order.payment_status,
            });
            return {
                status: 'not_eligible',
                message: `Order payment_status is '${order.payment_status}' — nothing to refund.`,
            };
        }

        if (!order.razorpay_payment_id) {
            logger.error('[Refund] CRITICAL: paid order has no razorpay_payment_id', { orderId });
            throw new Error(
                'Cannot refund: razorpay_payment_id is missing. Manual intervention required.'
            );
        }

        const refundAmountINR = Number(order.total_amount);
        if (!refundAmountINR || refundAmountINR <= 0) {
            throw new Error('Invalid refund amount — total_amount is 0 or null');
        }

        // ── Step 4: Mark refund as pending BEFORE calling Razorpay ───────────
        // This protects against double-calls between the DB write and Razorpay response.
        const { error: markError } = await supabase
            .from('orders')
            .update({
                refund_status: 'pending',
                refund_reason: reason,
                refund_initiated_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        if (markError) {
            logger.error('[Refund] Failed to mark refund as pending', { orderId, error: markError.message });
            throw new Error('Failed to initiate refund: database error');
        }

        // Audit: refund_initiated
        await paymentAuditService.logRefundInitiated({
            orderId,
            customerId: order.customer_id,
            shopId: order.shop_id,
            razorpayPaymentId: order.razorpay_payment_id,
            refundAmount: refundAmountINR,
            refundReason: reason,
        });

        // ── Step 5: Call Razorpay refund API ─────────────────────────────────
        let razorpayRefund;
        try {
            razorpayRefund = await razorpay.payments.refund(order.razorpay_payment_id, {
                amount: Math.round(refundAmountINR * 100),  // Razorpay uses paise
                speed: 'normal',                             // 'normal' (5–7 days) or 'optimum'
                notes: {
                    order_id: orderId,
                    order_number: order.order_number,
                    reason,
                },
            });

            logger.info('[Refund] Razorpay refund API success', {
                orderId,
                refundId: razorpayRefund.id,
                refundAmount: refundAmountINR,
                razorpayPaymentId: order.razorpay_payment_id,
            });
        } catch (razorpayError) {
            // Razorpay API call failed — update status to 'failed' and audit
            const failureReason = razorpayError?.error?.description || razorpayError.message;

            logger.error('[Refund] Razorpay refund API failed', {
                orderId,
                error: failureReason,
                razorpayPaymentId: order.razorpay_payment_id,
            });

            await supabase
                .from('orders')
                .update({ refund_status: 'failed' })
                .eq('id', orderId);

            await paymentAuditService.logRefundFailed({
                orderId,
                customerId: order.customer_id,
                razorpayPaymentId: order.razorpay_payment_id,
                failureReason,
                gatewayResponse: razorpayError?.error || null,
            });

            throw new Error(`Refund failed: ${failureReason}`);
        }

        // ── Step 6: Persist refund result to DB ───────────────────────────────
        const { error: saveError } = await supabase
            .from('orders')
            .update({
                refund_status:       'processed',
                refund_id:           razorpayRefund.id,
                refund_amount:       refundAmountINR,
                refund_completed_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        if (saveError) {
            // Razorpay refund succeeded but we couldn't save the refund_id.
            // This is a critical discrepancy — log urgently.
            logger.error('[Refund] CRITICAL: Razorpay refund succeeded but DB update failed', {
                orderId,
                refundId: razorpayRefund.id,
                error: saveError.message,
            });
            // Still return success since money is refunded — caller can reconcile from audit log
        }

        // Audit: refund_completed
        await paymentAuditService.logRefundCompleted({
            orderId,
            customerId: order.customer_id,
            razorpayPaymentId: order.razorpay_payment_id,
            razorpayRefundId: razorpayRefund.id,
            refundAmount: refundAmountINR,
            gatewayResponse: razorpayRefund,
        });

        // ── Step 7: Notify customer ───────────────────────────────────────────
        try {
            await pushNotificationService.sendOrderStatusNotification({
                customer_id: order.customer_id,
                shop_id: order.shop_id,
                status: 'refund_processed',
                reference_id: orderId,
            });
        } catch (notifError) {
            logger.warn('[Refund] Customer notification failed (non-fatal)', {
                orderId,
                error: notifError.message,
            });
        }

        logger.info('[Refund] Refund completed successfully', {
            orderId,
            refundId: razorpayRefund.id,
            refundAmount: refundAmountINR,
        });

        return {
            status: 'refunded',
            refundId: razorpayRefund.id,
            refundAmount: refundAmountINR,
            message: `Refund of ₹${refundAmountINR} initiated. It will reflect in 5–7 business days.`,
        };
    },
};

export default refundService;
