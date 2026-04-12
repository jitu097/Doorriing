import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { getNotificationTarget } from '../utils/notificationNavigation';
import './Notifications.css';

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return '';

  const createdAt = new Date(dateValue);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);

  if (Number.isNaN(diffInSeconds) || diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const mins = Math.floor(diffInSeconds / 60);
  if (mins < 60) return `${mins} mins ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loading, error, markAsRead, fetchNotifications } = useNotification();
  const [actionError, setActionError] = useState('');

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [notifications]
  );

  const handleNotificationClick = async (notification) => {
    setActionError('');

    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        setActionError(err.message || 'Failed to mark notification as read');
      }
    }

    const target = getNotificationTarget(notification);
    if (target) {
      navigate(target);
    }
  };

  return (
    <section className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay updated with your latest order and account activity</p>
        </div>
        <button type="button" onClick={fetchNotifications} className="notifications-refresh-btn">
          Refresh
        </button>
      </div>

      {actionError && <p className="notifications-error">{actionError}</p>}
      {error && <p className="notifications-error">{error}</p>}

      {loading && <p className="notifications-loading">Loading notifications...</p>}

      {!loading && sortedNotifications.length === 0 && (
        <div className="notifications-empty">No notifications</div>
      )}

      <div className="notifications-list-wrap">
        {sortedNotifications.map((notification) => (
          <article
            key={notification.id}
            className={`notifications-card ${notification.is_read ? 'read' : 'unread'}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="notifications-card-top">
              <h3>{notification.title}</h3>
              <span>{formatRelativeTime(notification.created_at)}</span>
            </div>
            <p>{notification.message}</p>
            {!notification.is_read && <strong className="notifications-pill">Unread</strong>}
          </article>
        ))}
      </div>
    </section>
  );
};

export default Notifications;
