import { useCallback, useEffect, useRef, useState } from 'react';
import { IoNotifications, IoNotificationsOutline, IoTrashOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { buildRoute, ROUTES } from '../../utils/constants';
import {
  BACKGROUND_ANALYSIS_NOTIFICATION_EVENT,
  getAllBackgroundAnalysisNotifications,
  clearBackgroundAnalysisNotification,
  clearAllBackgroundAnalysisNotifications,
} from '../../utils/backgroundAnalysisNotifications';
import './NotificationCenter.css';

const MAX_VISIBLE_NOTIFICATIONS = 5;

function formatTimeAgo(isoString) {
  try {
    const createdTime = new Date(isoString);
    const now = new Date();
    const diffMs = now - createdTime;

    // Less than 1 minute
    if (diffMs < 60_000) {
      return 'Just now';
    }

    // Minutes
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }

    // Hours
    const diffHours = Math.floor(diffMs / (60_000 * 60));
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }

    // Days
    const diffDays = Math.floor(diffMs / (60_000 * 60 * 24));
    if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    // Fallback to date
    return createdTime.toLocaleDateString();
  } catch {
    return 'Unknown time';
  }
}

function getStatusColor(status) {
  if (status === 'error') return '#ef4444';
  if (status === 'success') return '#22c55e';
  return '#3b82f6'; // info
}

function NotificationCenter({ label, railMode = false }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const loadNotifications = useCallback(() => {
    try {
      const allNotifs = getAllBackgroundAnalysisNotifications();
      setNotifications(allNotifs.slice(0, MAX_VISIBLE_NOTIFICATIONS));
    } catch (error) {
      console.warn('Error loading notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load initial notifications asynchronously
    const timer = setTimeout(() => {
      loadNotifications();
    }, 0);

    const handler = () => {
      loadNotifications();
    };

    window.addEventListener(BACKGROUND_ANALYSIS_NOTIFICATION_EVENT, handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(BACKGROUND_ANALYSIS_NOTIFICATION_EVENT, handler);
    };
  }, [loadNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleDismiss = (notificationId) => {
    try {
      clearBackgroundAnalysisNotification(notificationId);
      loadNotifications();
    } catch (error) {
      console.warn('Error dismissing notification:', error);
    }
  };

  const handleClearAll = () => {
    try {
      clearAllBackgroundAnalysisNotifications();
      loadNotifications();
    } catch (error) {
      console.warn('Error clearing notifications:', error);
    }
  };

  const unreadCount = notifications.length;

  const canOpenNotification = (notif) => notif?.status === 'success' && Boolean(notif?.sessionId);

  const handleOpenNotification = (notif) => {
    if (!canOpenNotification(notif)) return;
    navigate(buildRoute.sessionResult(notif.sessionId), {
      state: {
        source: 'notification',
        backTo: ROUTES.DASHBOARD,
        notificationId: notif.id,
      },
    });
    setIsOpen(false);
  };

  return (
    <div className={`notification-center-wrapper${railMode ? ' notification-center-wrapper--rail' : ''}`}>
      <button
        type="button"
        className={`notification-center-bell${railMode ? ' notification-center-bell--rail' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label={`Notifications (${unreadCount})`}
        aria-expanded={isOpen}
      >
        {isOpen ? <IoNotifications size={20} /> : <IoNotificationsOutline size={20} />}
        {label ? <span className="notification-center-label">{label}</span> : null}
        {unreadCount > 0 && (
          <span className="notification-center-dot" />
        )}
      </button>

      {isOpen && (
        <div className="notification-center-panel" ref={panelRef}>
          <div className="notification-center-header">
            <h3>{`Notification (${unreadCount})`}</h3>
            <div className="notification-center-header-actions">
              <button
                type="button"
                className="notification-center-clear-all"
                onClick={handleClearAll}
                aria-label="Clear notifications"
              >
                <IoTrashOutline size={16} />
              </button>
            </div>
          </div>

          <div className="notification-center-list">
            {notifications.length === 0 ? (
              <div className="notification-center-empty">
                <IoNotifications className="notification-center-empty-icon" aria-hidden="true" />
                <p>No notification yet!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-center-item ${notif.status}`}
                  onClick={() => handleOpenNotification(notif)}
                  onKeyDown={(event) => {
                    if (!canOpenNotification(notif)) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleOpenNotification(notif);
                    }
                  }}
                  role={canOpenNotification(notif) ? 'button' : undefined}
                  tabIndex={canOpenNotification(notif) ? 0 : -1}
                  aria-label={canOpenNotification(notif) ? `Open analysis for ${notif.title}` : undefined}
                >
                  <div
                    className="notification-center-indicator"
                    style={{ backgroundColor: getStatusColor(notif.status) }}
                  />
                  <div className="notification-center-content">
                    <p className="notification-center-title">{notif.title}</p>
                    {notif.message && (
                      <p className="notification-center-message">{notif.message}</p>
                    )}
                    <span className="notification-center-time">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="notification-center-remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDismiss(notif.id);
                    }}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
