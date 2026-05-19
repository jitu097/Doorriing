import { api } from './api';

// Client-side cache for home shops (5 minutes)
const HOME_SHOPS_CACHE = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000, // 5 minutes
};

export const getHomeShops = async (limit, forceRefresh = false) => {
	const now = Date.now();
	const hasCache = HOME_SHOPS_CACHE.data && HOME_SHOPS_CACHE.timestamp && (now - HOME_SHOPS_CACHE.timestamp) < HOME_SHOPS_CACHE.TTL;

	const fetchPromise = api.get('/shops/home', {
		params: { limit },
	}).then(response => {
		const result = response.data || { grocery: [], restaurant: [] };
		HOME_SHOPS_CACHE.data = result;
		HOME_SHOPS_CACHE.timestamp = Date.now();
		
		if (typeof window !== 'undefined' && hasCache) {
			window.dispatchEvent(new CustomEvent('home-shops-refreshed', { detail: result }));
		}
		return result;
	}).catch(error => {
		console.error('[shopService] Error fetching home shops:', error);
		if (!hasCache) throw error;
		return HOME_SHOPS_CACHE.data;
	});

	if (hasCache && !forceRefresh) {
		console.log('[shopService] Returning cached home shops instantly (SWR)');
		return HOME_SHOPS_CACHE.data;
	}

	console.log('[shopService] Fetching home shops (cache miss)...');
	return fetchPromise;
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
