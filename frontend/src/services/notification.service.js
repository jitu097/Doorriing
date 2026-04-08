import api from './api';

export const getNotifications = async () => {
  const payload = await api.get('/notifications');

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
