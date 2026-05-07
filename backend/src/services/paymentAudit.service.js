import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

/**
 * Payment Audit Service
 *
 * Append-only event logger for every payment state change.
 * This is the source of truth for support disputes, refund tracing,
 * and admin visibility.
 *
 * Design principles:
 *  - NEVER throws — always fire-and-forget so it never breaks the caller.
 *  - Every write is a new row (append-only, never mutate audit history).
 *  - Structured fields for indexable queries + raw JSONB for full detail.
 *
 * Event types:
 *   payment_initiated   payment_captured   payment_failed
 *   payment_verified    payment_recovered  webhook_received
 *   refund_initiated    refund_processing  refund_completed
 *   refund_failed       order_cancelled
 */
const paymentAuditService = {

    /**
     * Write an audit event. Never throws — errors are logged and swallowed.
     *
     * @param {object} params
     * @param {string}  params.event               - Event type (see list above)
     * @param {string}  [params.orderId]            - Supabase order UUID
     * @param {string}  [params.customerId]         - Customer UUID
     * @param {string}  [params.shopId]             - Shop UUID
     * @param {string}  [params.razorpayOrderId]    - Razorpay order ID
     * @param {string}  [params.razorpayPaymentId]  - Razorpay payment ID
     * @param {string}  [params.razorpayRefundId]   - Razorpay refund ID
     * @param {string}  [params.paymentStatus]      - 'pending' | 'captured' | 'failed'
     * @param {string}  [params.orderStatus]        - order.status at time of event
     * @param {string}  [params.refundStatus]       - 'none' | 'pending' | 'processed' | 'failed'
     * @param {number}  [params.amount]             - Total amount (INR)
     * @param {number}  [params.refundAmount]       - Refunded amount (INR)
     * @param {string}  [params.failureReason]      - Decline reason / error message
     * @param {object}  [params.gatewayResponse]    - Raw Razorpay API response
     * @param {object}  [params.metadata]           - Any extra context
     */
    async log({
        event,
        orderId       = null,
        customerId    = null,
        shopId        = null,
        razorpayOrderId   = null,
        razorpayPaymentId = null,
        razorpayRefundId  = null,
        paymentStatus     = null,
        orderStatus       = null,
        refundStatus      = null,
        amount            = null,
        refundAmount      = null,
        failureReason     = null,
        gatewayResponse   = null,
        metadata          = null,
    }) {
        try {
            const { error } = await supabase
                .from('payment_audit_logs')
                .insert({
                    event,
                    order_id:            orderId,
                    customer_id:         customerId,
                    shop_id:             shopId,
                    razorpay_order_id:   razorpayOrderId,
                    razorpay_payment_id: razorpayPaymentId,
                    razorpay_refund_id:  razorpayRefundId,
                    payment_status:      paymentStatus,
                    order_status:        orderStatus,
                    refund_status:       refundStatus,
                    amount,
                    refund_amount:       refundAmount,
                    failure_reason:      failureReason,
                    gateway_response:    gatewayResponse ? JSON.parse(JSON.stringify(gatewayResponse)) : null,
                    metadata:            metadata ? JSON.parse(JSON.stringify(metadata)) : null,
                });

            if (error) {
                // Non-fatal: log the error but don't surface it to the caller
                logger.error('[Audit] Failed to write audit log', {
                    event,
                    orderId,
                    error: error.message,
                });
            } else {
                logger.debug('[Audit] Event logged', { event, orderId, razorpayOrderId });
            }
        } catch (err) {
            // Swallow — audit failure must never break the payment flow
            logger.error('[Audit] Unexpected error writing audit log', {
                event,
                orderId,
                error: err.message,
            });
        }
    },

    /**
     * Convenience wrapper: log a payment_initiated event.
     * Call this right after Razorpay order is created via initiate-payment.
     */
    async logPaymentInitiated({ customerId, razorpayOrderId, amount }) {
        return this.log({
            event: 'payment_initiated',
            customerId,
            razorpayOrderId,
            amount,
            paymentStatus: 'pending',
        });
    },

    /**
     * Convenience wrapper: log a payment_captured event.
     * Call this after verifyPayment creates the DB order.
     */
    async logPaymentCaptured({ orderId, customerId, shopId, razorpayOrderId, razorpayPaymentId, amount }) {
        return this.log({
            event: 'payment_captured',
            orderId,
            customerId,
            shopId,
            razorpayOrderId,
            razorpayPaymentId,
            amount,
            paymentStatus: 'captured',
            orderStatus: 'confirmed',
        });
    },

    /**
     * Convenience wrapper: log a payment_failed event.
     * Call this when verifyPayment signature check fails or order creation fails.
     */
    async logPaymentFailed({ customerId, razorpayOrderId, razorpayPaymentId, failureReason, gatewayResponse }) {
        return this.log({
            event: 'payment_failed',
            customerId,
            razorpayOrderId,
            razorpayPaymentId,
            paymentStatus: 'failed',
            failureReason,
            gatewayResponse,
        });
    },

    /**
     * Convenience wrapper: log a webhook_received event.
     */
    async logWebhookReceived({ orderId, customerId, shopId, razorpayOrderId, razorpayPaymentId, wasIdempotent }) {
        return this.log({
            event: 'webhook_received',
            orderId,
            customerId,
            shopId,
            razorpayOrderId,
            razorpayPaymentId,
            paymentStatus: 'captured',
            metadata: { wasIdempotent },
        });
    },

    /**
     * Convenience wrapper: log a payment_recovered event.
     */
    async logPaymentRecovered({ orderId, customerId, razorpayOrderId, razorpayPaymentId, amount }) {
        return this.log({
            event: 'payment_recovered',
            orderId,
            customerId,
            razorpayOrderId,
            razorpayPaymentId,
            amount,
            paymentStatus: 'captured',
            orderStatus: 'confirmed',
            metadata: { source: 'auto_recovery' },
        });
    },

    /**
     * Convenience wrapper: log a refund_initiated event.
     */
    async logRefundInitiated({ orderId, customerId, shopId, razorpayPaymentId, refundAmount, refundReason }) {
        return this.log({
            event: 'refund_initiated',
            orderId,
            customerId,
            shopId,
            razorpayPaymentId,
            refundAmount,
            refundStatus: 'pending',
            metadata: { reason: refundReason },
        });
    },

    /**
     * Convenience wrapper: log a refund_completed event.
     */
    async logRefundCompleted({ orderId, customerId, razorpayPaymentId, razorpayRefundId, refundAmount, gatewayResponse }) {
        return this.log({
            event: 'refund_completed',
            orderId,
            customerId,
            razorpayPaymentId,
            razorpayRefundId,
            refundAmount,
            refundStatus: 'processed',
            gatewayResponse,
        });
    },

    /**
     * Convenience wrapper: log a refund_failed event.
     */
    async logRefundFailed({ orderId, customerId, razorpayPaymentId, failureReason, gatewayResponse }) {
        return this.log({
            event: 'refund_failed',
            orderId,
            customerId,
            razorpayPaymentId,
            refundStatus: 'failed',
            failureReason,
            gatewayResponse,
        });
    },
};

export default paymentAuditService;
