import { api } from './api';

export const getCategoriesByShop = async (shopId) => {
  if (!shopId) {
    throw new Error('shopId is required');
  }

  const response = await api.get(`/categories/shop/${shopId}`);
  return response.data || [];
};

export const getCategoryWithDetails = async (categoryId, shopId) => {
  if (!categoryId || !shopId) {
    throw new Error('categoryId and shopId are required');
  }

  const response = await api.get(`/categories/${categoryId}`, {
    params: {
      shop_id: shopId,
    },
  });

  return response.data;
};

export const getSubcategoriesByCategory = async (categoryId) => {
  if (!categoryId) {
    throw new Error('categoryId is required');
  }

  const response = await api.get(`/categories/${categoryId}/subcategories`);
  return response.data || [];
};

export default {
  getCategoriesByShop,
  getCategoryWithDetails,
  getSubcategoriesByCategory,
};
