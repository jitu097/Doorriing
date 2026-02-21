import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';

class CategoryService {
  /**
   * Get all categories for a specific shop
   * Used in Shop Page to display all available categories
   */
  async getCategoriesByShop(shopId) {
    try {
      const { validateUUID } = await import('../../utils/uuid.validator.js');
      validateUUID(shopId, 'Shop ID');

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

      return data || [];
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

      // Step 1: Fetch category details
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id, shop_id, name, image_url, is_active')
        .eq('id', categoryId)
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .single();

      if (categoryError) {
        if (categoryError.code === 'PGRST116') {
          throw new Error('Category not found');
        }
        logger.error('Failed to fetch category', { error: categoryError, categoryId });
        throw new Error('Failed to fetch category');
      }

      // Step 2: Fetch subcategories for this category (if any)
      // Subcategories are OPTIONAL - a category may have zero subcategories
      const { data: subcategories, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('id, category_id, name, image_url, is_active')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (subcategoryError) {
        logger.error('Failed to fetch subcategories', { error: subcategoryError, categoryId });
        throw new Error('Failed to fetch subcategories');
      }

      // Step 3: Fetch items for this category
      // Items must be filtered by: shop_id, category_id, is_active, is_available
      // IMPORTANT: We fetch ALL items for this category, regardless of subcategory
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, shop_id, category_id, subcategory_id, name, description, price, image_url, is_active, is_available, stock_quantity')
        .eq('shop_id', shopId)
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .eq('is_available', true)
        .order('name', { ascending: true });

      if (itemsError) {
        logger.error('Failed to fetch items', { error: itemsError, categoryId });
        throw new Error('Failed to fetch items');
      }

      // Step 4: Group items based on whether subcategories exist
      let groupedItems;

      if (subcategories && subcategories.length > 0) {
        // Case A: Subcategories exist - group items under each subcategory
        // Each subcategory should include its items
        groupedItems = subcategories.map(subcategory => ({
          subcategory_id: subcategory.id,
          subcategory_name: subcategory.name,
          subcategory_description: subcategory.description,
          items: items.filter(item => item.subcategory_id === subcategory.id),
        }));

        // Also include items that belong to the category but NOT to any subcategory
        // These are items where subcategory_id is NULL
        const ungroupedItems = items.filter(item => item.subcategory_id === null);
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
          items: items,
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
