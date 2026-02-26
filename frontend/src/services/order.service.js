import { api } from './api';
import { auth } from '../config/firebase';

const getAuthHeader = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const token = await currentUser.getIdToken();
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const orderService = {
    /**
     * Checkout current cart and create an order
     * @param {Object} addressDetails - The delivery address info
     */
    checkout: async (addressDetails) => {
        const authHeader = await getAuthHeader();
        return api.post('/user/orders/checkout', { addressDetails }, authHeader);
    },

    /**
     * Get list of user orders
     */
    getOrders: async () => {
        const authHeader = await getAuthHeader();
        return api.get('/user/orders', authHeader);
    },

    /**
     * Get specific order details
     * @param {string} orderId 
     */
    getOrderById: async (orderId) => {
        const authHeader = await getAuthHeader();
        return api.get(`/user/orders/${orderId}`, authHeader);
    },

    /**
     * Cancel an order
     * @param {string} orderId 
     */
    cancelOrder: async (orderId) => {
        const authHeader = await getAuthHeader();
        return api.patch(`/user/orders/${orderId}/cancel`, {}, authHeader);
    }
};

export default orderService;
