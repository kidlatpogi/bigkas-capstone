import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import {
  IoChevronDown,
  IoBookOutline,
  IoMedalOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoSettingsOutline,
  IoStatsChartOutline,
} from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import {
  ACHIEVEMENTS_UPDATED_EVENT,
  getClaimableAchievementsCount,
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
  const { user, logout } = useAuthContext();
  const displayName = user?.name || user?.nickname || user?.firstName || 'Speaker';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [claimableCount, setClaimableCount] = useState(() => getClaimableAchievementsCount());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isSettingsRoute = useMemo(
    () => location.pathname === ROUTES.PROFILE || location.pathname.startsWith(ROUTES.SETTINGS),
    [location.pathname],
  );

  useEffect(() => {
    const syncCount = () => setClaimableCount(getClaimableAchievementsCount());
    syncCount();
    window.addEventListener('storage', syncCount);
    window.addEventListener(ACHIEVEMENTS_UPDATED_EVENT, syncCount);
    return () => {
      window.removeEventListener('storage', syncCount);
      window.removeEventListener(ACHIEVEMENTS_UPDATED_EVENT, syncCount);
    };
  }, []);

  useEffect(() => {
    if (isSettingsRoute) {
      setSettingsOpen(true);
    }
  }, [isSettingsRoute]);

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
        <span className="side-nav-brand-text">Bigkas</span>
        <span className="side-nav-brand-subtitle">{displayName}</span>
      </div>

      <nav className="side-nav-links">
        {PRIMARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            state={label === 'Home' ? { skywardEntrance: true } : undefined}
            end={to === ROUTES.ACTIVITY}
            className={({ isActive }) => `side-nav-link${isActive ? ' active' : ''}`}
            aria-label={label}
          >
            <Icon className="side-nav-icon" aria-hidden="true" />
            <span className="side-nav-link-label">
              {label}
              {(label === 'Progress' || label === 'Achievement') && claimableCount > 0 ? (
                <span className="side-nav-link-badge">{claimableCount > 9 ? '9+' : claimableCount}</span>
              ) : null}
            </span>
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

      <button type="button" className="side-nav-logout" onClick={handleLogoutClick}>
        <IoLogOutOutline aria-hidden="true" />
        <span>Log Out</span>
      </button>

      {logoutModal}
    </aside>
  );
}
