import { api } from './api';

// Simple client-side cache for home items (5 minutes)
const HOME_ITEMS_CACHE = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000, // 5 minutes
};

export const itemService = {
    /**
     * Get items by shop ID
     * @param {string} shopId 
     * @param {object} filters - category_id, subcategory_id, search, in_stock_only
     * @param {number} page 
     * @param {number} pageSize 
     */
    getItemsByShop: async (shopId, filters = {}, page = 1, pageSize = 20) => {
        const params = {
            ...filters,
            page,
            page_size: pageSize
        };
        return api.get(`/items/shop/${shopId}`, { params });
    },

    /**
     * Get item by ID
     * @param {string} itemId 
     */
    getItemById: async (itemId) => {
        return api.get(`/items/${itemId}`);
    },

    /**
     * Get items by category
     * @param {string} categoryId 
     * @param {number} page 
     * @param {number} pageSize 
     */
    getItemsByCategory: async (categoryId, page = 1, pageSize = 20) => {
        return api.get(`/items/category/${categoryId}`, {
            params: { page, page_size: pageSize }
        });
    },

    /**
     * Get items by subcategory
     * @param {string} subcategoryId 
     * @param {string} shopId 
     * @param {number} page 
     * @param {number} pageSize 
     */
    getItemsBySubcategory: async (subcategoryId, shopId, page = 1, pageSize = 20) => {
        return api.get(`/items/subcategory/${subcategoryId}`, {
            params: { shop_id: shopId, page, page_size: pageSize }
        });
    },

    /**
     * Get grouped home items (grocery + restaurant)
     * With client-side caching for performance
     * @param {number} [limit]
     */
    getHomeItems: async (limit) => {
        const now = Date.now();
        
        // Check if cache is still valid
        if (
            HOME_ITEMS_CACHE.data && 
            HOME_ITEMS_CACHE.timestamp &&
            (now - HOME_ITEMS_CACHE.timestamp) < HOME_ITEMS_CACHE.TTL
        ) {
            console.log('[itemService] Returning cached home items');
            return HOME_ITEMS_CACHE.data;
        }

        const config = {};
        if (typeof limit === 'number' && limit > 0) {
            config.params = { limit };
        }

        console.log('[itemService] Fetching home items (cache miss)...');
        const startTime = performance.now();
        
        try {
            const response = await api.get('/home/items', config);
            const result = response.data || { grocery_items: [], restaurant_items: [] };
            
            const fetchTime = performance.now() - startTime;
            console.log(`[itemService] Home items fetched in ${fetchTime.toFixed(2)}ms`);
            console.log(`[itemService] Grocery: ${result.grocery_items?.length || 0} items, Restaurant: ${result.restaurant_items?.length || 0} items`);
            
            // Cache the result
            HOME_ITEMS_CACHE.data = result;
            HOME_ITEMS_CACHE.timestamp = now;
            
            return result;
        } catch (error) {
            console.error('[itemService] Error fetching home items:', error);
            // Return cached data if available, even if stale
            if (HOME_ITEMS_CACHE.data) {
                console.log('[itemService] Returning stale cache due to error');
                return HOME_ITEMS_CACHE.data;
            }
            throw error;
        }
    }
};

export default itemService;
