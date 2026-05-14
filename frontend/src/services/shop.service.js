import { api } from './api';

// Client-side cache for home shops (5 minutes)
const HOME_SHOPS_CACHE = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000, // 5 minutes
};

export const getHomeShops = async (limit) => {
	const now = Date.now();
	
	// Check cache first
	if (
		HOME_SHOPS_CACHE.data &&
		HOME_SHOPS_CACHE.timestamp &&
		(now - HOME_SHOPS_CACHE.timestamp) < HOME_SHOPS_CACHE.TTL
	) {
		console.log('[shopService] Returning cached home shops');
		return HOME_SHOPS_CACHE.data;
	}

	console.log('[shopService] Fetching home shops (cache miss)...');
	const startTime = performance.now();
	
	try {
		const response = await api.get('/shops/home', {
			params: {
				limit,
			},
		});

		const result = response.data || { grocery: [], restaurant: [] };
		const fetchTime = performance.now() - startTime;
		console.log(`[shopService] Home shops fetched in ${fetchTime.toFixed(2)}ms`);

		// Cache the result
		HOME_SHOPS_CACHE.data = result;
		HOME_SHOPS_CACHE.timestamp = now;

		return result;
	} catch (error) {
		console.error('[shopService] Error fetching home shops:', error);
		// Return cached data if available, even if stale
		if (HOME_SHOPS_CACHE.data) {
			console.log('[shopService] Returning stale cache due to error');
			return HOME_SHOPS_CACHE.data;
		}
		throw error;
	}
};

export const getShopsByBusinessType = async (businessType, params = {}) => {
	const response = await api.get(`/shops/browse/${businessType}`, {
		params,
	});

	return {
		shops: response.data || [],
		pagination: response.pagination,
	};
};

export const getShopById = async (shopId, { includeCategories = false } = {}) => {
	const response = await api.get(`/shops/${shopId}`, {
		params: {
			include_categories: includeCategories ? 'true' : undefined,
		},
	});

	return response.data;
};

export default {
	getHomeShops,
	getShopsByBusinessType,
	getShopById,
};
