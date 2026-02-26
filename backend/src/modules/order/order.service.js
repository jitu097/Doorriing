import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { ORDER_STATUS, PAYMENT_STATUS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, NOTIFICATION_TYPE } from '../../utils/constants.js';
import cartService from '../cart/cart.service.js';

class OrderService {
  /**
   * Generate unique order number
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create order from cart
   */
  async createOrder(customerId, orderData) {
    try {
      const { shop_id, delivery_address, payment_method, customer_name, customer_phone } = orderData;

      // Get customer's cart
      const cart = await cartService.getCustomerCart(customerId, shop_id);

      if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Validate all items are still available
      const isRestaurant = cart.business_type === 'restaurant';
      
      for (const cartItem of cart.cart_items) {
        if (!cartItem.items.is_available) {
          throw new Error(`Item "${cartItem.items.name}" is no longer available`);
        }

        // Check stock ONLY for grocery items (restaurants don't use stock management)
        if (!isRestaurant && cartItem.items.stock_quantity !== null && cartItem.items.stock_quantity < cartItem.quantity) {
          throw new Error(`Insufficient stock for "${cartItem.items.name}"`);
        }
      }

      // Calculate totals
      const itemsTotal = cart.cart_items.reduce((sum, item) => {
        return sum + (item.items.price * item.quantity);
      }, 0);

      const deliveryCharge = orderData.delivery_charge || 0;
      const totalAmount = itemsTotal + deliveryCharge;

      // Create order
      const orderNumber = this.generateOrderNumber();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          shop_id,
          customer_id: customerId,
          order_number: orderNumber,
          customer_name,
          customer_phone,
          delivery_address,
          items_total: itemsTotal,
          delivery_charge: deliveryCharge,
          total_amount: totalAmount,
          status: ORDER_STATUS.PENDING,
          payment_method,
          payment_status: PAYMENT_STATUS.PENDING,
        })
        .select()
        .single();

      if (orderError) {
        logger.error('Failed to create order', { error: orderError });
        throw new Error('Failed to create order');
      }

      // Create order items
      const orderItems = cart.cart_items.map(cartItem => ({
        order_id: order.id,
        item_id: cartItem.item_id,
        name: cartItem.items.name,
        quantity: cartItem.quantity,
        price: cartItem.items.price,
        portion: orderData.portion || 'full',
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        logger.error('Failed to create order items', { error: itemsError });
        // Rollback order
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error('Failed to create order items');
      }

      // Clear cart
      await cartService.clearCart(customerId, shop_id);

      // Create notification for customer
      await this.createOrderNotification(customerId, order.id, 'Order placed successfully', 'Your order has been placed and is being processed');

      logger.info('Order created successfully', { orderId: order.id, orderNumber });

      return order;
    } catch (error) {
      logger.error('Error in createOrder', { error: error.message });
      throw error;
    }
  }

  /**
   * Get customer's orders
   */
  async getCustomerOrders(customerId, filters = {}, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    try {
      const limit = Math.min(pageSize, MAX_PAGE_SIZE);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('orders')
        .select('id, shop_id, order_number, customer_name, customer_phone, delivery_address, items_total, delivery_charge, total_amount, status, payment_method, payment_status, created_at, updated_at', { count: 'exact' })
        .eq('customer_id', customerId);

      // Filter by status
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Filter by shop
      if (filters.shop_id) {
        query = query.eq('shop_id', filters.shop_id);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch orders', { error, customerId });
        throw new Error('Failed to fetch orders');
      }

      return {
        orders: data,
        pagination: {
          page,
          pageSize: limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getCustomerOrders', { error: error.message });
      throw error;
    }
  }

  /**
   * Get order details by ID
   */
  async getOrderById(orderId, customerId) {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          shop_id,
          order_number,
          customer_name,
          customer_phone,
          delivery_address,
          items_total,
          delivery_charge,
          total_amount,
          status,
          payment_method,
          payment_status,
          created_at,
          updated_at,
          order_items (
            id,
            item_id,
            name,
            quantity,
            price,
            portion
          )
        `)
        .eq('id', orderId)
        .eq('customer_id', customerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Order not found');
        }
        logger.error('Failed to fetch order', { error, orderId });
        throw new Error('Failed to fetch order');
      }

      return order;
    } catch (error) {
      logger.error('Error in getOrderById', { error: error.message });
      throw error;
    }
  }

  /**
   * Cancel order (if allowed)
   */
  async cancelOrder(orderId, customerId) {
    try {
      // Get order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, customer_id')
        .eq('id', orderId)
        .eq('customer_id', customerId)
        .single();

      if (fetchError || !order) {
        throw new Error('Order not found');
      }

      // Check if order can be cancelled
      const nonCancellableStatuses = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];
      if (nonCancellableStatuses.includes(order.status)) {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: ORDER_STATUS.CANCELLED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        logger.error('Failed to cancel order', { error: updateError });
        throw new Error('Failed to cancel order');
      }

      // Create notification
      await this.createOrderNotification(customerId, orderId, 'Order cancelled', 'Your order has been cancelled');

      logger.info('Order cancelled', { orderId });

      return { success: true };
    } catch (error) {
      logger.error('Error in cancelOrder', { error: error.message });
      throw error;
    }
  }

  /**
   * Create order notification
   */
  async createOrderNotification(customerId, orderId, title, message) {
    try {
      await supabase
        .from('notifications')
        .insert({
          customer_id: customerId,
          title,
          message,
          type: NOTIFICATION_TYPE.ORDER,
          is_read: false,
        });
    } catch (error) {
      logger.error('Failed to create notification', { error: error.message });
      // Don't throw, notification failure shouldn't break the flow
    }
  }
}

export default new OrderService();
