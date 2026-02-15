import cartService from './cart.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class CartController {
  /**
   * Get customer's cart
   * GET /api/cart
   */
  async getCart(req, res, next) {
    try {
      const { customerId } = req.user;
      const { shop_id } = req.query;

      const cart = await cartService.getCustomerCart(customerId, shop_id);

      if (!cart) {
        return sendSuccess(res, { cart_items: [], items_count: 0, items_total: 0 }, 'Cart is empty');
      }

      return sendSuccess(res, cart, 'Cart fetched successfully');
    } catch (error) {
      logger.error('GetCart controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Add item to cart
   * POST /api/cart/items
   */
  async addItem(req, res, next) {
    try {
      const { customerId } = req.user;
      const { shop_id, item_id, quantity = 1 } = req.body;

      if (!shop_id || !item_id) {
        return sendError(res, 'shop_id and item_id are required', 400);
      }

      if (quantity <= 0) {
        return sendError(res, 'Quantity must be greater than 0', 400);
      }

      const cart = await cartService.addItemToCart(customerId, shop_id, item_id, quantity);
      return sendSuccess(res, cart, 'Item added to cart successfully', 201);
    } catch (error) {
      if (error.message.includes('not available') || error.message.includes('stock')) {
        return sendError(res, error.message, 400);
      }
      logger.error('AddItem controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Update cart item quantity
   * PUT /api/cart/items/:id
   */
  async updateItem(req, res, next) {
    try {
      const { customerId } = req.user;
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        return sendError(res, 'Valid quantity is required', 400);
      }

      await cartService.updateCartItem(customerId, id, quantity);
      return sendSuccess(res, null, 'Cart item updated successfully');
    } catch (error) {
      if (error.message === 'Cart item not found') {
        return sendError(res, 'Cart item not found', 404);
      }
      if (error.message === 'Unauthorized') {
        return sendError(res, 'Unauthorized', 403);
      }
      if (error.message.includes('stock')) {
        return sendError(res, error.message, 400);
      }
      logger.error('UpdateItem controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:id
   */
  async removeItem(req, res, next) {
    try {
      const { customerId } = req.user;
      const { id } = req.params;

      await cartService.removeCartItem(customerId, id);
      return sendSuccess(res, null, 'Item removed from cart successfully');
    } catch (error) {
      if (error.message === 'Cart item not found') {
        return sendError(res, 'Cart item not found', 404);
      }
      if (error.message === 'Unauthorized') {
        return sendError(res, 'Unauthorized', 403);
      }
      logger.error('RemoveItem controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Clear cart
   * DELETE /api/cart
   */
  async clearCart(req, res, next) {
    try {
      const { customerId } = req.user;
      const { shop_id } = req.body;

      if (!shop_id) {
        return sendError(res, 'shop_id is required', 400);
      }

      await cartService.clearCart(customerId, shop_id);
      return sendSuccess(res, null, 'Cart cleared successfully');
    } catch (error) {
      logger.error('ClearCart controller error', { error: error.message });
      next(error);
    }
  }
}

export default new CartController();
