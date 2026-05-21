import { api } from './apiV2';

// Simple client-side cache for home items (5 minutes)
const HOME_ITEMS_CACHE = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000, // 5 minutes
};

let activeHomeItemsPromise = null;

export const itemService = {
    /**
     * Expose cached home items safely
     */
    getCachedHomeItems: () => {
        if (!HOME_ITEMS_CACHE.data) {
            try {
                if (typeof window !== 'undefined') {
                    const cached = localStorage.getItem('doorriing:home-items');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        const now = Date.now();
                        if (parsed && parsed.data && (now - parsed.timestamp < 24 * 60 * 60 * 1000)) {
                            HOME_ITEMS_CACHE.data = parsed.data;
                            HOME_ITEMS_CACHE.timestamp = parsed.timestamp;
                        }
                    }
                }
            } catch (e) {
                console.warn('[itemService] Failed to restore home items from localStorage', e);
            }
        }
        return HOME_ITEMS_CACHE.data || null;
    },

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
    getHomeItems: async (limit, forceRefresh = false) => {
        const now = Date.now();
        const hasCache = HOME_ITEMS_CACHE.data && HOME_ITEMS_CACHE.timestamp && (now - HOME_ITEMS_CACHE.timestamp) < HOME_ITEMS_CACHE.TTL;

        if (hasCache && !forceRefresh) {
            console.log('[itemService] Returning cached home items instantly (SWR)');
            return HOME_ITEMS_CACHE.data;
        }

        if (activeHomeItemsPromise) {
            console.log('[itemService] Reusing active home items fetch promise');
            return activeHomeItemsPromise;
        }

        const config = {
            cache: false // Bypass apiV2 internal cache since we manage it here
        };
        if (typeof limit === 'number' && limit > 0) {
            config.params = { limit };
        }

        console.log('[itemService] Fetching home items (cache miss)...');
        activeHomeItemsPromise = api.get('/home/items', config).then(response => {
            const result = response.data || { grocery_items: [], restaurant_items: [] };
            HOME_ITEMS_CACHE.data = result;
            HOME_ITEMS_CACHE.timestamp = Date.now();
            
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('doorriing:home-items', JSON.stringify({
                        data: result,
                        timestamp: HOME_ITEMS_CACHE.timestamp
                    }));
                }
            } catch (e) {
                console.warn('[itemService] Failed to save home items to localStorage', e);
            }

            // Dispatch event for silent UI refresh
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('home-items-refreshed', { detail: result }));
            }
            return result;
        }).catch(error => {
            console.error('[itemService] Error fetching home items:', error);
            if (!hasCache) throw error;
            return HOME_ITEMS_CACHE.data;
        }).finally(() => {
            activeHomeItemsPromise = null;
        });

        return activeHomeItemsPromise;
    }
};

export default itemService;
