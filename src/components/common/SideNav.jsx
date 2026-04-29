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
import './SideNav.css';

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
      },
    });
  };

  const handleClaim = (id) => {
    claimAchievement(id);
    // sync will be triggered by event
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

  return (
    <aside className="side-nav" aria-label="Main navigation">
      <div className="side-nav-brand">
        <div className="side-nav-brand-main">
          <span className="side-nav-brand-text">Bigkas</span>
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
              <div className="side-nav-notif-drawer-scrim" onClick={() => setNotifTrayOpen(false)} />
              <div className="side-nav-notif-tray side-nav-notif-tray--drawer">
                <div className="side-nav-notif-tray-head">
                  <div className="side-nav-notif-tray-head-main">
                    <h4>Notifications</h4>
                    <button type="button" className="side-nav-notif-tray-close" onClick={() => setNotifTrayOpen(false)}>×</button>
                  </div>
                </div>
                <div className="side-nav-notif-tray-list no-scrollbar">
                  {claimables.length > 0 ? (
                    claimables.map((item) => (
                      <div key={item.id} className="side-nav-notif-item">
                        <div className="side-nav-notif-item-content">
                          <p className="side-nav-notif-item-title">{item.title}</p>
                          <p className="side-nav-notif-item-desc">Ready to claim</p>
                        </div>
                        <button
                          type="button"
                          className="side-nav-notif-item-btn"
                          onClick={() => handleClaim(item.id)}
                        >
                          Claim
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="side-nav-notif-empty">
                      <p>No new notifications</p>
                    </div>
                  )}
                </div>
                <div className="side-nav-notif-tray-foot">
                  <button type="button" onClick={() => {
                    setNotifTrayOpen(false);
                    navigate(ROUTES.ACHIEVEMENTS);
                  }}>
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
