import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { cacheManager } from '../../utils/cache.manager.js';

const MAX_RATING_SUMMARY_ITEMS = 200;

const enrichItemsWithRatings = async (items = []) => {
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
    logger.warn('Failed to fetch category item rating summary', { error: error.message });
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
};

class CategoryService {
  /**
   * Get all categories for a specific shop
   * Used in Shop Page to display all available categories
   */
  async getCategoriesByShop(shopId) {
    try {
      const { validateUUID } = await import('../../utils/uuid.validator.js');
      validateUUID(shopId, 'Shop ID');

      // Check cache first
      const cached = cacheManager.get('category', `shop:${shopId}`);
      if (cached) {
        logger.debug('Returning cached categories for shop', { shopId });
        return cached;
      }

      // Fetch categories that belong to this shop
      // Categories are shop-scoped, meaning each shop has its own set of categories
      const { data, error } = await supabase
        .from('categories')
        .select('id, shop_id, name, image_url, sort_order, is_active, created_at')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to fetch categories by shop', { error, shopId });
        // Return empty array instead of throwing to prevent 500 errors
        return [];
      }

      const categories = data || [];

      // Cache for 60 minutes
      cacheManager.set('category', `shop:${shopId}`, categories, 3600);

      return categories;
    } catch (error) {
      // Re-throw validation errors
      if (error.message.includes('Invalid')) {
        throw error;
      }
      logger.error('Error in getCategoriesByShop', { error: error.message, shopId });
      // Return empty array for safety
      return [];
    }
  }

  /**
   * Get grouped categories for the home dashboard.
   * Returns one entry per category name with the number of shops using it.
   */
  async getDashboardCategories() {
    try {
      const cached = cacheManager.get('category', 'dashboard');
      if (cached) {
        logger.debug('Returning cached dashboard categories');
        return cached;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('id, shop_id, name, image_url, is_active, created_at')
        .eq('is_active', true);

      if (error) {
        logger.error('Failed to fetch dashboard categories', { error });
        return [];
      }

      const groupedCategories = new Map();

      (data || []).forEach((category) => {
        const categoryName = typeof category?.name === 'string' ? category.name.trim() : '';
        const shopId = category?.shop_id;

        if (!categoryName || !shopId) {
          return;
        }

        const key = categoryName.toLowerCase();
        if (!groupedCategories.has(key)) {
          groupedCategories.set(key, {
            id: key,
            name: categoryName,
            image_url: category.image_url || null,
            shopIds: new Set(),
          });
        }

        const entry = groupedCategories.get(key);
        entry.shopIds.add(shopId);

        if (!entry.image_url && category.image_url) {
          entry.image_url = category.image_url;
        }
      });

      const dashboardCategories = Array.from(groupedCategories.values())
        .map((category) => ({
          id: category.id,
          name: category.name,
          image_url: category.image_url,
          shop_count: category.shopIds.size,
        }))
        .sort((left, right) => {
          const countDelta = (right.shop_count || 0) - (left.shop_count || 0);
          if (countDelta !== 0) {
            return countDelta;
          }

          return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
        });

      cacheManager.set('category', 'dashboard', dashboardCategories, 1800);

      return dashboardCategories;
    } catch (error) {
      logger.error('Error in getDashboardCategories', { error: error.message });
      return [];
    }
  }

  /**
   * Get all items for a dashboard category name across shops.
   * Used when the Home category strip is clicked.
   */
  async getDashboardCategoryItems(categoryName) {
    try {
      const normalizedName = typeof categoryName === 'string' ? categoryName.trim() : '';

      if (!normalizedName) {
        throw new Error('Category name is required');
      }

      const cacheKey = `dashboard-items:${normalizedName.toLowerCase()}`;
      const cached = cacheManager.get('category', cacheKey);
      if (cached) {
        logger.debug('Returning cached dashboard category items', { categoryName: normalizedName });
        return cached;
      }

      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, image_url, shop_id, is_active')
        .eq('is_active', true)
        .ilike('name', normalizedName);

      if (categoriesError) {
        logger.error('Failed to fetch dashboard category matches', { error: categoriesError, categoryName: normalizedName });
        return {
          category_name: normalizedName,
          items: [],
          matched_categories: [],
          total_items: 0,
        };
      }

      const matchedCategories = (categories || []).filter((category) => category?.id);
      const categoryIds = [...new Set(matchedCategories.map((category) => category.id))];

      if (categoryIds.length === 0) {
        const emptyResult = {
          category_name: normalizedName,
          items: [],
          matched_categories: [],
          total_items: 0,
        };

        cacheManager.set('category', cacheKey, emptyResult, 900);
        return emptyResult;
      }

      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select(`
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
          is_sweets,
          food_type,
          base_quantity,
          unit,
          image_url,
          is_active,
          is_available,
          stock_quantity,
          created_at,
          shops!inner(id, name, business_type, is_active, is_open)
        `)
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (itemsError) {
        logger.error('Failed to fetch dashboard category items', { error: itemsError, categoryName: normalizedName, categoryIds });
        return {
          category_name: normalizedName,
          items: [],
          matched_categories: matchedCategories,
          total_items: 0,
        };
      }

      const ratedItems = await enrichItemsWithRatings(items || []);

      const result = {
        category_name: normalizedName,
        items: ratedItems,
        matched_categories: matchedCategories.map((category) => ({
          id: category.id,
          name: category.name,
          image_url: category.image_url,
          shop_id: category.shop_id,
        })),
        total_items: ratedItems.length,
      };

      cacheManager.set('category', cacheKey, result, 900);

      return result;
    } catch (error) {
      logger.error('Error in getDashboardCategoryItems', { error: error.message, categoryName });
      return {
        category_name: typeof categoryName === 'string' ? categoryName.trim() : '',
        items: [],
        matched_categories: [],
        total_items: 0,
      };
    }
  }

  /**
   * Get category details with subcategories and items
   * This is the critical function for the Category Page
   * 
   * Returns:
   * - Category details
   * - All subcategories (if any)
   * - Items grouped by:
   *   a) Subcategory (if subcategories exist)
   *   b) Direct category items (if no subcategories)
   */
  async getCategoryWithDetails(categoryId, shopId) {
    try {
      const { validateUUIDs } = await import('../../utils/uuid.validator.js');
      validateUUIDs({ 'Category ID': categoryId, 'Shop ID': shopId });

      logger.debug('getCategoryWithDetails: Starting fetch', { categoryId, shopId });

      // Step 1, 2, 3: Fetch category details, subcategories, and items in parallel to eliminate N+1 latency
      const [categoryRes, subcategoriesRes, itemsRes] = await Promise.all([
        supabase
          .from('categories')
          .select('id, shop_id, name, image_url, is_active')
          .eq('id', categoryId)
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .single(),
        supabase
          .from('subcategories')
          .select('id, category_id, name, image_url, is_active')
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('items')
          .select(`
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
            is_sweets,
            food_type,
            has_variants,
            image_url,
            is_active,
            is_available,
            stock_quantity,
            base_quantity,
            unit
          `)
          .eq('shop_id', shopId)
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .eq('is_available', true)
          .order('name', { ascending: true })
      ]);

      const { data: category, error: categoryError } = categoryRes;
      const { data: subcategories, error: subcategoryError } = subcategoriesRes;
      const { data: items, error: itemsError } = itemsRes;

      if (categoryError) {
        if (categoryError.code === 'PGRST116') {
          // Log for debugging
          logger.warn('Category not found for shop', {
            categoryId,
            shopId,
            error_code: categoryError.code,
          });
          throw new Error('Category not found');
        }
        logger.error('Failed to fetch category', { error: categoryError, categoryId, shopId });
        throw new Error('Failed to fetch category');
      }

      if (subcategoryError) {
        logger.error('Failed to fetch subcategories', { error: subcategoryError, categoryId });
        throw new Error('Failed to fetch subcategories');
      }

      if (itemsError) {
        logger.error('Failed to fetch items', { error: itemsError, categoryId, shopId });
        throw new Error('Failed to fetch items');
      }

      logger.debug('Items fetched', { categoryId, itemCount: items?.length || 0 });

      const ratedItems = await enrichItemsWithRatings(items || []);

      // Step 4: Group items based on whether subcategories exist
      let groupedItems;

      if (subcategories && subcategories.length > 0) {
        // Case A: Subcategories exist - group items under each subcategory
        // Each subcategory should include its items
        groupedItems = subcategories.map(subcategory => ({
          subcategory_id: subcategory.id,
          subcategory_name: subcategory.name,
          subcategory_description: subcategory.description,
          items: ratedItems.filter(item => item.subcategory_id === subcategory.id),
        }));

        // Also include items that belong to the category but NOT to any subcategory
        // These are items where subcategory_id is NULL
        const ungroupedItems = ratedItems.filter(item => item.subcategory_id === null);
        if (ungroupedItems.length > 0) {
          groupedItems.push({
            subcategory_id: null,
            subcategory_name: 'Other Items',
            subcategory_description: 'Items without a specific subcategory',
            items: ungroupedItems,
          });
        }
      } else {
        // Case B: No subcategories - return items directly under category
        // All items should have subcategory_id = NULL in this case
        groupedItems = [{
          subcategory_id: null,
          subcategory_name: null,
          subcategory_description: null,
          items: ratedItems,
        }];
      }

      return {
        category: {
          id: category.id,
          shop_id: category.shop_id,
          name: category.name,
          image_url: category.image_url,
        },
        subcategories: subcategories || [],
        grouped_items: groupedItems,
        total_items: items.length,
      };
    } catch (error) {
      if (error.message.includes('Invalid')) {
        throw error;
      }
      logger.error('Error in getCategoryWithDetails', { error: error.message, categoryId, shopId });
      throw error;
    }
  }

  /**
   * Get all subcategories for a category
   * Helper function - can be used independently if needed
   */
  async getSubcategoriesByCategory(categoryId) {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, category_id, name, image_url, description, display_order, is_active')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to fetch subcategories', { error, categoryId });
        throw new Error('Failed to fetch subcategories');
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getSubcategoriesByCategory', { error: error.message });
      throw error;
    }
  }
}

export default new CategoryService();
