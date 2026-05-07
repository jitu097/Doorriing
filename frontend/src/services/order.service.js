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
     * @param {Object} checkoutPayload - Address and pricing data
     */
    checkout: async (checkoutPayload) => {
        const authHeader = await getAuthHeader();
        return api.post('/user/orders/checkout', checkoutPayload, authHeader);
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
    },

    /**
     * Verify payment with Razorpay
     * @param {Object} paymentData - { razorpay_order_id, razorpay_payment_id, razorpay_signature }
     */
    verifyPayment: async (paymentData) => {
        const authHeader = await getAuthHeader();
        return api.post('/order/verify-payment', paymentData, authHeader);
    },

    /**
     * Attempt to recover a pending payment that never completed.
     *
     * Called automatically on app reopen if localStorage has a pending payment
     * record. The backend will:
     *  1. Check if the order already exists in DB (most common case)
     *  2. If not, query Razorpay to see if the payment was captured
     *  3. If captured, create the missing order and return it
     *
     * @param {string} razorpayOrderId - From localStorage ('doorriing_pending_razorpay')
     * @param {string} addressId       - From localStorage ('doorriing_pending_razorpay')
     * @returns {Promise<{ status, data?: { orderId, orderNumber }, message }>}
     */
    recoverPayment: async (razorpayOrderId, addressId) => {
        const authHeader = await getAuthHeader();
        const params = new URLSearchParams({ razorpayOrderId, addressId }).toString();
        return api.get(`/user/orders/recover-payment-status?${params}`, authHeader);
    },
};

export default orderService;
