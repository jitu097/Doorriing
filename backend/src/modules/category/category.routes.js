import { Router } from 'express';
import categoryController from './category.controller.js';

const router = Router();

// Get categories by shop
// Used in Shop Page to display all categories for a shop
router.get('/shop/:shopId', categoryController.getCategoriesByShop);

// Get category details with subcategories and items
// Used in Category Page to display category hierarchy and items
router.get('/:categoryId', categoryController.getCategoryWithDetails);

// Get subcategories for a category (optional endpoint)
router.get('/:categoryId/subcategories', categoryController.getSubcategoriesByCategory);

export default router;
