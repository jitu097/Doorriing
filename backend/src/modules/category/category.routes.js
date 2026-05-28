import { Router } from 'express';
import categoryController from './category.controller.js';

const router = Router();

// Get grouped categories for the home dashboard
// Used in Home Page to render category cards before Explore Shops
router.get('/dashboard', categoryController.getDashboardCategories);

// Get all items that match a dashboard category name across shops
// Used when tapping a category card on the Home page
router.get('/dashboard/items', categoryController.getDashboardCategoryItems);

// Get categories by shop
// Used in Shop Page to display all categories for a shop
router.get('/shop/:shopId', categoryController.getCategoriesByShop);

// Get category details with subcategories and items
// Used in Category Page to display category hierarchy and items
router.get('/:categoryId', categoryController.getCategoryWithDetails);

// Get subcategories for a category (optional endpoint)
router.get('/:categoryId/subcategories', categoryController.getSubcategoriesByCategory);

export default router;
