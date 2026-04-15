import api from './api';

export const getNotifications = async (pageSize = 100) => {
  const payload = await api.get('/notifications', {
    params: {
      page_size: pageSize,
    },
  });

  return {
    notifications: Array.isArray(payload?.data) ? payload.data : [],
    pagination: payload?.pagination || null,
  };
};

export const markAsRead = async (id) => {
  try {
    await api.patch(`/notifications/${id}`);
    return true;
  } catch {
    // Current backend route is PUT /api/notifications/:id/read
    await api.put(`/notifications/${id}/read`, {});
    return true;
  }
};

export const markAllAsRead = async () => {
  await api.put('/notifications/read-all', {});
  return true;
};
