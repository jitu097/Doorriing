import orderService from './order.service.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants.js';

class OrderController {
  /**
   * Create order from cart
   * POST /api/orders
   */
  async createOrder(req, res, next) {
    try {
      const { customerId } = req.user;
      const { shop_id, delivery_address, payment_method, customer_name, customer_phone, delivery_charge } = req.body;

      // Validate required fields
      if (!shop_id || !customer_name || !customer_phone || !payment_method) {
        return sendError(res, 'Missing required fields', 400);
      }

      const orderData = {
        shop_id,
        delivery_address,
        payment_method,
        customer_name,
        customer_phone,
        delivery_charge: delivery_charge || 0,
      };

      const order = await orderService.createOrder(customerId, orderData);
      return sendSuccess(res, order, 'Order placed successfully', 201);
    } catch (error) {
      if (error.message === 'Cart is empty') {
        return sendError(res, 'Cart is empty', 400);
      }
      if (error.message.includes('not available') || error.message.includes('stock')) {
        return sendError(res, error.message, 400);
      }
      logger.error('CreateOrder controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get customer's orders
   * GET /api/orders
   */
  async getOrders(req, res, next) {
    try {
      const { customerId } = req.user;
      const { status, shop_id, page = 1, page_size = DEFAULT_PAGE_SIZE } = req.query;

      const filters = { status, shop_id };

      const result = await orderService.getCustomerOrders(
        customerId,
        filters,
        parseInt(page),
        parseInt(page_size)
      );

      // Add remaining_time for each order
      const now = new Date();
      const ordersWithTime = (result.orders || []).map(order => {
        let remaining_time = 0;
        if (order.acceptance_deadline) {
          const deadline = new Date(order.acceptance_deadline);
          remaining_time = Math.max(0, Math.floor((deadline - now) / 1000));
        }
        return { ...order, remaining_time };
      });

      return sendPaginated(res, ordersWithTime, result.pagination, 'Orders fetched successfully');
    } catch (error) {
      logger.error('GetOrders controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get order details
   * GET /api/orders/:id
   */
  async getOrderById(req, res, next) {
    try {
      const { customerId } = req.user;
      const { id } = req.params;

      const order = await orderService.getOrderById(id, customerId);
      if (!order) {
        return sendError(res, 'Order not found', 404);
      }
      // Calculate remaining_time
      let remaining_time = 0;
      if (order.acceptance_deadline) {
        const now = new Date();
        const deadline = new Date(order.acceptance_deadline);
        remaining_time = Math.max(0, Math.floor((deadline - now) / 1000));
      }
      return sendSuccess(res, { ...order, remaining_time }, 'Order fetched successfully');
    } catch (error) {
      if (error.message === 'Order not found') {
        return sendError(res, 'Order not found', 404);
      }
      logger.error('GetOrderById controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Cancel order
   * POST /api/orders/:id/cancel
   */
  async cancelOrder(req, res, next) {
    try {
      const { customerId } = req.user;
      const { id } = req.params;

      await orderService.cancelOrder(id, customerId);
      return sendSuccess(res, null, 'Order cancelled successfully');
    } catch (error) {
      if (error.message === 'Order not found') {
        return sendError(res, 'Order not found', 404);
      }
      if (error.message.includes('Cannot cancel')) {
        return sendError(res, error.message, 400);
      }
      logger.error('CancelOrder controller error', { error: error.message });
      next(error);
    }
  }
}

export default new OrderController();
