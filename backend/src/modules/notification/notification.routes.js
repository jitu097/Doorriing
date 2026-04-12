import { Router } from 'express';
import notificationController from './notification.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireCustomer } from '../../middlewares/role.middleware.js';

const router = Router();

// Token sync route requires authentication only.
// It supports both customer/shop identities and must remain outside requireCustomer.
router.post('/save-token', authenticate, notificationController.saveToken);
router.post('/save-fcm-token', authenticate, notificationController.saveToken);

// All remaining notification routes require authentication and customer account
router.use(authenticate, requireCustomer);

// Get unread count (must be before /:id to avoid route conflict)
router.get('/unread/count', notificationController.getUnreadCount);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Get notifications
router.get('/', notificationController.getNotifications);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

export default router;
