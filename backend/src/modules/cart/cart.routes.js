import { Router } from 'express';
import cartController from './cart.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireCustomer } from '../../middlewares/role.middleware.js';

const router = Router();

// All cart routes require authentication and customer account
router.use(authenticate, requireCustomer);

// Get customer's cart
router.get('/', cartController.getCart);

// Add item to cart
router.post('/items', cartController.addItem);

// Update cart item quantity
router.put('/items/:id', cartController.updateItem);

// Remove item from cart
router.delete('/items/:id', cartController.removeItem);

// Clear entire cart
router.delete('/', cartController.clearCart);

export default router;
