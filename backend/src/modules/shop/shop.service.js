import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants.js';

class ShopService {
  /**
   * Get all active shops with filtering and pagination
   */
  async getShops(filters = {}, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    try {
      const limit = Math.min(pageSize, MAX_PAGE_SIZE);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('shops')
        .select('id, name, description, business_type, address, city, latitude, longitude, is_active, created_at', { count: 'exact' })
        .eq('is_active', true);

      // Filter by business type
      if (filters.business_type) {
        query = query.eq('business_type', filters.business_type);
      }

      // Filter by city
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }

      // Search by name
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch shops', { error });
        throw new Error('Failed to fetch shops');
      }

      return {
        shops: data,
        pagination: {
          page,
          pageSize: limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getShops', { error: error.message });
      throw error;
    }
  }

  /**
   * Get shop by ID
   */
  async getShopById(shopId) {
    try {
      if (!shopId) {
        throw new Error('Shop ID is required');
      }

      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .maybeSingle();

      if (error) {
        console.error('Supabase shop fetch error:', error);
        throw new Error('Database error while fetching shop');
      }

      if (!data) {
        return null;
      }

      return data;

    } catch (err) {
      console.error('getShopById service error:', err);
      throw err;
    }
  }

  /**
   * Get nearby shops based on coordinates
   */
  async getNearbyShops(latitude, longitude, radiusKm = 10, businessType = null) {
    try {
      // Using Haversine formula for distance calculation
      // Note: For production, consider using PostGIS extensions
      let query = supabase.rpc('get_nearby_shops', {
        lat: latitude,
        lng: longitude,
        radius_km: radiusKm,
      });

      if (businessType) {
        query = query.eq('business_type', businessType);
      }

      const { data, error } = await query;

      if (error) {
        // Fallback to basic query if RPC doesn't exist
        logger.warn('RPC get_nearby_shops not found, using basic query', { error });
        return this.getShopsBasic(businessType);
      }

      return data;
    } catch (error) {
      logger.error('Error in getNearbyShops', { error: error.message });
      throw error;
    }
  }

  /**
   * Get shops by business type for Browse Page
   * Includes category count for each shop
   * Used in: Browse Page (after selecting Grocery or Restaurant)
   */
  async getShopsByBusinessType(businessType, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    try {
      const limit = Math.min(pageSize, MAX_PAGE_SIZE);
      const offset = (page - 1) * limit;

      // Fetch shops for the business type
      const { data: shops, error, count } = await supabase
        .from('shops')
        .select('*', { count: 'exact' })
        .eq('business_type', businessType)
        .eq('is_active', true)
        .range(offset, offset + limit - 1)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to fetch shops by business type', { error, businessType });
        throw new Error('Failed to fetch shops');
      }

      const shopIds = (shops || []).map((shop) => shop.id).filter(Boolean);
      let categories = [];

      if (shopIds.length > 0) {
        // Fetch categories once to calculate counts shown on the browse cards
        const { data: categoryRows, error: categoriesError } = await supabase
          .from('categories')
          .select('id, shop_id')
          .in('shop_id', shopIds)
          .eq('is_active', true);

        if (categoriesError) {
          logger.warn('Failed to fetch categories for shops', { error: categoriesError, shopIds });
        } else {
          categories = categoryRows || [];
        }
      }

      const categoryCountByShop = new Map();

      categories.forEach((category) => {
        const shopId = category?.shop_id;
        if (!shopId) {
          return;
        }

        categoryCountByShop.set(shopId, (categoryCountByShop.get(shopId) || 0) + 1);
      });

      const parseSubcategories = (rawValue) => {
        if (!rawValue) {
          return [];
        }

        if (Array.isArray(rawValue)) {
          return rawValue
            .map((value) => (typeof value === 'string' ? value.trim() : String(value || '').trim()))
            .filter((value) => value.length > 0);
        }

        if (typeof rawValue === 'string') {
          return rawValue
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
        }

        return [];
      };

      const shopsWithCategories = (shops || []).map((shop) => {
        const normalizedImage = shop.image_url ?? shop.image ?? shop.logo_url ?? shop.banner_url ?? shop.thumbnail_url ?? null;
        const categoryCount = categoryCountByShop.get(shop.id) || 0;
        const subcategoryNames = parseSubcategories(shop?.subcategory);

        return {
          ...shop,
          image_url: normalizedImage,
          category_count: categoryCount,
          subcategories: subcategoryNames,
        };
      });

      return {
        shops: shopsWithCategories,
        pagination: {
          page,
          pageSize: limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error in getShopsByBusinessType', { error: error.message });
      throw error;
    }
  }

  /**
   * Get shops for home page (grocery and restaurant sections)
   * Returns limited shops for each business type
   */
  async getShopsForHome(limit = 6) {
    try {
      // Fetch grocery shops
      const { data: groceryShops, error: groceryError } = await supabase
        .from('shops')
        .select('*')
        .eq('business_type', 'grocery')
        .eq('is_active', true)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (groceryError) {
        logger.error('Failed to fetch grocery shops for home', { error: groceryError });
      }

      // Fetch restaurant shops
      const { data: restaurantShops, error: restaurantError } = await supabase
        .from('shops')
        .select('*')
        .eq('business_type', 'restaurant')
        .eq('is_active', true)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (restaurantError) {
        logger.error('Failed to fetch restaurant shops for home', { error: restaurantError });
      }

      const normalizeShopImage = (shop) => ({
        ...shop,
        image_url: shop?.image_url ?? shop?.image ?? shop?.logo_url ?? shop?.banner_url ?? shop?.thumbnail_url ?? null,
      });

      return {
        grocery: (groceryShops || []).map(normalizeShopImage),
        restaurant: (restaurantShops || []).map(normalizeShopImage),
      };
    } catch (error) {
      logger.error('Error in getShopsForHome', { error: error.message });
      throw error;
    }
  }

  /**
   * Fallback method for getting shops
   */
  async getShopsBasic(businessType = null) {
    let query = supabase
      .from('shops')
      .select('id, name, description, business_type, address, city, latitude, longitude, is_active')
      .eq('is_active', true)
      .limit(20);

    if (businessType) {
      query = query.eq('business_type', businessType);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch shops (basic)', { error });
      throw new Error('Failed to fetch shops');
    }

    return data;
  }
}

export default new ShopService();
