import { cartService } from '../services/cart.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const cartController = {
    /**
     * Get customer's cart
     */
    async getCart(req, res) {
        try {
            const { customerId } = req.user;

            if (!customerId) {
                return sendError(res, 'Customer not found. Please log in.', 401);
            }

            const cart = await cartService.getCart(customerId);
            return sendSuccess(res, cart, 'Cart fetched successfully');
        } catch (error) {
            logger.error('Error fetching cart:', { error: error.message });
            return sendError(res, error.message || 'Failed to fetch cart', 500);
        }
    },

    /**
     * Add item to cart
     */
    async addToCart(req, res) {
        try {
            const { customerId } = req.user;
            const { itemId, quantity = 1 } = req.body;

            if (!customerId) {
                return sendError(res, 'Customer not found. Please log in.', 401);
            }

            if (!itemId) {
                return sendError(res, 'Item ID is required', 400);
            }

            const result = await cartService.addToCart(customerId, itemId, quantity);
            return sendSuccess(res, result, 'Item added to cart');
        } catch (error) {
            logger.error('Error adding to cart:', { error: error.message });
            // If error is related to shop mixing, send specific status 400
            if (error.message.includes('from different shops')) {
                return sendError(res, error.message, 400);
            }
            return sendError(res, error.message || 'Failed to add item to cart', 500);
        }
    },

    /**
     * Update cart item quantity
     */
    async updateCartItem(req, res) {
        try {
            const { customerId } = req.user;
            const { itemId, quantity } = req.body;

            if (!customerId) {
                return sendError(res, 'Customer not found. Please log in.', 401);
            }

            if (!itemId || quantity === undefined) {
                return sendError(res, 'Item ID and quantity are required', 400);
            }

            const result = await cartService.updateCartItem(customerId, itemId, quantity);
            return sendSuccess(res, result, 'Cart item updated');
        } catch (error) {
            logger.error('Error updating cart item:', { error: error.message });
            return sendError(res, error.message || 'Failed to update cart item', 500);
        }
    },

    /**
     * Remove item from cart
     */
    async removeFromCart(req, res) {
        try {
            const { customerId } = req.user;
            const { itemId } = req.params;

            if (!customerId) {
                return sendError(res, 'Customer not found. Please log in.', 401);
            }

            if (!itemId) {
                return sendError(res, 'Item ID is required', 400);
            }

            const result = await cartService.removeFromCart(customerId, itemId);
            return sendSuccess(res, result, 'Item removed from cart');
        } catch (error) {
            logger.error('Error removing cart item:', { error: error.message });
            return sendError(res, error.message || 'Failed to remove from cart', 500);
        }
    },

    /**
     * Clear entire cart
     */
    async clearCart(req, res) {
        try {
            const { customerId } = req.user;

            if (!customerId) {
                return sendError(res, 'Customer not found. Please log in.', 401);
            }

            const result = await cartService.clearCart(customerId);
            return sendSuccess(res, result, 'Cart cleared');
        } catch (error) {
            logger.error('Error clearing cart:', { error: error.message });
            return sendError(res, error.message || 'Failed to clear cart', 500);
        }
    }
};
