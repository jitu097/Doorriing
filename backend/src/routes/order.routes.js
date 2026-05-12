import express from 'express';
import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import reviewController from '../modules/review/review.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import crypto from 'crypto';
import { supabase } from '../config/supabaseClient.js';
import pushNotificationService from '../services/pushNotification.service.js';
import paymentAuditService from '../services/paymentAudit.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================================
// RAZORPAY WEBHOOK — must be BEFORE authenticate middleware
// Razorpay POSTs here without a Firebase JWT.
// Security is provided exclusively by HMAC signature validation.
// ============================================================
router.post(
    '/razorpay-webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!secret) {
            logger.error('[Webhook] RAZORPAY_WEBHOOK_SECRET is not configured');
            return res.status(500).json({ status: 'server misconfigured' });
        }

        const receivedSignature = req.headers['x-razorpay-signature'];
        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(req.body)
            .digest('hex');

        if (receivedSignature !== generatedSignature) {
            logger.warn('[Webhook] Invalid Razorpay signature — request rejected');
            return res.status(400).json({ status: 'invalid signature' });
        }

        // Parse event payload
        let event;
        try {
            event = JSON.parse(req.body);
        } catch (e) {
            logger.error('[Webhook] Failed to parse Razorpay payload', { error: e.message });
            return res.status(400).json({ status: 'invalid payload' });
        }

        logger.info('[Webhook] Received Razorpay event', { type: event.event });

        // Handle payment.captured — update order status
        if (event.event === 'payment.captured') {
            const razorpayPaymentId = event.payload.payment.entity.id;
            const razorpayOrderId   = event.payload.payment.entity.order_id;

            try {
                // ── Idempotency: check if already confirmed (verifyPayment ran first)
                const { data: currentOrder } = await supabase
                    .from('orders')
                    .select('id, status, payment_status, order_number')
                    .eq('razorpay_order_id', razorpayOrderId)
                    .maybeSingle();

                if (currentOrder?.payment_status === 'paid') {
                    logger.info('[Webhook] Idempotency hit: order already paid — no update needed', {
                        razorpayOrderId,
                        orderId: currentOrder.id,
                        orderNumber: currentOrder.order_number,
                    });
                    // Audit the duplicate webhook so support can see it
                    await paymentAuditService.logWebhookReceived({
                        orderId: currentOrder.id,
                        customerId: currentOrder.customer_id,
                        shopId: currentOrder.shop_id,
                        razorpayOrderId,
                        razorpayPaymentId,
                        wasIdempotent: true,
                    });
                    // Still respond 200 below so Razorpay stops retrying
                } else {
                    // Fix: match by razorpay_order_id (not order_number).
                    // razorpay_order_id is stored when the order is created in verifyPayment.
                    const { data: updatedOrder, error: updateError } = await supabase
                        .from('orders')
                        .update({
                            payment_status: 'paid',
                            status: 'confirmed',
                            razorpay_payment_id: razorpayPaymentId,
                        })
                        .eq('razorpay_order_id', razorpayOrderId)
                        .select('id, customer_id, shop_id, order_number')
                        .maybeSingle();

                    if (updateError) {
                        logger.error('[Webhook] DB update failed', { error: updateError.message, razorpayOrderId });
                    } else if (!updatedOrder) {
                        logger.warn('[Webhook] No order found for razorpay_order_id — verifyPayment may not have run yet', { razorpayOrderId });
                    } else {
                        logger.info('[Webhook] Order confirmed via webhook', {
                            orderId: updatedOrder.id,
                            orderNumber: updatedOrder.order_number,
                            razorpayOrderId,
                        });

                        // Audit: webhook_received (primary path)
                        await paymentAuditService.logWebhookReceived({
                            orderId: updatedOrder.id,
                            customerId: updatedOrder.customer_id,
                            shopId: updatedOrder.shop_id,
                            razorpayOrderId,
                            razorpayPaymentId,
                            wasIdempotent: false,
                        });

                        // Notify customer that their order is confirmed
                        try {
                            await pushNotificationService.sendOrderStatusNotification({
                                customer_id: updatedOrder.customer_id,
                                shop_id: updatedOrder.shop_id,
                                status: 'confirmed',
                                reference_id: updatedOrder.id,
                            });
                        } catch (pushError) {
                            logger.error('[Webhook] Failed to send confirmation notification', { error: pushError.message });
                        }
                    }
                }
            } catch (dbError) {
                logger.error('[Webhook] Unexpected error handling payment.captured', { error: dbError.message, razorpayOrderId });
            }
        }

        // Always respond 200 to Razorpay to prevent retries
        return res.status(200).json({ status: 'ok' });
    }
);

// ============================================================
// All endpoints below require Firebase auth
// ============================================================
router.use(authenticate);

// ---------------------------
// Payment Routes (authenticated)
// ---------------------------

// POST /api/user/orders/initiate-payment
router.post('/initiate-payment', orderController.initiatePayment);

// GET /api/user/orders/initiate-payment (Test route)
router.get('/initiate-payment', (req, res) => res.json({ message: 'Payment router is reachable via GET' }));

// POST /api/user/orders/verify-payment
router.post('/verify-payment', orderController.verifyPayment);

// GET /api/user/orders/recover-payment-status?razorpayOrderId=...&addressId=...
// Called automatically by the frontend on app reopen if a pending payment is
// found in localStorage. Returns the order if recovered, or status if pending.
router.get('/recover-payment-status', orderController.recoverPayment);

// ---------------------------
// Standard Order Routes
// ---------------------------

// POST /api/user/orders/checkout
router.post('/checkout', orderController.checkout);

// GET /api/user/orders
router.get('/', orderController.getOrders);

// GET /api/user/orders/:id
router.get('/:id', orderController.getOrderById);

// PATCH /api/user/orders/:id/cancel
router.patch('/:id/cancel', orderController.cancelOrder);

// POST /api/user/orders/:id/refund-payment
// Idempotent refund trigger. Safe to call multiple times for the same order.
// Returns existing refund details if already processed.
router.post('/:id/refund-payment', orderController.refundPayment);

// ---------------------------
// Review Routes
// ---------------------------

// POST /api/user/orders/:orderId/review
router.post('/:orderId/review', (req, res, next) => reviewController.submitReview(req, res, next));

// GET /api/user/orders/:orderId/review
router.get('/:orderId/review', (req, res, next) => reviewController.getReview(req, res, next));

// POST /api/user/orders/:orderId/items/:itemId/review
router.post('/:orderId/items/:itemId/review', (req, res, next) => reviewController.submitItemReview(req, res, next));

// GET /api/user/orders/:orderId/items/:itemId/review
router.get('/:orderId/items/:itemId/review', (req, res, next) => reviewController.getItemReview(req, res, next));

// GET /api/user/orders/:orderId/item-reviews
router.get('/:orderId/item-reviews', (req, res, next) => reviewController.getOrderItemReviews(req, res, next));


export default router;
