import { Router } from 'express';
import subcategoryController from './subcategory.controller.js';

const router = Router();

// Get subcategories by category
router.get('/category/:categoryId', subcategoryController.getSubcategoriesByCategory);

// Get subcategories by shop
router.get('/shop/:shopId', subcategoryController.getSubcategoriesByShop);

export default router;
