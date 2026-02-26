import { api } from './api';
import { auth } from '../config/firebase';

export const cartService = {

    /**
     * Get customer's cart
     * @param {string} shopId - Optional shop ID to filter by
     */
    getCart: async (shopId = null) => {
        const options = shopId ? { params: { shop_id: shopId } } : {};
        return api.get('/cart', options);
    },

    /**
     * Add item to cart
     * @param {string} shopId 
     * @param {string} itemId 
     * @param {number} quantity 
     */
    addToCart: async (shopId, itemId, quantity = 1) => {
        return api.post('/cart/items', { shop_id: shopId, item_id: itemId, quantity });
    },

    /**
     * Update cart item quantity
     * @param {string} cartItemId 
     * @param {number} quantity 
     */
    updateCartItem: async (cartItemId, quantity) => {
        return api.put(`/cart/items/${cartItemId}`, { quantity });
    },

    /**
     * Remove item from cart
     * @param {string} cartItemId 
     */
    removeFromCart: async (cartItemId) => {
        return api.delete(`/cart/items/${cartItemId}`);
    },

    /**
     * Clear entire cart
     * @param {string} shopId 
     */
    clearCart: async (shopId) => {
        return api.delete('/cart', { body: { shop_id: shopId } });
    }
};

export default cartService;
