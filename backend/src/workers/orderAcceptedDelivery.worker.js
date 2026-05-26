import os from 'node:os';
import { supabase } from '../../config/supabaseClient.js';
import pushNotificationService from '../../services/pushNotification.service.js';
import { logger } from '../../utils/logger.js';

const WORKER_ID = `${os.hostname()}-${process.pid}`;

async function claimNotification(notificationId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ processing: true, processing_at: new Date().toISOString(), processing_by: WORKER_ID })
    .eq('id', notificationId)
    .eq('is_sent', false)
    .eq('processing', false)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('[OrderAcceptedWorker] Failed to claim notification', { notificationId, error: error.message });
    return null;
  }
  return data;
}

async function markSent(notificationId) {
  await supabase.from('notifications').update({ is_sent: true, sent_at: new Date().toISOString(), processing: false }).eq('id', notificationId).catch(err => {
    logger.error('[OrderAcceptedWorker] Failed to mark notification sent', { notificationId, error: err.message });
  });
}

async function markProcessedNoTokens(notificationId) {
  await supabase.from('notifications').update({ is_sent: true, sent_at: new Date().toISOString(), processing: false }).eq('id', notificationId).catch(err => {
    logger.error('[OrderAcceptedWorker] Failed to mark notification processed (no tokens)', { notificationId, error: err.message });
  });
}

async function releaseClaim(notificationId) {
  await supabase.from('notifications').update({ processing: false }).eq('id', notificationId).catch(err => {
    logger.error('[OrderAcceptedWorker] Failed to release claim', { notificationId, error: err.message });
  });
}

async function processNotificationRow(row) {
  const notificationId = row.id;
  const claimed = await claimNotification(notificationId);
  if (!claimed) return;

  try {
    const { customer_id, shop_id, title, message, type, reference_id } = claimed;

    // Use pushNotificationService but skip storing because the DB row already exists
    const result = await pushNotificationService.sendPushNotification({
      customer_id,
      shop_id,
      title,
      message,
      type,
      reference_id,
      target: 'customer',
      skipStore: true,
    });

    // If no tokens were found, treat as processed to avoid infinite retries
    if (result && result.sent === 0 && result.failed === 0 && !result.error) {
      await markProcessedNoTokens(notificationId);
      logger.info('[OrderAcceptedWorker] No tokens for notification; marked processed', { notificationId });
      return;
    }

    // Partial or full success: mark sent
    if (result && result.sent > 0) {
      await markSent(notificationId);
      logger.info('[OrderAcceptedWorker] Notification sent', { notificationId, sent: result.sent, failed: result.failed });
      return;
    }

    // Transient failure: release claim so it can be retried later
    await releaseClaim(notificationId);
    logger.warn('[OrderAcceptedWorker] Transient failure sending notification; will retry later', { notificationId, error: result?.error });
  } catch (err) {
    logger.error('[OrderAcceptedWorker] Unexpected error processing notification', { error: err.message, id: notificationId });
    await releaseClaim(notificationId);
  }
}

export default function startOrderAcceptedWorker(opts = {}) {
  const intervalMs = opts.intervalMs || 30_000; // default 30s
  const batchSize = opts.batchSize || 25;

  async function sweepOnce() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'order_accepted')
        .eq('is_sent', false)
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (error) {
        logger.error('[OrderAcceptedWorker] Failed to query notifications', { error: error.message });
        return;
      }

      if (!data || data.length === 0) return;

      for (const row of data) {
        // process without awaiting too many in parallel to avoid thundering
        // process sequentially to keep behavior simple and safe
        // if concurrency needed, increase workers carefully
        // eslint-disable-next-line no-await-in-loop
        await processNotificationRow(row);
      }
    } catch (err) {
      logger.error('[OrderAcceptedWorker] Sweep unexpected error', { error: err.message });
    }
  }

  // Kick off immediately and then on interval
  sweepOnce();
  const timer = setInterval(sweepOnce, intervalMs);
  timer.unref?.();

  logger.info('[OrderAcceptedWorker] Started', { intervalMs, batchSize, workerId: WORKER_ID });

  return {
    stop: () => clearInterval(timer),
  };
}
