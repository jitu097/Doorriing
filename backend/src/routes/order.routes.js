import express from 'express';
import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import razorpay from '../utils/razorpay.js';
import crypto from 'crypto';
import { supabase } from '../config/supabaseClient.js';

const router = Router();

// All order endpoints require auth middleware
router.use(authenticate);

// POST /api/user/orders/checkout
router.post('/checkout', orderController.checkout);

// GET /api/user/orders
router.get('/', orderController.getOrders);

// GET /api/user/orders/:id
router.get('/:id', orderController.getOrderById);

// PATCH /api/user/orders/:id/cancel
router.patch('/:id/cancel', orderController.cancelOrder);

// POST /api/order/verify-payment
router.post('/verify-payment', orderController.verifyPayment);

// POST /api/order/create-payment-order
router.post('/create-payment-order', async (req, res) => {
	const { amount, currency = 'INR', receipt = `receipt_${Date.now()}` } = req.body;
	
	console.log('[Razorpay Debug] Creating order:', { amount, currency, receipt });

	// 1. Validate request body
	if (!amount || isNaN(amount) || amount <= 0) {
		console.error('[Razorpay Error] Invalid amount:', amount);
		return res.status(400).json({
			success: false,
			error: 'Invalid amount. Amount must be a positive number.'
		});
	}

	try {
		// 2. Fix order creation: ensure amount is an integer (paise)
		const options = {
			amount: Math.round(amount * 100), // Amount in paise
			currency,
			receipt,
			payment_capture: 1
		};

		console.log('[Razorpay Debug] Options sent to Razorpay:', options);

		const order = await razorpay.orders.create(options);
		
		console.log('[Razorpay Debug] Order created successfully:', order.id);
		res.json(order);
	} catch (error) {
		console.error('[Razorpay Error] Detailed creation error:', error);
		
		// 3. Ensure response always returns valid JSON
		res.status(500).json({ 
			success: false,
			error: error.message || 'Failed to create Razorpay order',
			details: error
		});
	}
});


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
			await supabase.from('orders')
				.update({ payment_status: 'paid', status: 'confirmed' })
				.eq('order_number', orderId);
		}

		// Add more event handling as needed
		res.status(200).json({ status: 'ok' });
	} else {
		res.status(400).json({ status: 'invalid signature' });
	}
});

export default router;
