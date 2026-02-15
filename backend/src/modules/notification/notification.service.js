import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants.js';

class NotificationService {
  /**
   * Get customer notifications
   */
  async getNotifications(customerId, filters = {}, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    try {
      const limit = Math.min(pageSize, MAX_PAGE_SIZE);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at', { count: 'exact' })
        .eq('customer_id', customerId);

      // Filter by read status
      if (filters.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read === 'true');
      }

      // Filter by type
      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch notifications', { error, customerId });
        throw new Error('Failed to fetch notifications');
      }

      return {
        notifications: data,
        pagination: {
          page,
          pageSize: limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getNotifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(customerId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('is_read', false);

      if (error) {
        logger.error('Failed to fetch unread count', { error, customerId });
        throw new Error('Failed to fetch unread count');
      }

      return count || 0;
    } catch (error) {
      logger.error('Error in getUnreadCount', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, customerId) {
    try {
      // Verify notification belongs to customer
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('id, customer_id')
        .eq('id', notificationId)
        .single();

      if (fetchError || !notification) {
        throw new Error('Notification not found');
      }

      if (notification.customer_id !== customerId) {
        throw new Error('Unauthorized');
      }

      // Mark as read
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (updateError) {
        logger.error('Failed to mark notification as read', { error: updateError });
        throw new Error('Failed to update notification');
      }

      logger.info('Notification marked as read', { notificationId });

      return { success: true };
    } catch (error) {
      logger.error('Error in markAsRead', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(customerId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('customer_id', customerId)
        .eq('is_read', false);

      if (error) {
        logger.error('Failed to mark all notifications as read', { error });
        throw new Error('Failed to update notifications');
      }

      logger.info('All notifications marked as read', { customerId });

      return { success: true };
    } catch (error) {
      logger.error('Error in markAllAsRead', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, customerId) {
    try {
      // Verify notification belongs to customer
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('id, customer_id')
        .eq('id', notificationId)
        .single();

      if (fetchError || !notification) {
        throw new Error('Notification not found');
      }

      if (notification.customer_id !== customerId) {
        throw new Error('Unauthorized');
      }

      // Delete notification
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) {
        logger.error('Failed to delete notification', { error: deleteError });
        throw new Error('Failed to delete notification');
      }

      logger.info('Notification deleted', { notificationId });

      return { success: true };
    } catch (error) {
      logger.error('Error in deleteNotification', { error: error.message });
      throw error;
    }
  }
}

export default new NotificationService();
