import notificationService from './notification.service.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants.js';

class NotificationController {
  /**
   * Save or update FCM token
   * POST /api/notification/save-token
   */
  async saveToken(req, res, next) {
    try {
      const customerId = req.user?.customerId || null;
      const shopId = req.user?.shopId || null;
      const { fcm_token, token, device_type } = req.body;
      const resolvedToken = fcm_token || token;

      if (!resolvedToken) {
        return sendError(res, 'fcm_token (or token) is required', 400);
      }

      if (!customerId && !shopId) {
        return sendError(res, 'Authenticated customer or shop account required', 403);
      }

      await notificationService.saveToken({
        customerId,
        shopId,
        fcmToken: resolvedToken,
        deviceType: device_type || 'android',
      });

      return sendSuccess(res, null, 'FCM token saved successfully');
    } catch (error) {
      logger.error('SaveToken controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get notifications
   * GET /api/notifications
   */
  async getNotifications(req, res, next) {
    try {
      const { customerId } = req.user;
      const { is_read, type, page = 1, page_size = DEFAULT_PAGE_SIZE } = req.query;

      const filters = { is_read, type };

      const result = await notificationService.getNotifications(
        customerId,
        filters,
        parseInt(page),
        parseInt(page_size)
      );

      return sendPaginated(res, result.notifications, result.pagination, 'Notifications fetched successfully');
    } catch (error) {
      logger.error('GetNotifications controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get unread count
   * GET /api/notifications/unread/count
   */
  async getUnreadCount(req, res, next) {
    try {
      const { customerId } = req.user;

      const count = await notificationService.getUnreadCount(customerId);
      return sendSuccess(res, { count }, 'Unread count fetched successfully');
    } catch (error) {
      logger.error('GetUnreadCount controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const { customerId } = req.user;
      const { id } = req.params;

      await notificationService.markAsRead(id, customerId);
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      if (error.message === 'Notification not found') {
        return sendError(res, 'Notification not found', 404);
      }
      if (error.message === 'Unauthorized') {
        return sendError(res, 'Unauthorized', 403);
      }
      logger.error('MarkAsRead controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const { customerId } = req.user;

      await notificationService.markAllAsRead(customerId);
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      logger.error('MarkAllAsRead controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req, res, next) {
    try {
      const { customerId } = req.user;
      const { id } = req.params;

      await notificationService.deleteNotification(id, customerId);
      return sendSuccess(res, null, 'Notification deleted successfully');
    } catch (error) {
      if (error.message === 'Notification not found') {
        return sendError(res, 'Notification not found', 404);
      }
      if (error.message === 'Unauthorized') {
        return sendError(res, 'Unauthorized', 403);
      }
      logger.error('DeleteNotification controller error', { error: error.message });
      next(error);
    }
  }
}

export default new NotificationController();
