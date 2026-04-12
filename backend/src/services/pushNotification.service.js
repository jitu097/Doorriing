import admin from '../config/firebaseAdmin.js';
import { isFirebaseAdminConfigured } from '../config/firebaseAdmin.js';
import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

const INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

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

    const tokenRows = await this.getTokens({ customer_id, shop_id });
    
    // 1. Clean and validate tokens
    const fcmTokens = (tokenRows || [])
      .map(row => row.fcm_token)
      .filter(token => token && typeof token === 'string' && token.trim() !== '');

    console.log("Tokens fetched from DB:", fcmTokens);

    if (!isFirebaseAdminConfigured) {
      logger.warn('Skipping FCM send because Firebase Admin is not configured', {
        customer_id,
        shop_id,
      });
      return { sent: 0, failed: 0, stored: true };
    }

    // 2. Ensure tokens array is NOT empty
    if (fcmTokens.length === 0) {
      console.log("No valid FCM tokens found for user/shop, skipping send.");
      return { sent: 0, failed: 0, stored: true };
    }

    const payload = {
      tokens: fcmTokens,
      notification: {
        title: title,
        body: message,
      },
      data: {
        target_url: String(reference_id ? `/orders/${reference_id}` : ''),
        type: String(type || ''),
      },
    };

    console.log("Sending FCM payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await admin.messaging().sendEachForMulticast(payload);
      
      let sent = 0;
      let failed = 0;

      // 3. Handle PARTIAL SUCCESS
      response.responses.forEach(async (res, index) => {
        const token = fcmTokens[index];
        if (res.success) {
          sent++;
          console.log(`✅ FCM Sent successfully to token: ${token}`);
          console.log("Firebase response:", res.messageId);
        } else {
          failed++;
          console.error(`❌ FCM Failed for token: ${token}`);
          console.error("Full error object:", JSON.stringify(res.error, null, 2));

          // 4. UPSERT/Clean Token in DB
          if (res.error.code === 'messaging/registration-token-not-registered') {
            console.log(`Removing unregistered token from DB: ${token}`);
            await this.removeToken(token);
          }
        }
      });

      return { sent, failed, stored: true };
    } catch (error) {
      logger.error('Multicast FCM send failed entirely', {
        error: error.message,
        customer_id,
        shop_id,
      });
      console.error("Critical FCM error:", error);
      return { sent: 0, failed: 0, error: error.message };
    }
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
