import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import razorpay from '../utils/razorpay.js';

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

// POST /api/order/create-payment-order
router.post('/create-payment-order', async (req, res) => {
	const { amount, currency = 'INR', receipt = 'receipt#1' } = req.body;
	try {
		const order = await razorpay.orders.create({
			amount: amount * 100, // Amount in paise
			currency,
			receipt,
			payment_capture: 1
		});
		res.json(order);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

export default router;
