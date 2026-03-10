import { api } from './api';

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
     * @param {number} [limit]
     */
    getHomeItems: async (limit) => {
        const config = {};

        if (typeof limit === 'number' && limit > 0) {
            config.params = { limit };
        }

        return api.get('/home/items', config);
    }
};

export default itemService;
