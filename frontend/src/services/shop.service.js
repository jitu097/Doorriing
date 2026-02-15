import { api } from './api';

export const getHomeShops = async (limit) => {
	const response = await api.get('/shops/home', {
		params: {
			limit,
		},
	});

	return response.data || { grocery: [], restaurant: [] };
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
