import admin from '../config/firebaseAdmin.js';
import { isFirebaseAdminConfigured } from '../config/firebaseAdmin.js';
import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

const INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export const sendPushNotification = async (token, title, body, data = {}) => {
  if (!token || !String(token).trim()) {
    throw new Error('FCM token is required');
  }

  console.log('🔔 Preparing to send notification...');
  console.log('📱 Token:', token);

  const payload = {
    token,
    notification: {
      title,
      body,
    },
    data: Object.fromEntries(
      Object.entries(data || {}).map(([key, value]) => [key, String(value ?? '')])
    ),
    android: {
      priority: 'high',
      notification: {
        channelId: 'default_channel',
      },
    },
  };

  console.log('📦 Payload:', payload);

  try {
    const response = await admin.messaging().send(payload);
    console.log('✅ FCM SUCCESS:', response);
    return response;
  } catch (error) {
    console.error('❌ FCM ERROR:', error);
    throw error;
  }
};

class PushNotificationService {
  async sendPushNotification({
    customer_id = null,
    shop_id = null,
    title,
    message,
    type = '',
    reference_id = '',
  }) {
    if (!customer_id && !shop_id) {
      throw new Error('Either customer_id or shop_id is required');
    }

    if (!title || !message) {
      throw new Error('Both title and message are required');
    }

    await this.storeNotification({
      customer_id,
      shop_id,
      title,
      message,
      type,
      reference_id,
    });

    const tokens = await this.getTokens({ customer_id, shop_id });

    if (!isFirebaseAdminConfigured) {
      logger.warn('Skipping FCM send because Firebase Admin is not configured', {
        customer_id,
        shop_id,
      });
      return { sent: 0, failed: 0, stored: true };
    }

    if (!tokens.length) {
      logger.info('No notification tokens found for push dispatch', {
        customer_id,
        shop_id,
      });
      return { sent: 0, failed: 0, stored: true };
    }

    let sent = 0;
    let failed = 0;

    for (const tokenRow of tokens) {
      const fcmToken = tokenRow.fcm_token;

      try {
        console.log('User FCM Token from DB:', fcmToken);
        await sendPushNotification(fcmToken, title, message, {
          title: String(title || ''),
          body: String(message || ''),
          type: String(type || ''),
          orderId: String(reference_id || ''),
          reference_id: String(reference_id || ''),
        });

        sent += 1;
      } catch (error) {
        failed += 1;

        logger.error('FCM send failed', {
          error: error.message,
          code: error.code,
          customer_id,
          shop_id,
        });

        if (INVALID_TOKEN_ERRORS.has(error.code)) {
          await this.removeToken(fcmToken);
        }
      }
    }

    return { sent, failed, stored: true };
  }

  async getTokens({ customer_id = null, shop_id = null }) {
    let query = supabase.from('notification_tokens').select('fcm_token');

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (shop_id) {
      query = query.eq('shop_id', shop_id);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch notification tokens', {
        error,
        customer_id,
        shop_id,
      });
      throw new Error('Failed to fetch notification tokens');
    }

    logger.info('Fetched notification tokens from DB', {
      customer_id,
      shop_id,
      tokenCount: (data || []).length,
    });

    return data || [];
  }

  async storeNotification({ customer_id = null, shop_id = null, title, message, type = '', reference_id = '' }) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        customer_id,
        shop_id,
        title,
        message,
        type,
        reference_id: reference_id || null,
        is_read: false,
      });

    if (error) {
      logger.error('Failed to store notification', {
        error,
        customer_id,
        shop_id,
        type,
      });
      throw new Error('Failed to store notification');
    }
  }

  async removeToken(fcmToken) {
    const { error } = await supabase
      .from('notification_tokens')
      .delete()
      .eq('fcm_token', fcmToken);

    if (error) {
      logger.error('Failed to delete invalid FCM token', { error, fcmToken });
      return;
    }

    logger.info('Deleted invalid FCM token', { fcmToken });
  }

  async sendOrderStatusNotification({ customer_id, shop_id = null, status, reference_id }) {
    const normalized = String(status || '').toLowerCase();

    const templates = {
      placed: {
        title: 'Order placed',
        message: 'Your order has been placed successfully.',
      },
      accepted: {
        title: 'Order accepted',
        message: 'Your order has been accepted by the shop.',
      },
      confirmed: {
        title: 'Order accepted',
        message: 'Your order has been accepted by the shop.',
      },
      shipped: {
        title: 'Order shipped',
        message: 'Your order is on the way.',
      },
      delivered: {
        title: 'Order delivered',
        message: 'Your order has been delivered.',
      },
    };

    const template = templates[normalized];
    if (!template) {
      return { sent: 0, failed: 0, stored: false };
    }

    return this.sendPushNotification({
      customer_id,
      shop_id,
      title: template.title,
      message: template.message,
      type: `order_${normalized}`,
      reference_id,
    });
  }
}

export default new PushNotificationService();
