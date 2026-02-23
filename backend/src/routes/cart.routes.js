import express from 'express';
import { cartController } from '../controllers/cart.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all cart routes
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.patch('/update', cartController.updateCartItem);
router.delete('/remove/:itemId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

export default router;
