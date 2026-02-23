import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants.js';

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
        .select('id, shop_id, category_id, subcategory_id, name, description, price, full_price, half_portion_price, has_variants, image_url, is_active, is_available, stock_quantity, created_at', { count: 'exact' })
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

      return {
        items: data || [],
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
        .select('id, shop_id, category_id, subcategory_id, name, description, price, full_price, half_portion_price, has_variants, image_url, is_active, is_available, stock_quantity, created_at, shops!inner(business_type)')
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
        .select('id, shop_id, category_id, subcategory_id, name, description, price, full_price, half_portion_price, has_variants, image_url, is_active, is_available, stock_quantity', { count: 'exact' })
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .eq('is_available', true)
        .range(offset, offset + limit - 1)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to fetch items by category', { error, categoryId });
        throw new Error('Failed to fetch items');
      }

      return {
        items: data,
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
        .select('id, shop_id, category_id, subcategory_id, name, description, price, full_price, half_portion_price, has_variants, image_url, is_active, is_available, stock_quantity', { count: 'exact' })
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

      return {
        items: data || [],
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
