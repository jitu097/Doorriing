import { Router } from 'express';
import orderController from './order.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireCustomer } from '../../middlewares/role.middleware.js';

const router = Router();

// All order routes require authentication and customer account
router.use(authenticate, requireCustomer);

// Create order from cart
router.post('/', orderController.createOrder);

// Get customer's orders
router.get('/', orderController.getOrders);

// Get order details
router.get('/:id', orderController.getOrderById);

// Cancel order
router.post('/:id/cancel', orderController.cancelOrder);

export default router;
