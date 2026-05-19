import { api } from './api';

// Client-side cache for home shops (5 minutes)
const HOME_SHOPS_CACHE = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000, // 5 minutes
};

const normalizeHomeShopsPayload = (payload) => ({
	grocery: Array.isArray(payload?.grocery) ? payload.grocery : [],
	restaurant: Array.isArray(payload?.restaurant) ? payload.restaurant : [],
});

const hasRenderableHomeShops = (payload) => (
	(Array.isArray(payload?.grocery) && payload.grocery.length > 0)
	|| (Array.isArray(payload?.restaurant) && payload.restaurant.length > 0)
);

const getCachedHomeShopsPayload = () => {
	if (!HOME_SHOPS_CACHE.data) {
		return null;
	}

	return normalizeHomeShopsPayload(HOME_SHOPS_CACHE.data);
};

export const getHomeShops = async (limit, forceRefresh = false) => {
	const now = Date.now();
	const cachedPayload = getCachedHomeShopsPayload();
	const hasCache = Boolean(cachedPayload && HOME_SHOPS_CACHE.timestamp && (now - HOME_SHOPS_CACHE.timestamp) < HOME_SHOPS_CACHE.TTL);

	const fetchPromise = api.get('/shops/home', {
		params: { limit },
	}).then(response => {
		const result = normalizeHomeShopsPayload(response.data);

		if (hasRenderableHomeShops(result)) {
			HOME_SHOPS_CACHE.data = result;
			HOME_SHOPS_CACHE.timestamp = Date.now();

			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('home-shops-refreshed', { detail: result }));
			}

			return result;
		}

		if (cachedPayload) {
			console.warn('[shopService] Ignoring empty home shops payload and keeping cached data');
			return cachedPayload;
		}

		return result;
	}).catch(error => {
		console.error('[shopService] Error fetching home shops:', error);
		if (!hasCache) throw error;
		return cachedPayload;
	});

	if (hasCache && !forceRefresh) {
		console.log('[shopService] Returning cached home shops instantly (SWR)');
		return cachedPayload;
	}

	console.log('[shopService] Fetching home shops (cache miss)...');
	return fetchPromise;
};

export const getCachedHomeShops = () => getCachedHomeShopsPayload();

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
	getCachedHomeShops,
	getShopsByBusinessType,
	getShopById,
};
