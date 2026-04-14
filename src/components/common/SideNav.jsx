import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import {
  IoBookOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoPersonOutline,
  IoStatsChartOutline,
} from 'react-icons/io5';
import { MdOutlineBackpack } from 'react-icons/md';
import NotificationCenter from './NotificationCenter';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import './SideNav.css';

const PRIMARY_NAV_ITEMS = [
  { to: ROUTES.ACTIVITY, label: 'Home', icon: IoHomeOutline },
  { to: ROUTES.PROGRESS, label: 'Progress', icon: IoStatsChartOutline },
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: MdOutlineBackpack },
  { to: ROUTES.FRAMEWORKS, label: 'Learn', icon: IoBookOutline },
];

export default function SideNav() {
  const { user, logout } = useAuthContext();
  const displayName = user?.name || user?.nickname || user?.firstName || 'Speaker';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
            state={to === ROUTES.ACTIVITY ? { skywardEntrance: true } : undefined}
            end={to === ROUTES.ACTIVITY}
            className={({ isActive }) => `side-nav-link${isActive ? ' active' : ''}`}
            aria-label={label}
          >
            <Icon className="side-nav-icon" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="side-nav-utilities" aria-label="Quick access">
        <NavLink
          to={ROUTES.PROFILE}
          className={({ isActive }) => `side-nav-link${isActive ? ' active' : ''}`}
          aria-label="Profile"
        >
          <IoPersonOutline className="side-nav-icon" aria-hidden="true" />
          <span>Profile</span>
        </NavLink>
        <NotificationCenter label="Notifications" railMode={true} />
      </div>

      <button type="button" className="side-nav-logout" onClick={handleLogoutClick}>
        <IoLogOutOutline aria-hidden="true" />
        <span>Log Out</span>
      </button>

      {logoutModal}
    </aside>
  );
}
