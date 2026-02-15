import { Router } from 'express';
import authController from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Register or login (creates customer record if not exists)
router.post('/register', authenticate, authController.register);

// Get current user profile
router.get('/me', authenticate, authController.getProfile);

// Update profile
router.put('/profile', authenticate, authController.updateProfile);

export default router;
