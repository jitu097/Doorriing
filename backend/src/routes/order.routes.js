import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

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

export default router;
