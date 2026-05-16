import { supabase } from '../../config/supabaseClient.js';

const DEFAULT_MAX_RANGE = 999999;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeRulesFromScalarFields = (row) => {
  const deliveryFee = toNumber(row?.delivery_fee, 0);
  const freeDeliveryAbove = toNumber(row?.free_delivery_above, 0);

  if (freeDeliveryAbove > 0) {
    const beforeFreeMax = Math.max(0, freeDeliveryAbove - 0.01);
    return [
      { min: 0, max: beforeFreeMax, fee: deliveryFee },
      { min: freeDeliveryAbove, max: DEFAULT_MAX_RANGE, fee: 0 },
    ];
  }

  return [{ min: 0, max: DEFAULT_MAX_RANGE, fee: deliveryFee }];
};

/**
 * Given HH:MM strings for open and close, decide if the current UTC time
 * is within the delivery window. Handles overnight spans (e.g. 21:00–03:00).
 */
const isWithinDeliveryWindow = (openTime, closeTime) => {
  if (!openTime || !closeTime) return true; // No window configured → always open

  const now = new Date();
  const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();

  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const openMins  = openH  * 60 + openM;
  const closeMins = closeH * 60 + closeM;

  if (openMins <= closeMins) {
    // Normal window: e.g. 09:00–22:00
    return nowMins >= openMins && nowMins < closeMins;
  } else {
    // Overnight window: e.g. 21:00–03:00  →  open if past 21:00 OR before 03:00
    return nowMins >= openMins || nowMins < closeMins;
  }
};

class PlatformService {
  async getPlatformSettings() {
    let row = null;

    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      row = data;
    }

    if (!row && process.env.DELIVERY_RULES_JSON) {
      try {
        const rules = JSON.parse(process.env.DELIVERY_RULES_JSON);
        if (Array.isArray(rules)) {
          return {
            delivery_rules: rules,
            delivery_fee: 0,
            convenience_fee: 0,
            min_order_amount: 0,
            free_delivery_above: 0,
          };
        }
      } catch (e) {
        // Ignore malformed env and continue fallback.
      }
    }

    const deliveryRules = Array.isArray(row?.delivery_rules)
      ? row.delivery_rules
      : normalizeRulesFromScalarFields(row);

    return {
      delivery_rules: deliveryRules,
      delivery_fee: toNumber(row?.delivery_fee, deliveryRules?.[0]?.fee ?? 0),
      convenience_fee: toNumber(row?.convenience_fee, 0),
      min_order_amount: toNumber(row?.minimum_order_amount ?? row?.min_order_amount, 0),
      free_delivery_above: toNumber(row?.free_delivery_above, 0),
    };
  }

  /**
   * Computes real-time app availability for the User App frontend.
   * Returns shape expected by AppAvailabilityContext:
   *   { isCurrentlyOpen, closedReason, blockedBy, openTime, closeTime, isAppEnabled }
   */
  async getAvailability() {
    try {
      // The admin writes to 'app_availability', NOT 'platform_settings'
      const { data: row, error } = await supabase
        .from('app_availability')
        .select('is_app_enabled, delivery_start_time, delivery_end_time, maintenance_message, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If Supabase returns an error or no row, fail open
      if (error) {
        console.warn('[PlatformService.getAvailability] DB error, defaulting to open:', error.message);
        return {
          isCurrentlyOpen: true,
          closedReason: null,
          blockedBy: null,
          openTime: null,
          closeTime: null,
          isAppEnabled: true,
        };
      }

      if (!row) {
        return {
          isCurrentlyOpen: true,
          closedReason: null,
          blockedBy: null,
          openTime: null,
          closeTime: null,
          isAppEnabled: true,
        };
      }

      // Map app_availability columns to our response shape
      const isAppEnabled  = row.is_app_enabled !== false;   // false → closed
      const openTime      = row.delivery_start_time ?? null;
      const closeTime     = row.delivery_end_time   ?? null;
      const closedReason  = row.maintenance_message ?? null;

      if (!isAppEnabled) {
        return {
          isCurrentlyOpen: false,
          closedReason: closedReason || 'We are currently not accepting orders. Please try again later.',
          blockedBy: 'admin_toggle',
          openTime,
          closeTime,
          isAppEnabled: false,
        };
      }

      const withinWindow = isWithinDeliveryWindow(openTime, closeTime);

      return {
        isCurrentlyOpen: withinWindow,
        closedReason: withinWindow
          ? null
          : (closedReason || (openTime && closeTime
              ? `We are closed. We deliver ${openTime} – ${closeTime}.`
              : 'We are currently closed.')),
        blockedBy: withinWindow ? null : 'delivery_window',
        openTime,
        closeTime,
        isAppEnabled: true,
      };
    } catch (err) {
      console.error('[PlatformService.getAvailability] Unexpected error:', err.message);
      return {
        isCurrentlyOpen: true,
        closedReason: null,
        blockedBy: null,
        openTime: null,
        closeTime: null,
        isAppEnabled: true,
      };
    }
  }

}

export default new PlatformService();
