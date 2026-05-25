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
  /**
   * ✅ Core notification dispatcher (Restored & Fixed)
   */
  async sendPushNotification({
    customer_id = null,
    shop_id = null,
    title,
    message,
    type = '',
    reference_id = '',
    target = null,
  }) {
    try {
      if (!customer_id && !shop_id) {
        throw new Error('Either customer_id or shop_id is required');
      }

      if (!title || !message) {
        throw new Error('Both title and message are required');
      }

      // 1. Determine priority and channel
      const isSeller = target === 'shop';
      const channelId = isSeller ? 'doorriing_seller_channel' : 'default_channel';

      if (isSeller) {
        console.log(`[FCM_TRACE] 🚀 Preparing notification for shop: ${shop_id}`);
      }

      // 2. Persistent storage (Ensures history even if push fails)
      await this.storeNotification({
        customer_id,
        shop_id,
        title,
        message,
        type,
        reference_id,
      }).catch(err => console.error("⚠️ Failed to store notification in DB:", err.message));

      if (isSeller) {
        logger.info('history_insert_success', {
          seller_id: shop_id,
          type,
          reference_id,
        });
      }

      // 3. Fetch Tokens
      const tokenRows = await this.getTokens({ customer_id, shop_id, target });
      const fcmTokens = (tokenRows || [])
        .map(row => row.fcm_token)
        .filter(token => token && typeof token === 'string' && token.trim() !== '');

      if (isSeller) {
        logger.info('DIRECT_SELLER_PUSH_START', {
          seller_id: shop_id,
          token_count: fcmTokens.length,
          type,
          reference_id,
        });
      }

      if (fcmTokens.length === 0) {
        console.log(`[FCM_TRACE] No tokens found for ${isSeller ? 'shop' : 'user'}: ${isSeller ? shop_id : customer_id}`);
        return { sent: 0, failed: 0, stored: true };
      }

      if (!isFirebaseAdminConfigured) {
        logger.warn('Skipping FCM send because Firebase Admin is not configured');
        return { sent: 0, failed: 0, stored: true };
      }

      // 4. Construct Payload
      const payload = {
        tokens: fcmTokens,
        notification: {
          title: String(title),
          body: String(message),
        },
        data: {
          title: String(title),
          body: String(message),
          target_url: String(reference_id ? `/orders/${reference_id}` : ''),
          type: String(type || ''),
          order_id: String(reference_id || ''),
          click_action: isSeller ? 'OPEN_ORDER' : ''
        },
        android: {
          priority: 'high',
          notification: {
            channelId: channelId,
          },
        },
      };

      if (isSeller) {
        console.log(`[FCM_TRACE] 📡 Dispatching to ${fcmTokens.length} tokens via channel: ${channelId}`);
      }

      // 5. Atomic Send
      const response = await admin.messaging().sendEachForMulticast(payload);
      
      let sent = 0;
      let failed = 0;
      const invalidTokens = [];

      response.responses.forEach((res, index) => {
        const token = fcmTokens[index];
        if (res.success) {
          sent++;
          if (isSeller) {
            logger.info('FCM_SUCCESS', {
              seller_id: shop_id,
              token: tokenLabel(token),
              reference_id,
            });
          }
        } else {
          failed++;
          if (isSeller) {
            logger.error('FCM_FAILURE', {
              seller_id: shop_id,
              token: tokenLabel(token),
              error: res.error?.code || 'unknown',
              reference_id,
            });
          } else {
            console.error(`❌ [FCM_FAILURE] Error: ${res.error?.code || 'unknown'} for token ...${token.slice(-6)}`);
          }
          if (res.error?.code && INVALID_TOKEN_ERRORS.has(res.error.code)) {
            invalidTokens.push(token);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await this.removeTokens(invalidTokens).catch((err) => {
          logger.error('Failed to clean up invalid FCM tokens', { error: err.message });
        });
        if (isSeller) {
          logger.info('invalid_token_cleanup', {
            seller_id: shop_id,
            token_count: invalidTokens.length,
          });
        }
      }

      return { sent, failed, stored: true };
    } catch (error) {
      logger.error('Critical failure in sendPushNotification', { error: error.message });
      // We don't throw - we want the order creation to succeed even if notifications fail
      return { sent: 0, failed: 0, error: error.message };
    }
  }

  async getTokens({ customer_id = null, shop_id = null, target = null }) {
    try {
      if (target === 'shop' && shop_id) {
        const { data, error } = await supabase
          .from('seller_notification_tokens')
          .select('fcm_token')
          .eq('shop_id', shop_id);
        
        if (error) throw error;
        return data || [];
      }

      let query = supabase.from('notification_tokens').select('fcm_token');
      if (target === 'customer' && customer_id) {
        query = query.eq('customer_id', customer_id);
      } else if (customer_id && shop_id) {
        query = query.or(`customer_id.eq.${customer_id},shop_id.eq.${shop_id}`);
      } else if (customer_id) {
        query = query.eq('customer_id', customer_id);
      } else if (shop_id) {
        query = query.eq('shop_id', shop_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch notification tokens', { error: error.message });
      return [];
    }
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

    if (error) throw error;
  }

  async removeToken(fcmToken) {
    await this.removeTokens([fcmToken]);
  }

  async removeTokens(fcmTokens = []) {
    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) return;
    
    // Perform parallel deletes in both customer and seller token tables
    await Promise.all([
      supabase.from('notification_tokens').delete().in('fcm_token', fcmTokens),
      supabase.from('seller_notification_tokens').delete().in('fcm_token', fcmTokens),
    ]);
    logger.info(`Batch removed ${fcmTokens.length} invalid FCM tokens`);
  }

  async sendOrderStatusNotification({ customer_id, shop_id = null, status, reference_id }) {
    const normalized = String(status || '').toLowerCase();
    const templates = {
      placed: { title: 'Order placed', message: 'Your order has been placed successfully.' },
      accepted: { title: 'Order accepted', message: 'Your order has been accepted by the shop.' },
      confirmed: { title: 'Order accepted', message: 'Your order has been accepted by the shop.' },
      shipped: { title: 'Order shipped', message: 'Your order is on the way.' },
      delivered: { title: 'Order delivered', message: 'Your order has been delivered.' },
    };

    const template = templates[normalized];
    if (!template) return { sent: 0, failed: 0, stored: false };

    return this.sendPushNotification({
      customer_id,
      shop_id,
      title: template.title,
      message: template.message,
      type: `order_${normalized}`,
      reference_id,
      target: 'customer',
    });
  }
}

export default new PushNotificationService();
