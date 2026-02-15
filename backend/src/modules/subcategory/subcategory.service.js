import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { validateUUID } from '../../utils/uuid.validator.js';

class SubcategoryService {
    /**
     * Get all subcategories for a specific category
     * Used in Category Page to display subcategories under a category
     */
    async getSubcategoriesByCategory(categoryId) {
        try {
            // Validate UUID format
            validateUUID(categoryId, 'Category ID');

            const { data, error } = await supabase
                .from('subcategories')
                .select('id, category_id, shop_id, name, is_active, created_at')
                .eq('category_id', categoryId)
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) {
                logger.error('Failed to fetch subcategories by category', { error, categoryId });
                throw new Error('Failed to fetch subcategories');
            }

            return data || [];
        } catch (error) {
            // Re-throw validation errors
            if (error.message.includes('Invalid')) {
                throw error;
            }
            logger.error('Error in getSubcategoriesByCategory', { error: error.message, categoryId });
            throw error;
        }
    }

    /**
     * Get subcategory by ID
     */
    async getSubcategoryById(subcategoryId) {
        try {
            validateUUID(subcategoryId, 'Subcategory ID');

            const { data, error } = await supabase
                .from('subcategories')
                .select('id, category_id, shop_id, name, is_active')
                .eq('id', subcategoryId)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('Subcategory not found');
                }
                logger.error('Failed to fetch subcategory', { error, subcategoryId });
                throw new Error('Failed to fetch subcategory');
            }

            return data;
        } catch (error) {
            if (error.message.includes('Invalid')) {
                throw error;
            }
            logger.error('Error in getSubcategoryById', { error: error.message, subcategoryId });
            throw error;
        }
    }

    /**
     * Get all subcategories for a shop
     * Useful for filtering or displaying all subcategories across categories
     */
    async getSubcategoriesByShop(shopId) {
        try {
            validateUUID(shopId, 'Shop ID');

            const { data, error } = await supabase
                .from('subcategories')
                .select('id, category_id, shop_id, name, is_active, created_at')
                .eq('shop_id', shopId)
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) {
                logger.error('Failed to fetch subcategories by shop', { error, shopId });
                throw new Error('Failed to fetch subcategories');
            }

            return data || [];
        } catch (error) {
            if (error.message.includes('Invalid')) {
                throw error;
            }
            logger.error('Error in getSubcategoriesByShop', { error: error.message, shopId });
            throw error;
        }
    }
}

export default new SubcategoryService();
