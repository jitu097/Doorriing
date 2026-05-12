import API from './api';

/**
 * Submit a review for an order
 * @param {string} orderId - Order ID
 * @param {number} rating - Rating from 1 to 5
 * @param {string} comment - Optional review comment
 * @returns {Promise<{success: boolean, reviewId: string}>}
 */
export const submitOrderReview = async (orderId, rating, comment = '') => {
  try {
    const response = await API.post(`/user/orders/${orderId}/review`, {
      rating,
      comment,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting review:', error);
    const message = error?.payload?.message || error?.message || 'Failed to submit review';
    const wrappedError = new Error(message);
    wrappedError.status = error?.status;
    wrappedError.payload = error?.payload;
    throw wrappedError;
  }
};

/**
 * Get review for an order (if exists)
 * @param {string} orderId - Order ID
 * @returns {Promise<{rating: number, comment: string, createdAt: string}>}
 */
export const getOrderReview = async (orderId) => {
  try {
    const response = await API.get(`/user/orders/${orderId}/review`);
    return response.data;
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    console.error('Error fetching review:', error);
    const message = error?.payload?.message || error?.message || 'Failed to fetch review';
    const wrappedError = new Error(message);
    wrappedError.status = error?.status;
    wrappedError.payload = error?.payload;
    throw wrappedError;
  }
};

export const submitOrderItemReview = async (orderId, itemId, rating, comment = '') => {
  try {
    const response = await API.post(`/user/orders/${orderId}/items/${itemId}/review`, {
      rating,
      comment,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting item review:', error);
    const message = error?.payload?.message || error?.message || 'Failed to submit item review';
    const wrappedError = new Error(message);
    wrappedError.status = error?.status;
    wrappedError.payload = error?.payload;
    throw wrappedError;
  }
};

export const getOrderItemReviews = async (orderId) => {
  try {
    const response = await API.get(`/user/orders/${orderId}/item-reviews`);
    return Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    if (error?.status === 404) {
      return [];
    }
    console.error('Error fetching order item reviews:', error);
    const message = error?.payload?.message || error?.message || 'Failed to fetch item reviews';
    const wrappedError = new Error(message);
    wrappedError.status = error?.status;
    wrappedError.payload = error?.payload;
    throw wrappedError;
  }
};
