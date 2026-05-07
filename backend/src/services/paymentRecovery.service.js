import razorpay from '../utils/razorpay.js';
import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';
import { orderService } from './order.service.js';
import paymentAuditService from './paymentAudit.service.js';

/**
 * Payment Recovery Service
 *
 * Solves the "money deducted but no order" problem caused by:
 *   - App closing after payment but before verifyPayment completes
 *   - Network disconnect after Razorpay capture
 *   - Webhook delivery delays from Razorpay
 *
 * Recovery is fully idempotent — calling it multiple times for the same
 * razorpayOrderId will always return the same result safely.
 */
const paymentRecoveryService = {

    /**
     * Attempt to recover a pending payment.
     *
     * @param {string} customerId      - Supabase UUID of the authenticated customer
     * @param {string} razorpayOrderId - Razorpay order ID stored by frontend (e.g. "order_Abc123")
     * @param {string} addressId       - Customer address UUID stored by frontend before payment
     *
     * @returns {Promise<{
     *   status: 'recovered' | 'already_exists' | 'pending' | 'failed' | 'not_found',
     *   order?: object,
     *   message: string
     * }>}
     */
    async recoverPayment(customerId, razorpayOrderId, addressId) {
        logger.info('[Recovery] Starting payment recovery check', {
            customerId,
            razorpayOrderId,
        });

        // ── Guard 1: DB-first check ────────────────────────────────────────────
        // Before making any external API call, check if the order already exists
        // in our DB. This covers:
        //   a) verifyPayment DID complete and created the order (navigate just failed)
        //   b) A previous recovery attempt already ran
        //   c) Webhook arrived and created/updated the order
        const { data: existingOrder, error: dbError } = await supabase
            .from('orders')
            .select('id, order_number, status, payment_status, razorpay_payment_id, customer_id')
            .eq('razorpay_order_id', razorpayOrderId)
            .eq('customer_id', customerId)   // security: ensure customer owns this order
            .maybeSingle();

        if (dbError) {
            logger.error('[Recovery] DB lookup error', { error: dbError.message, razorpayOrderId });
            throw new Error(`Recovery DB lookup failed: ${dbError.message}`);
        }

        if (existingOrder) {
            logger.info('[Recovery] Order already exists in DB — no recovery needed', {
                orderId: existingOrder.id,
                orderNumber: existingOrder.order_number,
                status: existingOrder.status,
                paymentStatus: existingOrder.payment_status,
                razorpayOrderId,
            });
            return {
                status: 'already_exists',
                order: existingOrder,
                message: 'Order already exists. Redirecting to confirmation.',
            };
        }

        // ── Guard 2: Call Razorpay API to check real payment status ───────────
        // Only runs if our DB has no matching order. We fetch the Razorpay order
        // to see if the payment was actually captured.
        let razorpayOrder;
        try {
            razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);
            logger.info('[Recovery] Razorpay order status', {
                razorpayOrderId,
                status: razorpayOrder.status,
                amountPaid: razorpayOrder.amount_paid,
                amountDue: razorpayOrder.amount_due,
            });
        } catch (apiError) {
            logger.error('[Recovery] Razorpay API fetch failed', {
                error: apiError.message,
                razorpayOrderId,
            });
            throw new Error(`Could not reach Razorpay to verify payment: ${apiError.message}`);
        }

        // Razorpay order statuses: 'created' | 'attempted' | 'paid'
        if (razorpayOrder.status !== 'paid') {
            logger.info('[Recovery] Razorpay order not yet paid', {
                razorpayOrderId,
                status: razorpayOrder.status,
            });
            return {
                status: razorpayOrder.status === 'created' ? 'not_found' : 'pending',
                message: `Payment status: ${razorpayOrder.status}. No order to recover.`,
            };
        }

        // ── Guard 3: Find the captured payment ID ─────────────────────────────
        // Razorpay order is paid — fetch the payment items to get the payment_id
        let razorpayPaymentId;
        try {
            const paymentsData = await razorpay.orders.fetchPayments(razorpayOrderId);
            const captured = (paymentsData.items || []).find(p => p.status === 'captured');

            if (!captured) {
                logger.warn('[Recovery] Razorpay order is "paid" but no captured payment found', {
                    razorpayOrderId,
                    itemCount: paymentsData.items?.length,
                });
                return {
                    status: 'pending',
                    message: 'Payment is captured on Razorpay but no payment record found. Webhook should arrive soon.',
                };
            }

            razorpayPaymentId = captured.id;
            logger.info('[Recovery] Found captured payment', {
                razorpayOrderId,
                razorpayPaymentId,
            });
        } catch (paymentsError) {
            logger.error('[Recovery] Failed to fetch Razorpay payments', {
                error: paymentsError.message,
                razorpayOrderId,
            });
            throw new Error(`Could not fetch payment details from Razorpay: ${paymentsError.message}`);
        }

        // ── Step 4: Create the missing DB order ───────────────────────────────
        // The payment was captured but our DB has no order. Recover by calling
        // createOnlinePaidOrder, which is itself idempotent via its own guards.
        logger.info('[Recovery] RECOVERING: payment captured but DB order missing. Creating order now.', {
            customerId,
            razorpayOrderId,
            razorpayPaymentId,
            addressId,
        });

        let recoveredOrder;
        try {
            recoveredOrder = await orderService.createOnlinePaidOrder(customerId, {
                addressId,
                razorpayOrderId,
                razorpayPaymentId,
                pricing: {},   // createOnlinePaidOrder recalculates server-side from cart
            });
        } catch (createError) {
            logger.error('[Recovery] createOnlinePaidOrder failed during recovery', {
                error: createError.message,
                customerId,
                razorpayOrderId,
                razorpayPaymentId,
            });
            // Surface a specific message for support tracing
            throw new Error(
                `Payment captured (ID: ${razorpayPaymentId}) but order creation failed: ${createError.message}`
            );
        }

        // ── Step 5: Mark the order as recovered (audit trail) ────────────────
        // Store recovery timestamp so support team can see which orders
        // were auto-recovered vs created normally via verifyPayment.
        const { error: recoveryMarkError } = await supabase
            .from('orders')
            .update({ payment_recovered_at: new Date().toISOString() })
            .eq('id', recoveredOrder.id);

        if (recoveryMarkError) {
            // Non-fatal: order was created successfully, just log the mark failure
            logger.warn('[Recovery] Could not set payment_recovered_at (column may not exist yet)', {
                orderId: recoveredOrder.id,
                error: recoveryMarkError.message,
            });
        }

        logger.info('[Recovery] SUCCESS: missing order recovered and created', {
            orderId: recoveredOrder.id,
            orderNumber: recoveredOrder.order_number,
            razorpayOrderId,
            razorpayPaymentId,
        });

        // Audit: payment_recovered — visible to support team in payment_audit_logs
        await paymentAuditService.logPaymentRecovered({
            orderId: recoveredOrder.id,
            customerId,
            razorpayOrderId,
            razorpayPaymentId,
            amount: recoveredOrder.total_amount,
        });

        return {
            status: 'recovered',
            order: recoveredOrder,
            message: 'Payment recovered successfully. Your order has been created.',
        };
    },
};

export default paymentRecoveryService;
