import { supabase } from '../../config/supabaseClient.js';
import { BUSINESS_TYPE } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';
import { cacheManager } from '../../utils/cache.js';

const CACHE_TTL_SECONDS = 300; // 5 minutes

// Reduced columns for faster queries - only essential fields
const ITEM_SELECT_COLUMNS = `
  id,
  shop_id,
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
  base_quantity,
  unit,
  image_url,
  is_available,
  stock_quantity,
  shops!inner(id, name, business_type, is_active, is_open)
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

    return parsed;
  }

  #shuffleItems(items = []) {
    if (!Array.isArray(items) || items.length < 2) {
      return Array.isArray(items) ? items : [];
    }

    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
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
    // Fast path: no items to enrich
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const itemIds = items.map((item) => item?.id).filter(Boolean);
    
    // Skip rating fetch if no items
    if (itemIds.length === 0) {
      return items;
    }

    // Query pre-aggregated view
    const { data: ratingData, error } = await supabase
      .from('item_reviews_summary')
      .select('item_id, average_rating, review_count')
      .in('item_id', itemIds);

    if (error) {
      logger.warn('Failed to fetch home item rating summary', { error: error.message });
      // Return items without ratings - don't fail the whole request
      return items.map(item => ({
        ...item,
        average_rating: item?.average_rating ?? null,
        review_count: item?.review_count ?? 0,
      }));
    }

    // Map ratings in O(N)
    const ratingMap = new Map();
    (ratingData || []).forEach((row) => {
      if (!row?.item_id) return;
      ratingMap.set(row.item_id, {
        average_rating: row.average_rating !== null ? Number(row.average_rating) : null,
        review_count: row.review_count ?? 0,
      });
    });

    return items.map((item) => {
      const stats = ratingMap.get(item?.id);
      return {
        ...item,
        average_rating: stats?.average_rating ?? null,
        review_count: stats?.review_count ?? 0,
      };
    });
  }

  async getHomeItems(limit) {
    try {
      const normalizedLimit = this.#sanitizeLimit(limit);
      
      // Check cache first
      const cacheKey = `home_items_${normalizedLimit || 'all'}`;
      const cachedResult = cacheManager.get(cacheKey);
      if (cachedResult) {
        logger.info('Returning cached home items');
        return cachedResult;
      }

      logger.info('Cache miss - fetching from database');
      
      // Fetch both item types in parallel
      const [groceryItems, restaurantItems] = await Promise.all([
        this.#fetchItemsByBusinessType(BUSINESS_TYPE.GROCERY, normalizedLimit),
        this.#fetchItemsByBusinessType(BUSINESS_TYPE.RESTAURANT, normalizedLimit),
      ]);

      // Enrich with ratings in parallel
      const [groceryItemsWithRatings, restaurantItemsWithRatings] = await Promise.all([
        this.#enrichItemsWithRatings(this.#shuffleItems(groceryItems)),
        this.#enrichItemsWithRatings(this.#shuffleItems(restaurantItems)),
      ]);

      const result = {
        grocery_items: groceryItemsWithRatings,
        restaurant_items: restaurantItemsWithRatings,
      };

      // Cache the result
      cacheManager.set(cacheKey, result, CACHE_TTL_SECONDS);

      return result;
    } catch (error) {
      logger.error('Error getting home items', { error: error.message });
      throw error;
    }
  }
}

export default new HomeService();
