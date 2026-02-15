import itemService from './item.service.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants.js';

class ItemController {
  /**
   * Get items by shop
   * GET /api/items/shop/:shopId
   */
  async getItemsByShop(req, res, next) {
    try {
      const { shopId } = req.params;
      const { category_id, subcategory_id, search, in_stock_only, page = 1, page_size = DEFAULT_PAGE_SIZE } = req.query;

      const filters = {
        category_id,
        subcategory_id,
        search,
        in_stock_only,
      };

      const result = await itemService.getItemsByShop(
        shopId,
        filters,
        parseInt(page),
        parseInt(page_size)
      );

      return sendPaginated(res, result.items, result.pagination, 'Items fetched successfully');
    } catch (error) {
      logger.error('GetItemsByShop controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get item by ID
   * GET /api/items/:id
   */
  async getItemById(req, res, next) {
    try {
      const { id } = req.params;

      const item = await itemService.getItemById(id);
      return sendSuccess(res, item, 'Item fetched successfully');
    } catch (error) {
      if (error.message === 'Item not found') {
        return sendError(res, 'Item not found', 404);
      }
      logger.error('GetItemById controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get items by category
   * GET /api/items/category/:categoryId
   */
  async getItemsByCategory(req, res, next) {
    try {
      const { categoryId } = req.params;
      const { page = 1, page_size = DEFAULT_PAGE_SIZE } = req.query;

      const result = await itemService.getItemsByCategory(
        categoryId,
        parseInt(page),
        parseInt(page_size)
      );

      return sendPaginated(res, result.items, result.pagination, 'Items fetched successfully');
    } catch (error) {
      logger.error('GetItemsByCategory controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get items by subcategory
   * GET /api/items/subcategory/:subcategoryId
   */
  async getItemsBySubcategory(req, res, next) {
    try {
      const { subcategoryId } = req.params;
      const { shop_id, page = 1, page_size = DEFAULT_PAGE_SIZE } = req.query;

      if (!shop_id) {
        return sendError(res, 'Shop ID is required', 400);
      }

      const result = await itemService.getItemsBySubcategory(
        subcategoryId,
        shop_id,
        parseInt(page),
        parseInt(page_size)
      );

      return sendPaginated(res, result.items, result.pagination, 'Items fetched successfully');
    } catch (error) {
      logger.error('GetItemsBySubcategory controller error', { error: error.message });
      next(error);
    }
  }
}

export default new ItemController();
