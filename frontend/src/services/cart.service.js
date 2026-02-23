import { api } from './api';
import { auth } from '../config/firebase';

const getAuthHeader = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const token = await currentUser.getIdToken();
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const cartService = {
    /**
     * Get customer's cart
     * @param {string} shopId - Optional shop ID to filter by
     */
    getCart: async (shopId = null) => {
        const authHeader = await getAuthHeader();
        const options = shopId ? { ...authHeader, params: { shop_id: shopId } } : authHeader;
        return api.get('/cart', options);
    },

    /**
     * Add item to cart
     * @param {string} shopId 
     * @param {string} itemId 
     * @param {number} quantity 
     */
    addToCart: async (shopId, itemId, quantity = 1) => {
        const authHeader = await getAuthHeader();
        return api.post('/cart/items', { shop_id: shopId, item_id: itemId, quantity }, authHeader);
    },

    /**
     * Update cart item quantity
     * @param {string} cartItemId 
     * @param {number} quantity 
     */
    updateCartItem: async (cartItemId, quantity) => {
        const authHeader = await getAuthHeader();
        return api.put(`/cart/items/${cartItemId}`, { quantity }, authHeader);
    },

    /**
     * Remove item from cart
     * @param {string} cartItemId 
     */
    removeFromCart: async (cartItemId) => {
        const authHeader = await getAuthHeader();
        return api.delete(`/cart/items/${cartItemId}`, authHeader);
    },

    /**
     * Clear entire cart
     * @param {string} shopId 
     */
    clearCart: async (shopId) => {
        const authHeader = await getAuthHeader();
        return api.delete('/cart', { ...authHeader, body: { shop_id: shopId } });
    }
};

export default cartService;
