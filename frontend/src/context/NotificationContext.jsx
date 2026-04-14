import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getNotifications, markAsRead } from '../services/notification.service';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getNotifications();
      setNotifications(result.notifications || []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );

    try {
      await markAsRead(id);
    } catch (err) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: false } : item))
      );
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const interval = window.setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead: markNotificationAsRead,
    recentNotifications: notifications.slice(0, 5),
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
