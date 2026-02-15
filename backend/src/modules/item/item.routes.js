import { Router } from 'express';
import itemController from './item.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

// Get items by shop (must be before /:id to avoid route conflict)
router.get('/shop/:shopId', optionalAuth, itemController.getItemsByShop);

// Get items by category
router.get('/category/:categoryId', optionalAuth, itemController.getItemsByCategory);

// Get items by subcategory
router.get('/subcategory/:subcategoryId', optionalAuth, itemController.getItemsBySubcategory);

// Get item by ID (must be last)
router.get('/:id', optionalAuth, itemController.getItemById);

export default router;
