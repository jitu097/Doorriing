import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { getNotificationTarget } from '../utils/notificationNavigation';
import './NotificationBell.css';

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return '';

  const date = new Date(dateValue);
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(diffInSec) || diffInSec < 0) return 'Just now';
  if (diffInSec < 60) return `${diffInSec}s ago`;

  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin} min ago`;

  const diffInHrs = Math.floor(diffInMin / 60);
  if (diffInHrs < 24) return `${diffInHrs}h ago`;

  const diffInDays = Math.floor(diffInHrs / 24);
  return `${diffInDays}d ago`;
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const { recentNotifications, unreadCount, markAsRead } = useNotification();

  const hasNotifications = useMemo(
    () => Array.isArray(recentNotifications) && recentNotifications.length > 0,
    [recentNotifications]
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
      } catch {
        // Keep navigation responsive even if mark-read request fails.
      }
    }

    setIsOpen(false);

    const target = getNotificationTarget(notification);
    if (target) {
      navigate(target);
    }
  };

  return (
    <div className="notification-bell-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a5 5 0 0 0-5 5v2.6c0 .9-.3 1.8-.9 2.5L4.6 15a1 1 0 0 0 .8 1.6h13.2a1 1 0 0 0 .8-1.6l-1.5-1.9a4 4 0 0 1-.9-2.5V8a5 5 0 0 0-5-5z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4>Notifications</h4>
          </div>

          {!hasNotifications && <div className="notification-empty">No notifications</div>}

          {hasNotifications && (
            <ul className="notification-list">
              {recentNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <p className="notification-title">{notification.title}</p>
                  <p className="notification-message">{notification.message}</p>
                  <span className="notification-time">{formatRelativeTime(notification.created_at)}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="notification-view-all"
            onClick={() => {
              setIsOpen(false);
              navigate('/notifications');
            }}
          >
            View All
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
