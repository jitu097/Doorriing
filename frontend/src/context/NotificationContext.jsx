import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getNotifications, markAllAsRead, markAsRead } from '../services/notification.service';
import { cancelAfterFrame, isPageVisible, runAfterFrame } from '../utils/scheduler';

const NotificationContext = createContext(null);

const getNotificationSignature = (items = []) => (
  items.map((item) => `${item.id}:${item.is_read ? 1 : 0}:${item.updated_at || item.created_at || ''}`).join('|')
);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const notificationsRef = useRef(notifications);
  const inFlightRef = useRef(null);
  const scheduledFetchRef = useRef(null);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async (silent = false) => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    if (!silent) setLoading(true);
    setError('');

    const request = (async () => {
      const result = await getNotifications();
      const newNotifications = result.notifications || [];
      setNotifications(prev => {
        if (getNotificationSignature(prev) === getNotificationSignature(newNotifications)) {
          return prev;
        }
        return newNotifications;
      });
    })();

    inFlightRef.current = request;

    try {
      await request;
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
      inFlightRef.current = null;
      if (!silent) setLoading(false);
    }
  }, []);

  const scheduleSilentFetch = useCallback(() => {
    if (!isPageVisible()) return;
    if (scheduledFetchRef.current) return;

    scheduledFetchRef.current = runAfterFrame(() => {
      scheduledFetchRef.current = null;
      fetchNotifications(true);
    });
  }, [fetchNotifications]);

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
    const previousNotifications = notificationsRef.current;

    try {
      await markAllAsRead();
    } catch (err) {
      setNotifications(previousNotifications);
      throw err;
    }
  }, []);

  useEffect(() => {
    let interval = null;
    let failureCount = 0;
    const maxConsecutiveFailures = 3;

    const performPoll = async () => {
      try {
        await fetchNotifications(true);
        failureCount = 0; // Reset on success
      } catch (err) {
        failureCount++;
        console.warn(`Notification fetch failed (${failureCount}/${maxConsecutiveFailures})`, err.message);
        
        // Stop polling if we've failed too many times
        if (failureCount >= maxConsecutiveFailures) {
          stopPolling();
          setError('Notification service temporarily unavailable');
        }
      }
    };

    const startPolling = () => {
      if (interval) return;
      interval = window.setInterval(performPoll, 30000);
    };

    const stopPolling = () => {
      if (interval) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    const initFetch = async () => {
      try {
        await fetchNotifications();
        failureCount = 0;
        if (document.visibilityState === 'visible') {
          startPolling();
        }
      } catch (err) {
        console.error('Initial notification fetch failed:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[NotificationContext] Tab visible, immediate check and resume poll');
        scheduleSilentFetch();
        startPolling();
      } else {
        console.log('[NotificationContext] Tab hidden, stop poll');
        stopPolling();
      }
    };

    initFetch();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      if (scheduledFetchRef.current) {
        cancelAfterFrame(scheduledFetchRef.current);
        scheduledFetchRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotifications, scheduleSilentFetch]);

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
