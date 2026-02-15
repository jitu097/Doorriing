import subcategoryService from './subcategory.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class SubcategoryController {
    /**
     * Get all subcategories for a category
     * GET /api/subcategories/category/:categoryId
     */
    async getSubcategoriesByCategory(req, res, next) {
        try {
            const { categoryId } = req.params;

            if (!categoryId) {
                return sendError(res, 'Category ID is required', 400);
            }

            const subcategories = await subcategoryService.getSubcategoriesByCategory(categoryId);
            return sendSuccess(res, subcategories, 'Subcategories fetched successfully');
        } catch (error) {
            if (error.message.includes('Invalid')) {
                return sendError(res, error.message, 400);
            }
            logger.error('GetSubcategoriesByCategory controller error', { error: error.message });
            next(error);
        }
    }

    /**
     * Get subcategories for a shop
     * GET /api/subcategories/shop/:shopId
     */
    async getSubcategoriesByShop(req, res, next) {
        try {
            const { shopId } = req.params;

            if (!shopId) {
                return sendError(res, 'Shop ID is required', 400);
            }

            const subcategories = await subcategoryService.getSubcategoriesByShop(shopId);
            return sendSuccess(res, subcategories, 'Subcategories fetched successfully');
        } catch (error) {
            if (error.message.includes('Invalid')) {
                return sendError(res, error.message, 400);
            }
            logger.error('GetSubcategoriesByShop controller error', { error: error.message });
            next(error);
        }
    }
}

export default new SubcategoryController();
