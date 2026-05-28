import { api } from './apiV2';

export const getCategoriesByShop = async (shopId) => {
  if (!shopId) {
    throw new Error('shopId is required');
  }

  const response = await api.get(`/categories/shop/${shopId}`);
  return response.data || [];
};

export const getDashboardCategories = async () => {
  const response = await api.get('/categories/dashboard');
  return response.data || [];
};

export const getDashboardCategoryItems = async (categoryName) => {
  if (!categoryName) {
    throw new Error('categoryName is required');
  }

  const response = await api.get('/categories/dashboard/items', {
    params: {
      name: categoryName,
    },
  });

  return response.data || { items: [] };
};

export const getCategoryWithDetails = async (categoryId, shopId) => {
  if (!categoryId || !shopId) {
    throw new Error('categoryId and shopId are required');
  }

  try {
    const response = await api.get(`/categories/${categoryId}`, {
      params: {
        shop_id: shopId,
      },
    });

    // Return unwrapped data (response.data contains the actual category details)
    return response.data || { grouped_items: [] };
  } catch (error) {
    console.error('Failed to fetch category details:', {
      categoryId,
      shopId,
      status: error.status,
      message: error.message,
      payload: error.payload,
    });

    // Provide more helpful error messages
    if (error.status === 404) {
      throw new Error(
        `Category "${categoryId}" not found for this restaurant. It may have been removed or deactivated.`
      );
    }
    throw error;
  }
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
  getDashboardCategories,
  getDashboardCategoryItems,
  getCategoryWithDetails,
  getSubcategoriesByCategory,
};
