import { api } from './api';

export const getPlatformSettings = async () => {
  const payload = await api.get('/platform-settings');
  return payload?.data ?? payload;
};
