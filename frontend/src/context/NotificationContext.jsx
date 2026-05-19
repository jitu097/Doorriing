import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getNotifications, markAllAsRead, markAsRead } from '../services/notification.service';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');

    try {
      const result = await getNotifications();
      const newNotifications = result.notifications || [];
      setNotifications(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newNotifications)) {
          return prev;
        }
        return newNotifications;
      });
    } catch (err) {
      // Log detailed error for debugging
      console.error('Notification fetch error:', {
        message: err.message,
        status: err.status,
        error: err,
      });
      
      // Set user-friendly error message
      const errorMsg = err.status === 401 
        ? 'Please sign in to view notifications'
        : err.status === 403
        ? 'You do not have permission to view notifications'
        : err.status === 0 || err.message?.includes('Failed to fetch')
        ? 'Backend is currently unavailable. Please refresh the page.'
        : err.message || 'Failed to load notifications';
      
      setError(errorMsg);
      
      // Don't crash the app - gracefully set empty notifications
      setNotifications([]);
    } finally {
      if (!silent) setLoading(false);
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

  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    const previousNotifications = notifications;

    try {
      await markAllAsRead();
    } catch (err) {
      setNotifications(previousNotifications);
      throw err;
    }
  }, [notifications]);

  useEffect(() => {
    let interval;
    let failureCount = 0;
    const maxConsecutiveFailures = 3;

    const initFetch = async () => {
      await fetchNotifications();
      failureCount = 0; // Reset on success
      
      // Poll every 30 seconds (reduced from 15 to be less aggressive)
      interval = window.setInterval(async () => {
        try {
          await fetchNotifications(true);
        } catch (err) {
          failureCount++;
          console.warn(`Notification fetch failed (${failureCount}/${maxConsecutiveFailures})`, err.message);
          
          // Stop polling if we've failed too many times
          if (failureCount >= maxConsecutiveFailures) {
            clearInterval(interval);
            setError('Notification service temporarily unavailable');
          }
        }
      }, 30000);
    };

    initFetch();

    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    recentNotifications: notifications.slice(0, 5),
  }), [notifications, unreadCount, loading, error, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
