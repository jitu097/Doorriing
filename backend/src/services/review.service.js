import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

class ReviewService {
  /**
   * Create a new review for an order
   * @param {string} customerId - Customer ID
   * @param {string} orderId - Order ID
   * @param {number} rating - Rating (1-5)
   * @param {string} comment - Optional review comment
   * @returns {Promise<{id: string, success: boolean}>}
   */
  async createReview(customerId, orderId, rating, comment = '') {
    try {
      // Validate rating
      if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        throw new Error('Invalid rating. Must be between 1 and 5');
      }

      // Fetch order to verify it belongs to customer and is delivered
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_id, status, shop_id')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      if (order.customer_id !== customerId) {
        throw new Error('Unauthorized: Order does not belong to customer');
      }

      if (order.status !== 'delivered') {
        throw new Error('Order must be delivered before review');
      }

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingReview) {
        throw new Error('Review already submitted for this order');
      }

      // Insert review
      const { data: review, error: insertError } = await supabase
        .from('reviews')
        .insert([
          {
            customer_id: customerId,
            order_id: orderId,
            shop_id: order.shop_id,
            rating,
            comment: comment.trim() || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) {
        logger.error('Error inserting review', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw new Error(insertError.message || 'Failed to save review');
      }

      return {
        id: review.id,
        success: true,
      };
    } catch (error) {
      logger.error('ReviewService.createReview error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a review for a specific item in an order
   * @param {string} customerId - Customer ID
   * @param {string} orderId - Order ID
   * @param {string} itemId - Item ID
   * @param {number} rating - Rating (1-5)
   * @param {string} comment - Optional comment
   */
  async createItemReview(customerId, orderId, itemId, rating, comment = '') {
    try {
      if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        throw new Error('Invalid rating. Must be between 1 and 5');
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_id, status, shop_id')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      if (order.customer_id !== customerId) {
        throw new Error('Unauthorized: Order does not belong to customer');
      }

      if (order.status !== 'delivered') {
        throw new Error('Order must be delivered before review');
      }

      const { data: orderItem, error: orderItemError } = await supabase
        .from('order_items')
        .select('id, item_id')
        .eq('order_id', orderId)
        .eq('item_id', itemId)
        .limit(1)
        .maybeSingle();

      if (orderItemError || !orderItem) {
        throw new Error('Item not found in this order');
      }

      const { data: existingItemReview } = await supabase
        .from('item_reviews')
        .select('id')
        .eq('order_id', orderId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (existingItemReview) {
        throw new Error('Item review already submitted for this order');
      }

      const { data: review, error: insertError } = await supabase
        .from('item_reviews')
        .insert([
          {
            customer_id: customerId,
            order_id: orderId,
            item_id: itemId,
            shop_id: order.shop_id,
            rating,
            comment: comment.trim() || null,
          },
        ])
        .select('id, order_id, item_id, rating, comment, created_at')
        .single();

      if (insertError) {
        logger.error('Error inserting item review', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw new Error(insertError.message || 'Failed to save item review');
      }

      return {
        id: review.id,
        orderId: review.order_id,
        itemId: review.item_id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        success: true,
      };
    } catch (error) {
      logger.error('ReviewService.createItemReview error', { error: error.message });
      throw error;
    }
  }

  async getOrderItemReview(customerId, orderId, itemId) {
    try {
      const { data: review, error } = await supabase
        .from('item_reviews')
        .select('id, order_id, item_id, rating, comment, created_at')
        .eq('customer_id', customerId)
        .eq('order_id', orderId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return review || null;
    } catch (error) {
      logger.error('ReviewService.getOrderItemReview error', { error: error.message });
      throw error;
    }
  }

  async getOrderItemReviews(customerId, orderId) {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_id')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      if (order.customer_id !== customerId) {
        throw new Error('Unauthorized: Order does not belong to customer');
      }

      const { data: reviews, error } = await supabase
        .from('item_reviews')
        .select('id, order_id, item_id, rating, comment, created_at')
        .eq('customer_id', customerId)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return reviews || [];
    } catch (error) {
      logger.error('ReviewService.getOrderItemReviews error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get review for an order
   * @param {string} customerId - Customer ID
   * @param {string} orderId - Order ID
   * @returns {Promise<{rating: number, comment: string, createdAt: string}|null>}
   */
  async getOrderReview(customerId, orderId) {
    try {
      const { data: review, error } = await supabase
        .from('reviews')
        .select('rating, comment, created_at')
        .eq('order_id', orderId)
        .eq('customer_id', customerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return {
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
      };
    } catch (error) {
      logger.error('ReviewService.getOrderReview error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all reviews for a shop
   * @param {string} shopId - Shop ID
   * @param {number} page - Page number (1-indexed)
   * @param {number} pageSize - Page size
   * @returns {Promise<{reviews: array, pagination: object}>}
   */
  async getShopReviews(shopId, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;

      // Get total count
      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId);

      // Get paginated reviews
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, customers(name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw error;
      }

      return {
        reviews: reviews || [],
        pagination: {
          total: count || 0,
          page,
          pageSize,
          pages: Math.ceil((count || 0) / pageSize),
        },
      };
    } catch (error) {
      logger.error('ReviewService.getShopReviews error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get shop rating stats
   * @param {string} shopId - Shop ID
   * @returns {Promise<{averageRating: number, totalReviews: number, ratingBreakdown: object}>}
   */
  async getShopRatingStats(shopId) {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('shop_id', shopId);

      if (error) {
        throw error;
      }

      if (!reviews || reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let totalRating = 0;

      reviews.forEach((review) => {
        breakdown[review.rating]++;
        totalRating += review.rating;
      });

      return {
        averageRating: parseFloat((totalRating / reviews.length).toFixed(2)),
        totalReviews: reviews.length,
        ratingBreakdown: breakdown,
      };
    } catch (error) {
      logger.error('ReviewService.getShopRatingStats error', { error: error.message });
      throw error;
    }
  }
}

export default new ReviewService();
