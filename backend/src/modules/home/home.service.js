import { supabase } from '../../config/supabaseClient.js';
import { BUSINESS_TYPE } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const MAX_HOME_ITEMS_LIMIT = 20;

const ITEM_SELECT_COLUMNS = `
  id,
  shop_id,
  category_id,
  subcategory_id,
  name,
  description,
  price,
  full_price,
  half_portion_price,
  has_variants,
  image_url,
  is_active,
  is_available,
  stock_quantity,
  created_at,
  shops!inner(id, name, business_type)
`;

class HomeService {
  #sanitizeLimit(limit) {
    if (limit === undefined || limit === null || limit === '') {
      return null;
    }

    const parsed = parseInt(limit, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return null;
    }

    return Math.min(parsed, MAX_HOME_ITEMS_LIMIT);
  }

  async #fetchItemsByBusinessType(businessType, limit) {
    let query = supabase
      .from('items')
      .select(ITEM_SELECT_COLUMNS)
      .eq('is_active', true)
      .eq('is_available', true)
      .eq('shops.business_type', businessType)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch home items', { error, businessType });
      throw new Error('Failed to fetch home items');
    }

    return data || [];
  }

  async getHomeItems(limit) {
    try {
      const normalizedLimit = this.#sanitizeLimit(limit);

      const [groceryItems, restaurantItems] = await Promise.all([
        this.#fetchItemsByBusinessType(BUSINESS_TYPE.GROCERY, normalizedLimit),
        this.#fetchItemsByBusinessType(BUSINESS_TYPE.RESTAURANT, normalizedLimit),
      ]);

      return {
        grocery_items: groceryItems,
        restaurant_items: restaurantItems,
      };
    } catch (error) {
      logger.error('Error getting home items', { error: error.message });
      throw error;
    }
  }
}

export default new HomeService();
