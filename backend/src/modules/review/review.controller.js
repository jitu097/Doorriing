import reviewService from '../../services/review.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class ReviewController {
  /**
   * Submit a review for an order
   * POST /api/user/orders/:orderId/review
   */
  async submitReview(req, res, next) {
    try {
      const { customerId } = req.user;
      const { orderId } = req.params;
      const { rating, comment } = req.body;

      if (!rating) {
        return sendError(res, 'Rating is required', 400);
      }

      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return sendError(res, 'Rating must be between 1 and 5', 400);
      }

      const review = await reviewService.createReview(
        customerId,
        orderId,
        rating,
        comment || ''
      );

      return sendSuccess(res, review, 'Review submitted successfully', 201);
    } catch (error) {
      if (error.message.includes('Order not found')) {
        return sendError(res, 'Order not found', 404);
      }
      if (error.message.includes('Unauthorized')) {
        return sendError(res, error.message, 403);
      }
      if (error.message.includes('must be delivered')) {
        return sendError(res, error.message, 400);
      }
      if (error.message.includes('already submitted')) {
        return sendError(res, error.message, 409);
      }
      if (error.message.includes('Invalid rating')) {
        return sendError(res, error.message, 400);
      }
      logger.error('SubmitReview controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get review for an order
   * GET /api/user/orders/:orderId/review
   */
  async getReview(req, res, next) {
    try {
      const { customerId } = req.user;
      const { orderId } = req.params;

      const review = await reviewService.getOrderReview(customerId, orderId);

      if (!review) {
        return sendError(res, 'Review not found', 404);
      }

      return sendSuccess(res, review, 'Review fetched successfully');
    } catch (error) {
      logger.error('GetReview controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Submit review for one item in an order
   * POST /api/user/orders/:orderId/items/:itemId/review
   */
  async submitItemReview(req, res, next) {
    try {
      const { customerId } = req.user;
      const { orderId, itemId } = req.params;
      const { rating, comment } = req.body;

      if (!rating) {
        return sendError(res, 'Rating is required', 400);
      }

      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return sendError(res, 'Rating must be between 1 and 5', 400);
      }

      const review = await reviewService.createItemReview(
        customerId,
        orderId,
        itemId,
        rating,
        comment || ''
      );

      return sendSuccess(res, review, 'Item review submitted successfully', 201);
    } catch (error) {
      if (error.message.includes('Order not found')) {
        return sendError(res, 'Order not found', 404);
      }
      if (error.message.includes('Item not found')) {
        return sendError(res, 'Item not found in this order', 404);
      }
      if (error.message.includes('Unauthorized')) {
        return sendError(res, error.message, 403);
      }
      if (error.message.includes('must be delivered')) {
        return sendError(res, error.message, 400);
      }
      if (error.message.includes('already submitted')) {
        return sendError(res, error.message, 409);
      }
      if (error.message.includes('Invalid rating')) {
        return sendError(res, error.message, 400);
      }
      logger.error('SubmitItemReview controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get review for one item in an order
   * GET /api/user/orders/:orderId/items/:itemId/review
   */
  async getItemReview(req, res, next) {
    try {
      const { customerId } = req.user;
      const { orderId, itemId } = req.params;

      const review = await reviewService.getOrderItemReview(customerId, orderId, itemId);

      if (!review) {
        return sendError(res, 'Item review not found', 404);
      }

      return sendSuccess(res, review, 'Item review fetched successfully');
    } catch (error) {
      logger.error('GetItemReview controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get all item reviews for an order
   * GET /api/user/orders/:orderId/item-reviews
   */
  async getOrderItemReviews(req, res, next) {
    try {
      const { customerId } = req.user;
      const { orderId } = req.params;

      const reviews = await reviewService.getOrderItemReviews(customerId, orderId);

      return sendSuccess(res, reviews, 'Order item reviews fetched successfully');
    } catch (error) {
      if (error.message.includes('Order not found')) {
        return sendError(res, 'Order not found', 404);
      }
      if (error.message.includes('Unauthorized')) {
        return sendError(res, error.message, 403);
      }
      logger.error('GetOrderItemReviews controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get all reviews for a shop
   * GET /api/shops/:shopId/reviews
   */
  async getShopReviews(req, res, next) {
    try {
      const { shopId } = req.params;
      const { page = 1, page_size = 10 } = req.query;

      const result = await reviewService.getShopReviews(
        shopId,
        parseInt(page),
        parseInt(page_size)
      );

      return sendSuccess(res, result.reviews, 'Shop reviews fetched successfully', 200, result.pagination);
    } catch (error) {
      logger.error('GetShopReviews controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get shop rating statistics
   * GET /api/shops/:shopId/rating-stats
   */
  async getShopRatingStats(req, res, next) {
    try {
      const { shopId } = req.params;

      const stats = await reviewService.getShopRatingStats(shopId);

      return sendSuccess(res, stats, 'Shop rating stats fetched successfully');
    } catch (error) {
      logger.error('GetShopRatingStats controller error', { error: error.message });
      next(error);
    }
  }
}

export default new ReviewController();
