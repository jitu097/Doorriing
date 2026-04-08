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
}

export default new PlatformService();
