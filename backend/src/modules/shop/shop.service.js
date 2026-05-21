import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../utils/constants.js';
import { cacheManager } from '../../utils/cache.manager.js';

const SHOP_IMAGE_KEYS = [
  'image_url',
  'image',
  'logo_url',
  'banner_url',
  'thumbnail_url',
  'cover_image',
  'profile_image',
  'shop_image',
  'shop_image_url',
  'shop_logo',
  'photo_url',
  'display_image',
];

const STOCK_SUMMARY_LIMIT = 200;
const RATING_SUMMARY_LIMIT = 200;

const SHOP_SELECT_COLUMNS = 'id, name, description, business_type, city, is_active, is_open, created_at, shop_image_url';

const normalizeImage = (shop = {}) => {
  for (const key of SHOP_IMAGE_KEYS) {
    const rawValue = shop[key];
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return null;
};

const formatStatusMeta = (shop = {}) => {
  const derivedIsOpen = typeof shop.is_open === 'boolean'
    ? shop.is_open
    : (typeof shop.is_active === 'boolean' ? shop.is_active : true);

  const rawStatus = shop.status_label || shop.shop_status || shop.status;
  const normalized = typeof rawStatus === 'string' && rawStatus.trim().length > 0
    ? rawStatus.trim().toLowerCase()
    : (derivedIsOpen ? 'open' : 'closed');

  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return {
    isOpen: derivedIsOpen,
    code: normalized,
    label,
  };
};

const formatShopRecord = (shop, extra = {}) => {
  if (!shop) {
    return null;
  }

  const statusMeta = formatStatusMeta(shop);

  return {
    ...shop,
    image_url: normalizeImage(shop),
    is_open: statusMeta.isOpen,
    shop_status: statusMeta.code,
    status_label: statusMeta.label,
    ...extra,
  };
};

const enrichShopsForCards = async (shops = []) => {
  if (!Array.isArray(shops) || shops.length === 0) {
    return [];
  }

  const shopIds = shops.map((shop) => shop?.id).filter(Boolean);
  if (shopIds.length === 0) {
    return shops.map(shop => formatShopRecord(shop, {
      item_count: shop?.item_count ?? null,
      total_stock_quantity: shop?.total_stock_quantity ?? null,
      average_rating: shop?.average_rating ?? null,
      review_count: shop?.review_count ?? 0,
    }));
  }

  // Parallelize database view queries to retrieve pre-aggregated summaries
  const [inventoryRes, ratingRes] = await Promise.all([
    supabase
      .from('shop_inventory_summary')
      .select('shop_id, item_count, total_stock_quantity')
      .in('shop_id', shopIds),
    supabase
      .from('shop_reviews_summary')
      .select('shop_id, average_rating, review_count')
      .in('shop_id', shopIds)
  ]);

  const inventoryMap = new Map();
  if (inventoryRes.data) {
    inventoryRes.data.forEach((row) => {
      inventoryMap.set(row.shop_id, row);
    });
  }

  const ratingMap = new Map();
  if (ratingRes.data) {
    ratingRes.data.forEach((row) => {
      ratingMap.set(row.shop_id, row);
    });
  }

  return shops.map((shop) => {
    const shopId = shop?.id;
    const inv = inventoryMap.get(shopId);
    const rate = ratingMap.get(shopId);

    const extras = {
      item_count: shop?.item_count ?? inv?.item_count ?? null,
      total_stock_quantity: shop?.total_stock_quantity ?? inv?.total_stock_quantity ?? null,
      average_rating: shop?.average_rating ?? (rate?.average_rating !== null ? Number(rate?.average_rating) : null),
      review_count: shop?.review_count ?? rate?.review_count ?? 0,
    };

    return formatShopRecord(shop, extras);
  });
};

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
        .select('id, name, description, business_type, address, city, is_active, created_at', { count: 'exact' })
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

      const formattedShops = await enrichShopsForCards(data || []);

      return {
        shops: formattedShops,
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
  async getShopById(shopId, { includeCategories = false, includeInventory = true } = {}) {
    try {
      if (!shopId) {
        throw new Error('Shop ID is required');
      }

      // Generate cache key
      const cacheKey = `${shopId}:${includeCategories ? 'cat:' : ''}${includeInventory ? 'inv' : ''}`;

      // Check cache first
      const cachedShop = cacheManager.get('shop', cacheKey);
      if (cachedShop) {
        logger.debug('Returning cached shop', { shopId });
        return cachedShop;
      }

      const { data, error } = await supabase
        .from('shops')
        .select(`${SHOP_SELECT_COLUMNS}, seller_id, address`)
        .eq('id', shopId)
        .maybeSingle();

      if (error) {
        console.error('Supabase shop fetch error:', error);
        throw new Error('Database error while fetching shop');
      }

      if (!data) {
        return null;
      }
      const [categoryCount, inventorySummary] = await Promise.all([
        includeCategories ? this.getActiveCategoryCount(shopId) : Promise.resolve(null),
        includeInventory ? supabase
          .from('shop_inventory_summary')
          .select('item_count, total_stock_quantity')
          .eq('shop_id', shopId)
          .maybeSingle() : Promise.resolve({ data: null }),
      ]);

      const extras = {
        category_count: includeCategories ? categoryCount : data?.category_count ?? null,
      };

      if (includeInventory) {
        const inv = inventorySummary?.data;
        extras.item_count = data?.item_count ?? inv?.item_count ?? null;
        extras.total_stock_quantity = data?.total_stock_quantity ?? inv?.total_stock_quantity ?? null;
      }

      const formattedShop = formatShopRecord(data, extras);

      // Cache the result for 30 minutes
      cacheManager.set('shop', cacheKey, formattedShop, 1800);

      return formattedShop;

    } catch (err) {
      console.error('getShopById service error:', err);
      throw err;
    }
  }

  async getActiveCategoryCount(shopId) {
    const { count, error } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('is_active', true);

    if (error) {
      logger.warn('Failed to count categories for shop', { error: error.message, shopId });
      return null;
    }

    return typeof count === 'number' ? count : null;
  }

  /**
   * Get nearby shops based on coordinates
   */
  async getNearbyShops(latitude, longitude, radiusKm = 10, businessType = null, options = {}) {
    try {
      // Round coordinates to 3 decimal places (~110 meters) for caching
      const latKey = parseFloat(latitude).toFixed(3);
      const lngKey = parseFloat(longitude).toFixed(3);
      const cacheKey = `nearby:${latKey}:${lngKey}:${radiusKm}:${businessType || 'all'}`;

      const cached = cacheManager.get('shop', cacheKey);
      if (cached) {
        logger.debug('Returning cached nearby shops', { latKey, lngKey });
        return cached;
      }

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
        const basicShops = await this.getShopsBasic(businessType);
        const fallbackTtl = Number.isFinite(Number(options.ttlSeconds)) ? Number(options.ttlSeconds) : 300;
        cacheManager.set('shop', cacheKey, basicShops, fallbackTtl); // Cache for fallback
        return basicShops;
      }

      const enriched = await enrichShopsForCards(data || []);
      const ttl = Number.isFinite(Number(options.ttlSeconds)) ? Number(options.ttlSeconds) : 300;
      cacheManager.set('shop', cacheKey, enriched, ttl);

      return enriched;
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

      // Fetch shops for the business type with specific columns
      const { data: shops, error, count } = await supabase
        .from('shops')
        .select(`${SHOP_SELECT_COLUMNS}, subcategory`, { count: 'exact' })
        .eq('business_type', businessType)
        .range(offset, offset + limit - 1)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to fetch shops by business type', { error, businessType });
        throw new Error(`Failed to fetch shops: ${error.message || JSON.stringify(error)}`);
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
        const categoryCount = categoryCountByShop.get(shop.id) || 0;
        const subcategoryNames = parseSubcategories(shop?.subcategory);

        return {
          ...shop,
          category_count: categoryCount,
          subcategories: subcategoryNames,
        };
      });

      const formattedShops = await enrichShopsForCards(shopsWithCategories);

      return {
        shops: formattedShops,
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
      const cacheKey = `home:${limit}`;
      const cached = cacheManager.get('shop', cacheKey);
      if (cached) {
        logger.debug('Returning cached home shops', { limit });
        return cached;
      }

      // Fetch grocery shops with specific columns
      const { data: groceryShops, error: groceryError } = await supabase
        .from('shops')
        .select(SHOP_SELECT_COLUMNS)
        .eq('business_type', 'grocery')
        .eq('is_active', true)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (groceryError) {
        logger.error('Failed to fetch grocery shops for home', { error: groceryError });
      }

      // Fetch restaurant shops with specific columns
      const { data: restaurantShops, error: restaurantError } = await supabase
        .from('shops')
        .select(SHOP_SELECT_COLUMNS)
        .eq('business_type', 'restaurant')
        .eq('is_active', true)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (restaurantError) {
        logger.error('Failed to fetch restaurant shops for home', { error: restaurantError });
      }

      const [groceryFormatted, restaurantFormatted] = await Promise.all([
        enrichShopsForCards(groceryShops || []),
        enrichShopsForCards(restaurantShops || []),
      ]);

      const result = {
        grocery: groceryFormatted,
        restaurant: restaurantFormatted,
      };

      // Cache the result for 300 seconds (5 minutes)
      cacheManager.set('shop', cacheKey, result, 300);

      return result;
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
      .select('id, name, description, business_type, address, city, is_active')
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

    return enrichShopsForCards(data || []);
  }
}

export default new ShopService();
