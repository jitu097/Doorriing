import { supabase } from '../../config/supabaseClient.js';
import { BUSINESS_TYPE } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const MAX_HOME_ITEMS_LIMIT = 20;

const MAX_RATING_SUMMARY_ITEMS = 200;

const ITEM_SELECT_COLUMNS = `
  id,
  shop_id,
  category_id,
  subcategory_id,
  name,
  description,
  price,
  discount_type,
  discount_value,
  final_price,
  full_price,
  full_discount_type,
  full_discount_value,
  full_final_price,
  half_portion_price,
  half_discount_type,
  half_discount_value,
  half_portion_final_price,
  food_type,
  has_variants,
  base_quantity,
  unit,
  image_url,
  is_active,
  is_available,
  stock_quantity,
  created_at,
  shops!inner(id, name, business_type, is_active, is_open, status)
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

  async #enrichItemsWithRatings(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const itemIds = items.map((item) => item?.id).filter(Boolean);
    if (itemIds.length === 0 || itemIds.length > MAX_RATING_SUMMARY_ITEMS) {
      return items;
    }

    const { data, error } = await supabase
      .from('item_reviews')
      .select('item_id, rating')
      .in('item_id', itemIds)
      .not('rating', 'is', null);

    if (error) {
      logger.warn('Failed to fetch home item rating summary', { error: error.message });
      return items;
    }

    const countByItemId = new Map();
    const totalByItemId = new Map();

    (data || []).forEach((review) => {
      const itemId = review?.item_id;
      const rating = Number(review?.rating);

      if (!itemId || !Number.isFinite(rating)) {
        return;
      }

      countByItemId.set(itemId, (countByItemId.get(itemId) || 0) + 1);
      totalByItemId.set(itemId, (totalByItemId.get(itemId) || 0) + rating);
    });

    return items.map((item) => {
      const itemId = item?.id;
      const reviewCount = countByItemId.get(itemId) || 0;
      const averageRating = reviewCount > 0 ? Number(((totalByItemId.get(itemId) || 0) / reviewCount).toFixed(1)) : null;

      return {
        ...item,
        average_rating: item?.average_rating ?? averageRating,
        review_count: item?.review_count ?? reviewCount,
      };
    });
  }

  async getHomeItems(limit) {
    try {
      const normalizedLimit = this.#sanitizeLimit(limit);

      const [groceryItems, restaurantItems] = await Promise.all([
        this.#fetchItemsByBusinessType(BUSINESS_TYPE.GROCERY, normalizedLimit),
        this.#fetchItemsByBusinessType(BUSINESS_TYPE.RESTAURANT, normalizedLimit),
      ]);

      const [groceryItemsWithRatings, restaurantItemsWithRatings] = await Promise.all([
        this.#enrichItemsWithRatings(groceryItems),
        this.#enrichItemsWithRatings(restaurantItems),
      ]);

      return {
        grocery_items: groceryItemsWithRatings,
        restaurant_items: restaurantItemsWithRatings,
      };
    } catch (error) {
      logger.error('Error getting home items', { error: error.message });
      throw error;
    }
  }
}

export default new HomeService();
