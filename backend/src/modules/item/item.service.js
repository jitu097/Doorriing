import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants.js';

const MAX_RATING_SUMMARY_ITEMS = 200;

const buildItemRatingSummary = async (itemIds = []) => {
  const sanitized = (itemIds || []).filter(Boolean);

  if (sanitized.length === 0 || sanitized.length > MAX_RATING_SUMMARY_ITEMS) {
    return {
      countByItemId: new Map(),
      averageByItemId: new Map(),
    };
  }

  const { data, error } = await supabase
    .from('item_reviews')
    .select('item_id, rating')
    .in('item_id', sanitized)
    .not('rating', 'is', null);

  if (error) {
    logger.warn('Failed to fetch item rating summary', { error: error.message });
    return {
      countByItemId: new Map(),
      averageByItemId: new Map(),
    };
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

  const averageByItemId = new Map();
  countByItemId.forEach((count, itemId) => {
    const total = totalByItemId.get(itemId) || 0;
    averageByItemId.set(itemId, count > 0 ? Number((total / count).toFixed(1)) : null);
  });

  return { countByItemId, averageByItemId };
};

const enrichItemsWithRatings = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const itemIds = items.map((item) => item?.id).filter(Boolean);
  const { countByItemId, averageByItemId } = await buildItemRatingSummary(itemIds);

  return items.map((item) => {
    const itemId = item?.id;
    return {
      ...item,
      average_rating: item?.average_rating ?? averageByItemId.get(itemId) ?? null,
      review_count: item?.review_count ?? countByItemId.get(itemId) ?? 0,
    };
  });
};

class ItemService {
  /**
   * Get items by shop ID
   */
  async getItemsByShop(shopId, filters = {}, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    try {
      const { validateUUID } = await import('../../utils/uuid.validator.js');
      validateUUID(shopId, 'Shop ID');

      // Validate optional filter UUIDs
      if (filters.category_id) {
        validateUUID(filters.category_id, 'Category ID');
      }
      if (filters.subcategory_id) {
        validateUUID(filters.subcategory_id, 'Subcategory ID');
      }

      const limit = Math.min(pageSize, MAX_PAGE_SIZE);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('items')
        .select('id, shop_id, category_id, subcategory_id, name, description, price, final_price, discount_type, discount_value, full_price, full_final_price, full_discount_type, full_discount_value, half_portion_price, half_portion_final_price, half_discount_type, half_discount_value, has_variants, image_url, is_active, is_available, stock_quantity, created_at', { count: 'exact' })
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .eq('is_available', true);

      // Filter by category
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      // Filter by subcategory (optional)
      if (filters.subcategory_id) {
        query = query.eq('subcategory_id', filters.subcategory_id);
      }

      // Search by name
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Filter in-stock items (for grocery)
      if (filters.in_stock_only === 'true') {
        query = query.gt('stock_quantity', 0);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1).order('name', { ascending: true });

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch items', { error, shopId, filters });
        throw new Error('Failed to fetch items');
      }

      const items = await enrichItemsWithRatings(data || []);

      return {
        items,
        pagination: {
          page,
          pageSize: limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      if (error.message.includes('Invalid')) {
        throw error;
      }
      logger.error('Error in getItemsByShop', { error: error.message, shopId, filters });
      throw error;
    }
  }

  /**
   * Get item by ID
   */
  async getItemById(itemId) {
    try {
      const { validateUUID } = await import('../../utils/uuid.validator.js');
      validateUUID(itemId, 'Item ID');

      const { data, error } = await supabase
        .from('items')
        .select('id, shop_id, category_id, subcategory_id, name, description, price, final_price, discount_type, discount_value, full_price, full_final_price, full_discount_type, full_discount_value, half_portion_price, half_portion_final_price, half_discount_type, half_discount_value, has_variants, image_url, is_active, is_available, stock_quantity, created_at, shops!inner(business_type)')
        .eq('id', itemId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Item not found');
        }
        logger.error('Failed to fetch item', { error, itemId });
        throw new Error('Failed to fetch item');
      }

      return data;
    } catch (error) {
      if (error.message.includes('Invalid')) {
        throw error;
      }
      logger.error('Error in getItemById', { error: error.message, itemId });
      throw error;
    }
  }

  /**
   * Check item availability and stock
   */
  async checkItemAvailability(itemId, quantity = 1) {
    try {
      const item = await this.getItemById(itemId);

      if (!item.is_available) {
        return { available: false, reason: 'Item is not available' };
      }

      // Check stock for grocery items ONLY
      // Restaurants do not manage stock quantity constraints
      if (item.shops?.business_type === 'grocery') {
        if (item.stock_quantity !== null && item.stock_quantity < quantity) {
          return { available: false, reason: 'Insufficient stock', availableStock: item.stock_quantity };
        }
      }

      return { available: true, item };
    } catch (error) {
      logger.error('Error in checkItemAvailability', { error: error.message });
      throw error;
    }
  }

  /**
   * Get items by category
   */
  async getItemsByCategory(categoryId, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    try {
      const limit = Math.min(pageSize, MAX_PAGE_SIZE);
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('items')
        .select('id, shop_id, category_id, subcategory_id, name, description, price, final_price, discount_type, discount_value, full_price, full_final_price, full_discount_type, full_discount_value, half_portion_price, half_portion_final_price, half_discount_type, half_discount_value, has_variants, image_url, is_active, is_available, stock_quantity', { count: 'exact' })
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .eq('is_available', true)
        .range(offset, offset + limit - 1)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to fetch items by category', { error, categoryId });
        throw new Error('Failed to fetch items');
      }

      const items = await enrichItemsWithRatings(data || []);

      return {
        items,
        pagination: {
          page,
          pageSize: limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getItemsByCategory', { error: error.message });
      throw error;
    }
  }

  /**
   * Get items by subcategory
   * Used when frontend needs to fetch items for a specific subcategory
   */
  async getItemsBySubcategory(subcategoryId, shopId, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    try {
      const { validateUUIDs } = await import('../../utils/uuid.validator.js');
      validateUUIDs({ 'Subcategory ID': subcategoryId, 'Shop ID': shopId });

      const limit = Math.min(pageSize, MAX_PAGE_SIZE);
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('items')
        .select('id, shop_id, category_id, subcategory_id, name, description, price, final_price, discount_type, discount_value, full_price, full_final_price, full_discount_type, full_discount_value, half_portion_price, half_portion_final_price, half_discount_type, half_discount_value, has_variants, image_url, is_active, is_available, stock_quantity', { count: 'exact' })
        .eq('shop_id', shopId)
        .eq('subcategory_id', subcategoryId)
        .eq('is_active', true)
        .eq('is_available', true)
        .range(offset, offset + limit - 1)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to fetch items by subcategory', { error, subcategoryId, shopId });
        throw new Error('Failed to fetch items');
      }

      const items = await enrichItemsWithRatings(data || []);

      return {
        items,
        pagination: {
          page,
          pageSize: limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      if (error.message.includes('Invalid')) {
        throw error;
      }
      logger.error('Error in getItemsBySubcategory', { error: error.message, subcategoryId, shopId });
      throw error;
    }
  }
}

export default new ItemService();
