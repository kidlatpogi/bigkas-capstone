import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  IoChevronDown,
  IoBookOutline,
  IoMedalOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoSettingsOutline,
  IoStatsChartOutline,
  IoNotificationsOutline,
} from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import {
  ACHIEVEMENTS_UPDATED_EVENT,
  getClaimableAchievementsCount,
  getClaimableAchievements,
  claimAchievement,
} from '../../utils/achievementClaims';
import { getAssetUrl } from '../../utils/assetUtils';
import './SideNav.css';

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');

const PRIMARY_NAV_ITEMS = [
  { to: ROUTES.ACTIVITY, label: 'Home', icon: IoHomeOutline },
  { to: ROUTES.PROGRESS, label: 'Progress', icon: IoStatsChartOutline },
  { to: ROUTES.FRAMEWORKS, label: 'Learn', icon: IoBookOutline },
  { to: ROUTES.ACHIEVEMENTS, label: 'Achievement', icon: IoMedalOutline },
];

export default function SideNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const displayName = user?.name || user?.nickname || user?.firstName || 'Speaker';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [claimableCount, setClaimableCount] = useState(() => getClaimableAchievementsCount());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifTrayOpen, setNotifTrayOpen] = useState(false);
  const [claimables, setClaimables] = useState(() => getClaimableAchievements());
  const [notifTab, setNotifTab] = useState('all');

  const isSettingsRoute = useMemo(
    () => location.pathname === ROUTES.PROFILE || location.pathname.startsWith(ROUTES.SETTINGS),
    [location.pathname],
  );

  useEffect(() => {
    const sync = () => {
      setClaimableCount(getClaimableAchievementsCount());
      setClaimables(getClaimableAchievements());
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(ACHIEVEMENTS_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(ACHIEVEMENTS_UPDATED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (isSettingsRoute) {
      setSettingsOpen(true);
    }
  }, [isSettingsRoute]);

  // Close tray when clicking outside
  useEffect(() => {
    if (!notifTrayOpen) return undefined;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.side-nav-notif-btn') && !e.target.closest('.side-nav-notif-tray')) {
        setNotifTrayOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifTrayOpen]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleLaunchTutorial = () => {
    navigate(ROUTES.ACTIVITY, {
      state: {
        skywardEntrance: true,
        launchFreeSpeechTutorial: true,
        t: Date.now(),
      },
    });
  };

  const handleClaim = (id) => {
    claimAchievement(id);
    setClaimables(getClaimableAchievements());
    setClaimableCount(getClaimableAchievementsCount());
  };

  const handleClearAll = () => {
    claimAllAchievements();
    setClaimables([]);
    setClaimableCount(0);
  };

  const logoutModal = showLogoutConfirm && typeof document !== 'undefined'
    ? createPortal(
      <div className="side-nav-modal-backdrop" role="presentation" onClick={handleCancelLogout}>
        <div
          className="side-nav-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="side-nav-logout-title"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 id="side-nav-logout-title">Log out?</h3>
          <p>Are you sure you want to log out?</p>
          <div className="side-nav-modal-actions">
            <button type="button" className="side-nav-modal-btn side-nav-modal-btn--cancel" onClick={handleCancelLogout}>
              Cancel
            </button>
            <button type="button" className="side-nav-modal-btn side-nav-modal-btn--confirm" onClick={handleConfirmLogout}>
              Log Out
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  const filteredNotifs = useMemo(() => {
    if (notifTab === 'unread') return claimables;
    return claimables;
  }, [claimables, notifTab]);

  return (
    <aside className="side-nav" aria-label="Main navigation">
      <div className="side-nav-brand">
        <div className="side-nav-brand-main">
          <div className="side-nav-brand-top">
            <img src={bigkasLogo} alt="Bigkas" className="side-nav-brand-logo" />
            <span className="side-nav-brand-text">Bigkas</span>
          </div>
          <span className="side-nav-brand-subtitle">{displayName}</span>
        </div>
        <div className="side-nav-notif-wrapper">
          <button
            type="button"
            className={`side-nav-notif-btn${notifTrayOpen ? ' active' : ''}`}
            onClick={() => setNotifTrayOpen(!notifTrayOpen)}
            aria-label="View notifications"
            aria-expanded={notifTrayOpen}
          >
            <IoNotificationsOutline />
            {claimableCount > 0 ? (
              <span className="side-nav-notif-badge">{claimableCount > 9 ? '9+' : claimableCount}</span>
            ) : null}
          </button>

          {notifTrayOpen && createPortal(
            <div className="side-nav-notif-drawer-root">
              <div 
                className="bigkas-modal-scrim" 
                style={{ '--scrim-z': 2000 }} 
                onClick={() => setNotifTrayOpen(false)} 
                aria-hidden="true" 
              />
              <div className="side-nav-notif-tray side-nav-notif-tray--floating">
                <div className="side-nav-notif-tray-header">
                  <div className="side-nav-notif-tray-header-top">
                    <h3 className="side-nav-notif-tray-title">Notifications</h3>
                    <div className="side-nav-notif-tray-header-actions">
                      {filteredNotifs.length > 0 && (
                        <button 
                          type="button" 
                          className="side-nav-notif-clear-all-btn"
                          onClick={handleClearAll}
                        >
                          Clear All
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="side-nav-notif-close-btn" 
                        onClick={() => setNotifTrayOpen(false)}
                        aria-label="Close notifications"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="side-nav-notif-tabs">
                    <button 
                      type="button" 
                      className={`side-nav-notif-tab${notifTab === 'all' ? ' active' : ''}`}
                      onClick={() => setNotifTab('all')}
                    >
                      All
                    </button>
                    <button 
                      type="button" 
                      className={`side-nav-notif-tab${notifTab === 'unread' ? ' active' : ''}`}
                      onClick={() => setNotifTab('unread')}
                    >
                      Unread
                    </button>
                  </div>
                </div>
                
                <div className="side-nav-notif-tray-list no-scrollbar">
                  {filteredNotifs.length > 0 ? (
                    filteredNotifs.map((item) => (
                      <div key={item.id} className="side-nav-notif-item">
                        <div className="side-nav-notif-item-avatar">
                          <IoMedalOutline />
                        </div>
                        <div className="side-nav-notif-item-content">
                          <div className="side-nav-notif-item-header">
                            <span className="side-nav-notif-item-name">{item.title}</span>
                            <span className="side-nav-notif-item-time">{timeAgo(item.createdAt)}</span>
                            <span className="side-nav-notif-unread-dot" />
                          </div>
                          <p className="side-nav-notif-item-text">{item.description || "You've earned a new achievement! Claim your reward now."}</p>
                          <div className="side-nav-notif-item-actions">
                            <button
                              type="button"
                              className="side-nav-notif-claim-btn"
                              onClick={() => handleClaim(item.id)}
                            >
                              Claim Reward
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="side-nav-notif-empty">
                      <div className="side-nav-notif-empty-icon">
                        <IoNotificationsOutline />
                      </div>
                      <p>No new notifications</p>
                    </div>
                  )}
                </div>
                
                <div className="side-nav-notif-tray-footer">
                  <button 
                    type="button" 
                    className="side-nav-notif-view-all"
                    onClick={() => {
                      setNotifTrayOpen(false);
                      navigate(ROUTES.ACHIEVEMENTS);
                    }}
                  >
                    View all achievements
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      <nav className="side-nav-links">
        {PRIMARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.ACTIVITY}
            className={({ isActive }) => `side-nav-link${isActive ? ' active' : ''}`}
            aria-label={label}
          >
            <Icon className="side-nav-icon" aria-hidden="true" />
            <span className="side-nav-link-label">{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`side-nav-link side-nav-dropdown-trigger${isSettingsRoute ? ' active' : ''}`}
          onClick={() => setSettingsOpen((current) => !current)}
          aria-expanded={settingsOpen}
          aria-controls="side-nav-settings-submenu"
        >
          <IoSettingsOutline className="side-nav-icon" aria-hidden="true" />
          <span className="side-nav-link-label">Settings</span>
          <IoChevronDown
            className={`side-nav-dropdown-chevron${settingsOpen ? ' is-open' : ''}`}
            aria-hidden="true"
          />
        </button>
        {settingsOpen ? (
          <div id="side-nav-settings-submenu" className="side-nav-submenu" role="group" aria-label="Settings submenu">
            <NavLink
              to={ROUTES.PROFILE}
              className={({ isActive }) => `side-nav-sublink${isActive ? ' active' : ''}`}
            >
              Profile
            </NavLink>
            <NavLink
              to={ROUTES.SETTINGS}
              className={({ isActive }) => `side-nav-sublink${isActive ? ' active' : ''}`}
            >
              Preferences
            </NavLink>
          </div>
        ) : null}
      </nav>

      <button type="button" className="side-nav-link side-nav-link--tutorial-launch" onClick={handleLaunchTutorial}>
        <span className="side-nav-link-label">Launch Tutorial (Temp)</span>
      </button>
      
      <button type="button" className="side-nav-logout" onClick={handleLogoutClick}>
        <IoLogOutOutline aria-hidden="true" />
        <span>Log Out</span>
      </button>

      {logoutModal}
    </aside>
  );
}
