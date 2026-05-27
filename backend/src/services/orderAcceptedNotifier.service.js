import admin from '../config/firebaseAdmin.js';
import { isFirebaseAdminConfigured } from '../config/firebaseAdmin.js';
import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';
import pushNotificationService from './pushNotification.service.js';

const SCAN_WINDOW_HOURS = 48; // conservative window to find recent accepted orders
const POLL_INTERVAL_MS = 30 * 1000; // 30s

class OrderAcceptedNotifier {
  async processOnce() {
    try {
      const since = new Date(Date.now() - SCAN_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

      // 1) Find orders that are currently accepted (within recent window)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, customer_id, shop_id, order_number, updated_at')
        .gte('updated_at', since)
        .eq('status', 'accepted')
        .limit(100);

      if (ordersError) {
        logger.error('[OrderAcceptedNotifier] Failed to query orders', { error: ordersError });
        return;
      }

      if (!orders || orders.length === 0) return;

      for (const order of orders) {
        try {
          // 2) Idempotency check: ensure we haven't already created an "order_accepted" notification
          const { data: existing, error: existErr } = await supabase
            .from('notifications')
            .select('id')
            .eq('type', 'order_accepted')
            .eq('reference_id', order.id)
            .eq('customer_id', order.customer_id)
            .limit(1)
            .maybeSingle();

          if (existErr) {
            logger.error('[OrderAcceptedNotifier] Failed to check existing notification', { error: existErr, orderId: order.id });
            continue;
          }

          if (existing) {
            // already created — skip
            continue;
          }

          // 3) Create durable notification row (additive only)
          const title = 'Order Accepted';
          const message = 'Your order has been accepted and is being prepared.';

          const { data: inserted, error: insertErr } = await supabase
            .from('notifications')
            .insert({
              customer_id: order.customer_id,
              shop_id: order.shop_id,
              title,
              message,
              type: 'order_accepted',
              reference_id: order.id,
              is_read: false,
              is_sent: false,
            })
            .select('id')
            .maybeSingle();

          if (insertErr) {
            logger.error('[OrderAcceptedNotifier] Failed to insert notification row', { error: insertErr, orderId: order.id });
            continue;
          }

          // 4) Async delivery: fetch tokens and send FCM without blocking any upstream API
          const tokenRows = await pushNotificationService.getTokens({ customer_id: order.customer_id, target: 'customer' });
          const fcmTokens = (tokenRows || []).map(r => r.fcm_token).filter(Boolean);

          if (fcmTokens.length === 0) {
            logger.info('[OrderAcceptedNotifier] No tokens for customer — left as inbox notification', { orderId: order.id, customerId: order.customer_id });
            continue;
          }

          if (!isFirebaseAdminConfigured) {
            logger.warn('[OrderAcceptedNotifier] Firebase Admin not configured - skipping push send', { orderId: order.id });
            continue;
          }

          const payload = {
            tokens: fcmTokens,
            notification: {
              title: String(title),
              body: String(message),
            },
            data: {
              title: String(title),
              body: String(message),
              target_url: String(`/orders/${order.id}`),
              type: 'order_accepted',
              order_id: String(order.id),
              reference_id: String(order.id),
              click_action: '',
            },
            android: {
              priority: 'high',
              notification: { channelId: 'default_channel' },
            },
          };

          const response = await admin.messaging().sendEachForMulticast(payload);

          const invalidTokens = [];
          response.responses.forEach((res, idx) => {
            const token = fcmTokens[idx];
            if (res.success) {
              // nothing
            } else {
              const code = res.error?.code;
              if (code && ['messaging/registration-token-not-registered','messaging/invalid-registration-token','messaging/invalid-argument'].includes(code)) {
                invalidTokens.push(token);
              }
            }
          });

          if (invalidTokens.length > 0) {
            await pushNotificationService.removeTokens(invalidTokens).catch(err => logger.error('[OrderAcceptedNotifier] Failed to remove invalid tokens', { error: err.message }));
          }

          // Mark the notification row as sent (compare-and-set)
          try {
            if (inserted && inserted.id) {
              const nowTs = new Date().toISOString();
              await supabase
                .from('notifications')
                .update({ is_sent: true, sent_at: nowTs })
                .eq('id', inserted.id)
                .eq('is_sent', false);
            }
          } catch (markErr) {
            logger.error('[OrderAcceptedNotifier] Failed to mark notification as sent', { error: markErr.message, orderId: order.id });
          }

          logger.info('[OrderAcceptedNotifier] Dispatched accepted notification', { orderId: order.id, sent: response.successCount, failed: response.failureCount });

        } catch (innerErr) {
          logger.error('[OrderAcceptedNotifier] Error processing order', { error: innerErr.message, orderId: order.id });
        }
      }

    } catch (err) {
      logger.error('[OrderAcceptedNotifier] Unexpected error', { error: err.message });
    }
  }

  start() {
    // Run once immediately and then poll periodically. Designed to be safe if multiple processes run —
    // the idempotency check on notifications prevents duplicate inbox rows; accidental double-sends
    // are unlikely but if they occur they are bounded by the scan window and notification existence check.
    this.processOnce().catch(err => logger.error('[OrderAcceptedNotifier] startup processOnce failed', { error: err.message }));
    this._interval = setInterval(() => this.processOnce().catch(e => logger.error('[OrderAcceptedNotifier] poll failure', { error: e.message })), POLL_INTERVAL_MS);
    logger.info('[OrderAcceptedNotifier] Started background notifier (polling every %dms)', POLL_INTERVAL_MS);
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
  }
}

export default new OrderAcceptedNotifier();
