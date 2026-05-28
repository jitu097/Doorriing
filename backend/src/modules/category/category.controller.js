import categoryService from './category.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class CategoryController {
  /**
   * Get all categories for a shop
   * GET /api/categories/shop/:shopId
   * Used in: Shop Page
   */
  async getCategoriesByShop(req, res, next) {
    try {
      const { shopId } = req.params;

      if (!shopId) {
        return sendError(res, 'Shop ID is required', 400);
      }

      const categories = await categoryService.getCategoriesByShop(shopId);
      return sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (error) {
      // Handle validation errors
      if (error.message.includes('Invalid')) {
        return sendError(res, error.message, 400);
      }
      logger.error('GetCategoriesByShop controller error', { error: error.message, shopId: req.params.shopId });
      next(error);
    }
  }

  /**
   * Get grouped dashboard categories
   * GET /api/categories/dashboard
   * Used in: Home page to render the category strip before Explore Shops
   */
  async getDashboardCategories(req, res, next) {
    try {
      const categories = await categoryService.getDashboardCategories();
      return sendSuccess(res, categories, 'Dashboard categories fetched successfully');
    } catch (error) {
      logger.error('GetDashboardCategories controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get all items that match a dashboard category name across shops.
   * GET /api/categories/dashboard/items?name=pizza
   */
  async getDashboardCategoryItems(req, res, next) {
    try {
      const { name } = req.query;

      if (!name) {
        return sendError(res, 'Category name is required', 400);
      }

      const result = await categoryService.getDashboardCategoryItems(name);
      return sendSuccess(res, result, 'Dashboard category items fetched successfully');
    } catch (error) {
      logger.error('GetDashboardCategoryItems controller error', { error: error.message, name: req.query.name });
      next(error);
    }
  }

  /**
   * Get category details with subcategories and items
   * GET /api/categories/:categoryId
   * Used in: Category Page
   * 
   * Query params:
   * - shop_id (required): Ensures category belongs to the correct shop
   */
  async getCategoryWithDetails(req, res, next) {
    try {
      const { categoryId } = req.params;
      const { shop_id } = req.query;

      if (!categoryId) {
        return sendError(res, 'Category ID is required', 400);
      }

      if (!shop_id) {
        return sendError(res, 'Shop ID is required', 400);
      }

      logger.debug('Fetching category details', { categoryId, shop_id });

      const categoryDetails = await categoryService.getCategoryWithDetails(categoryId, shop_id);
      return sendSuccess(res, categoryDetails, 'Category details fetched successfully');
    } catch (error) {
      // Handle validation errors
      if (error.message.includes('Invalid')) {
        logger.warn('Validation error in getCategoryWithDetails', { error: error.message });
        return sendError(res, error.message, 400);
      }
      // Handle not found errors
      if (error.message === 'Category not found') {
        logger.warn('Category not found', { categoryId: req.params.categoryId, shop_id: req.query.shop_id });
        return sendError(res, 'Category not found or has been deactivated', 404);
      }
      logger.error('GetCategoryWithDetails controller error', { error: error.message, categoryId: req.params.categoryId, shop_id: req.query.shop_id });
      next(error);
    }
  }

  /**
   * Get subcategories for a category
   * GET /api/categories/:categoryId/subcategories
   * Used in: Optional - if frontend needs subcategories separately
   */
  async getSubcategoriesByCategory(req, res, next) {
    try {
      const { categoryId } = req.params;

      if (!categoryId) {
        return sendError(res, 'Category ID is required', 400);
      }

      const subcategories = await categoryService.getSubcategoriesByCategory(categoryId);
      return sendSuccess(res, subcategories, 'Subcategories fetched successfully');
    } catch (error) {
      logger.error('GetSubcategoriesByCategory controller error', { error: error.message });
      next(error);
    }
  }
}

export default new CategoryController();
