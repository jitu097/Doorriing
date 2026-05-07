import { orderService } from '../services/order.service.js';
import paymentRecoveryService from '../services/paymentRecovery.service.js';
import paymentAuditService from '../services/paymentAudit.service.js';
import refundService from '../services/refund.service.js';

import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import express from 'express';

const parseDeadline = (deadlineStr) => {
    if (!deadlineStr) return null;
    if (typeof deadlineStr === 'string' && !deadlineStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(deadlineStr)) {
        return new Date(deadlineStr.replace(' ', 'T') + 'Z');
    }
    return new Date(deadlineStr);
};

export const orderController = {
    /**
     * Create a new order via checkout
     * POST /api/user/orders/checkout
     */
    async checkout(req, res, next) {
        try {
            const customerId = req.user.customerId;
            // Address ID or Full Address can be handled in body, as per requirements
            const { addressId, addressDetails, pricing, paymentMethod } = req.body;

            // Ensure addressId or addressDetails is provided
            if (!addressId && !addressDetails) {
                return res.status(400).json({
                    success: false,
                    message: 'Address ID or Address Details is required'
                });
            }

            // Normalise payment method — only accept known values; default to 'cod'
            const normalizedPaymentMethod = ['cod', 'online', 'card'].includes(
                String(paymentMethod || '').toLowerCase()
            ) ? String(paymentMethod).toLowerCase() : 'cod';

            const result = await orderService.checkout(
                customerId,
                addressId || addressDetails,
                pricing || {},
                normalizedPaymentMethod  // ← was missing; was always 'cod'
            );

            res.status(201).json({
                success: true,
                message: 'Order placed successfully',
                data: result
            });
        } catch (error) {
            console.error('------- RAW ORDER CONTROLLER ERROR -------');
            console.error(error);
            logger.error('Order checkout error', { error: error.message, stack: error.stack });

            if (error.message.includes('No cart') || error.message.includes('Cart empty') || error.message.includes('validation failed')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: `Failed to place order. ${error.message}`
            });
        }
    },

    /**
     * Get user orders
     * GET /api/user/orders
     */
    async getOrders(req, res, next) {
        try {
            const customerId = req.user.customerId;
            const orders = await orderService.getOrders(customerId);

            // Add remaining_time for each order
            const now = new Date();
            const ordersWithTime = (orders || []).map(order => {
                let remaining_time = 0;
                if (order.acceptance_deadline) {
                    const deadline = parseDeadline(order.acceptance_deadline);
                    const now = new Date();
                    remaining_time = Math.max(0, Math.floor((deadline - now) / 1000));
                }
                return { ...order, remaining_time };
            });

            res.status(200).json({
                success: true,
                data: ordersWithTime
            });
        } catch (error) {
            logger.error('Get orders error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders'
            });
        }
    },

    /**
     * Get order details
     * GET /api/user/orders/:id
     */
    async getOrderById(req, res, next) {
        try {
            const customerId = req.user.customerId;
            const { id } = req.params;

            const order = await orderService.getOrderById(customerId, id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Calculate remaining_time
            let remaining_time = 0;
            if (order.acceptance_deadline) {
                const now = new Date();
                const deadline = parseDeadline(order.acceptance_deadline);
                remaining_time = Math.max(0, Math.floor((deadline - now) / 1000)); // seconds
            }

            res.status(200).json({
                success: true,
                data: {
                    ...order,
                    remaining_time,
                }
            });
        } catch (error) {
            logger.error('Get order by ID error', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order details'
            });
        }
    },

    /**
     * Cancel an order
     * PATCH /api/user/orders/:id/cancel
     */
    async cancelOrder(req, res, next) {
        try {
            const customerId = req.user.customerId;
            const { id } = req.params;

            await orderService.cancelOrder(customerId, id);

            res.status(200).json({
                success: true,
                message: 'Order cancelled successfully'
            });
        } catch (error) {
            logger.error('Cancel order error', { error: error.message });
            if (error.message.includes('not found') || error.message.includes('Customer does not own')) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            if (error.message.includes('Cannot cancel')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Failed to cancel order' });
        }
    },

    /**
     * Initiate a Razorpay payment order
     * POST /api/user/orders/initiate-payment
     */
    async initiatePayment(req, res) {
        const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}` } = req.body;
        const { default: razorpay } = await import('../utils/razorpay.js');

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Amount must be a positive number.'
            });
        }

        try {
            const options = {
                amount: Math.round(amount * 100),
                currency,
                receipt,
                payment_capture: 1
            };

            const order = await razorpay.orders.create(options);
            res.status(200).json(order);
        } catch (error) {
            console.error('[Razorpay Controller Error]', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create payment order'
            });
        }
    },

    /**
     * Verify Razorpay payment signature AND create a DB order.
     *
     * Previously this only verified the signature — no order was ever created
     * for online payments. Now it also:
     *   1. Validates the Razorpay HMAC signature
     *   2. Calls orderService.createOnlinePaidOrder() to persist the order
     *   3. Returns the real Supabase order UUID (not the Razorpay order_id)
     *
     * POST /api/user/orders/verify-payment
     * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature,
     *         addressId, pricing }
     */
    async verifyPayment(req, res) {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            addressId,
            pricing,
        } = req.body;

        // ── 1. Guard: required Razorpay fields ─────────────────────────────
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing Razorpay payment fields (order_id, payment_id, signature)'
            });
        }

        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: 'addressId is required to create the order after payment'
            });
        }

        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        if (!key_secret) {
            logger.error('[verifyPayment] RAZORPAY_KEY_SECRET not set in environment');
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }

        // ── 2. HMAC signature verification ─────────────────────────────────
        const generated_signature = crypto
            .createHmac('sha256', key_secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            logger.warn('[verifyPayment] Signature mismatch', { razorpay_order_id, razorpay_payment_id });

            // Audit: payment_failed (signature mismatch — possible tampering)
            await paymentAuditService.logPaymentFailed({
                customerId: req.user?.customerId,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                failureReason: 'HMAC signature mismatch — possible request tampering',
            });

            return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
        }

        // ── 3. Signature valid — create DB order ───────────────────────────
        const customerId = req.user.customerId;

        try {
            const newOrder = await orderService.createOnlinePaidOrder(customerId, {
                addressId,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                pricing: pricing || {},
            });

            return res.status(200).json({
                success: true,
                message: 'Payment verified and order created successfully',
                data: {
                    orderId: newOrder.id,                    // ← real Supabase UUID
                    orderNumber: newOrder.order_number,      // ← e.g. BZ-20260507-4231
                    status: newOrder.status,                 // 'confirmed'
                    paymentStatus: newOrder.payment_status,  // 'paid'
                }
            });
        } catch (error) {
            // CRITICAL: Payment was captured by Razorpay but order creation failed.
            // We log with full context so support can manually create the order.
            logger.error('[verifyPayment] CRITICAL: Payment captured but order creation failed', {
                error: error.message,
                customerId,
                razorpay_order_id,
                razorpay_payment_id,
            });

            // Audit: payment_failed (order creation failure — money deducted but no order)
            await paymentAuditService.logPaymentFailed({
                customerId,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                failureReason: `Order creation failed after payment capture: ${error.message}`,
            });

            return res.status(500).json({
                success: false,
                message: 'Payment was captured but order could not be created. Please contact support with your payment ID.',
                paymentId: razorpay_payment_id,  // give user something to reference
            });
        }
    },

    /**
     * Recover a payment that was captured but whose order was never created.
     *
     * Called when the frontend detects a stored pending payment on app reopen.
     * This is the primary defense against "money deducted but no order" scenarios.
     *
     * GET /api/user/orders/recover-payment-status?razorpayOrderId=order_xxx&addressId=uuid
     */
    async recoverPayment(req, res) {
        const customerId = req.user?.customerId;
        const { razorpayOrderId, addressId } = req.query;

        if (!razorpayOrderId) {
            return res.status(400).json({
                success: false,
                message: 'razorpayOrderId query param is required',
            });
        }

        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: 'addressId query param is required to recover the order',
            });
        }

        logger.info('[recoverPayment] Recovery requested', {
            customerId,
            razorpayOrderId,
            addressId,
        });

        try {
            const result = await paymentRecoveryService.recoverPayment(
                customerId,
                razorpayOrderId,
                addressId,
            );

            // All terminal states (recovered, already_exists, pending, not_found, failed)
            // return 200 — the frontend decides what to show based on `status`.
            return res.status(200).json({
                success: true,
                status: result.status,
                message: result.message,
                data: result.order
                    ? {
                        orderId: result.order.id,
                        orderNumber: result.order.order_number,
                        paymentStatus: result.order.payment_status,
                    }
                    : null,
            });
        } catch (error) {
            logger.error('[recoverPayment] Recovery failed', {
                error: error.message,
                customerId,
                razorpayOrderId,
            });

            return res.status(500).json({
                success: false,
                status: 'error',
                message: error.message || 'Payment recovery check failed.',
            });
        }
    },
    /**
     * Trigger an idempotent refund for a specific order.
     * Safe to call multiple times � returns existing refund if already processed.
     * POST /api/user/orders/:id/refund-payment
     * Body: { reason?: string }
     */
    async refundPayment(req, res) {
        const customerId = req.user?.customerId;
        const { id: orderId } = req.params;
        const { reason = 'customer_requested' } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
        }

        logger.info('[refundPayment] Refund requested', { customerId, orderId, reason });

        try {
            const result = await refundService.initiateRefund({
                orderId,
                customerId,
                reason,
                skipOwnerCheck: false,
            });

            const statusCode = result.status === 'not_eligible' ? 422 : 200;

            return res.status(statusCode).json({
                success: result.status !== 'not_eligible',
                status: result.status,
                message: result.message,
                data: result.refundId
                    ? { refundId: result.refundId, refundAmount: result.refundAmount }
                    : null,
            });
        } catch (error) {
            logger.error('[refundPayment] Error', { error: error.message, orderId, customerId });

            if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
                return res.status(404).json({ success: false, message: error.message });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Refund request failed. Please contact support.',
            });
        }
    },
    // Duplicate refundPayment removed — single definition above (lines 393–434) is canonical.
};

