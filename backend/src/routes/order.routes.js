import express from 'express';
import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import razorpay from '../utils/razorpay.js';
import crypto from 'crypto';
import { supabase } from '../config/supabaseClient.js';
import pushNotificationService from '../services/pushNotification.service.js';

const router = Router();

// All order endpoints require auth middleware
router.use(authenticate);

// ---------------------------
// Payment Routes
// ---------------------------

// POST /api/user/orders/initiate-payment
router.post('/initiate-payment', orderController.initiatePayment);

// GET /api/user/orders/initiate-payment (Test route)
router.get('/initiate-payment', (req, res) => res.json({ message: 'Payment router is reachable via GET' }));

// POST /api/user/orders/verify-payment
router.post('/verify-payment', orderController.verifyPayment);

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


// Razorpay webhook endpoint (no auth middleware)
router.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
	const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';
	const receivedSignature = req.headers['x-razorpay-signature'];
	const generatedSignature = crypto
		.createHmac('sha256', secret)
		.update(req.body)
		.digest('hex');

	if (receivedSignature === generatedSignature) {
		// Parse event
		let event;
		try {
			event = JSON.parse(req.body);
		} catch (e) {
			return res.status(400).json({ status: 'invalid payload' });
		}

		// Handle payment captured event
		if (event.event === 'payment.captured') {
			const paymentId = event.payload.payment.entity.id;
			const orderId = event.payload.payment.entity.order_id;
			// Update order status in DB
			const { data: updatedOrder } = await supabase.from('orders')
				.update({ payment_status: 'paid', status: 'confirmed' })
				.eq('order_number', orderId)
				.select('id, customer_id, shop_id')
				.maybeSingle();

			if (updatedOrder?.customer_id) {
				try {
					console.log('Triggering order confirmation push notification', {
						orderId: updatedOrder.id,
						customerId: updatedOrder.customer_id,
						shopId: updatedOrder.shop_id,
						paymentId,
					});
					await pushNotificationService.sendOrderStatusNotification({
						customer_id: updatedOrder.customer_id,
						shop_id: updatedOrder.shop_id,
						status: 'confirmed',
						reference_id: updatedOrder.id,
					});
				} catch (pushError) {
					console.error('Failed to send order confirmation push notification', pushError);
				}
			}
		}

		// Add more event handling as needed
		res.status(200).json({ status: 'ok' });
	} else {
		res.status(400).json({ status: 'invalid signature' });
	}
});

export default router;
