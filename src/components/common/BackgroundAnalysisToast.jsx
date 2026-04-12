import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildRoute } from '../../utils/constants';
import {
  BACKGROUND_ANALYSIS_NOTIFICATION_EVENT,
  consumeNextBackgroundAnalysisNotification,
} from '../../utils/backgroundAnalysisNotifications';
import './BackgroundAnalysisToast.css';

const AUTO_DISMISS_MS = 7000;

function BackgroundAnalysisToast() {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);

  const clearToastTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const showToast = useCallback((item) => {
    if (!item) return;
    setNotification(item);
    clearToastTimer();
    timerRef.current = setTimeout(() => {
      setNotification(null);
      timerRef.current = null;
    }, AUTO_DISMISS_MS);
  }, [clearToastTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    try {
      const initial = consumeNextBackgroundAnalysisNotification();
      if (initial) {
        // Use setTimeout to avoid synchronous setState in effect
        const timer = setTimeout(() => {
          showToast(initial);
        }, 0);
        return () => clearTimeout(timer);
      }

      const handler = (event) => {
        if (event?.detail) {
          showToast(event.detail);
        }
      };

      window.addEventListener(BACKGROUND_ANALYSIS_NOTIFICATION_EVENT, handler);
      return () => {
        window.removeEventListener(BACKGROUND_ANALYSIS_NOTIFICATION_EVENT, handler);
        clearToastTimer();
      };
    } catch (error) {
      console.warn('Error initializing background analysis toast:', error);
      return () => clearToastTimer();
    }
  }, [clearToastTimer, showToast]);

  if (!notification) return null;

  const toneClass = notification.status === 'error'
    ? 'error'
    : notification.status === 'success'
      ? 'success'
      : 'info';

  return (
    <div className={`background-analysis-toast ${toneClass}`} role="status" aria-live="polite">
      <div className="background-analysis-toast-body">
        <p className="background-analysis-toast-title">{notification.title}</p>
        {notification.message ? (
          <p className="background-analysis-toast-message">{notification.message}</p>
        ) : null}
      </div>

      <div className="background-analysis-toast-actions">
        {notification.status === 'success' && notification.sessionId ? (
          <button
            type="button"
            className="background-analysis-toast-link"
            onClick={() => {
              navigate(buildRoute.sessionResult(notification.sessionId));
              setNotification(null);
              clearToastTimer();
            }}
          >
            View
          </button>
        ) : null}
        <button
          type="button"
          className="background-analysis-toast-close"
          onClick={() => {
            setNotification(null);
            clearToastTimer();
          }}
          aria-label="Dismiss notification"
        >
          x
        </button>
      </div>
    </div>
  );
}

export default BackgroundAnalysisToast;
