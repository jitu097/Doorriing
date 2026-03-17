import { orderService } from '../services/order.service.js';

import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import express from 'express';

export const orderController = {
    /**
     * Create a new order via checkout
     * POST /api/user/orders/checkout
     */
    async checkout(req, res, next) {
        try {
            const customerId = req.user.customerId;
            // Address ID or Full Address can be handled in body, as per requirements
            const { addressId, addressDetails } = req.body;

            // Ensure addressId or addressDetails is provided
            if (!addressId && !addressDetails) {
                return res.status(400).json({
                    success: false,
                    message: 'Address ID or Address Details is required'
                });
            }

            const result = await orderService.checkout(customerId, addressId || addressDetails);

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

            res.status(200).json({
                success: true,
                data: orders
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

            res.status(200).json({
                success: true,
                data: order
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

    verifyPayment(req, res) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const key_secret = process.env.RAZORPAY_KEY_SECRET || 'F6b8cIOG8LNbAsXX29lPIylk';

        const generated_signature = crypto
            .createHmac('sha256', key_secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            return res.json({ success: true, message: 'Payment verified successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    }
};

