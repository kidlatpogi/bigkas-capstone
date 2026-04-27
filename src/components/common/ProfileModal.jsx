import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { IoCloseOutline, IoLogOutOutline, IoPersonOutline, IoSettingsOutline } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import './ProfileModal.css';

export default function ProfileModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName = user?.name || user?.nickname || user?.firstName || 'Speaker';
  const displayEmail = user?.email || '';
  const userInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isOpen) {
      setShowLogoutConfirm(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (isOpen) {
      document.body.classList.add('profile-modal-open');
    } else {
      document.body.classList.remove('profile-modal-open');
    }
    return () => document.body.classList.remove('profile-modal-open');
  }, [isOpen]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onClose();
    logout();
  };

  const handleNavigateToProfile = () => {
    onClose();
    navigate(ROUTES.PROFILE);
  };

  const handleNavigateToSettings = () => {
    onClose();
    navigate(ROUTES.SETTINGS);
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div className="profile-modal-backdrop" role="presentation" onClick={onClose} />
      <div className="profile-modal-wrapper">
        <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
          {/* Header */}
          <div className="profile-modal-header">
            <h2 id="profile-modal-title" className="profile-modal-title">Settings</h2>
            <button
              type="button"
              className="profile-modal-close-btn"
              onClick={onClose}
              aria-label="Close profile modal"
            >
              <IoCloseOutline size={24} />
            </button>
          </div>

          {/* User Info */}
          <div className="profile-modal-user-section">
            <div className="profile-modal-avatar">
              {userInitial}
            </div>
            <div className="profile-modal-user-info">
              <p className="profile-modal-user-name">{displayName}</p>
              <p className="profile-modal-user-email">{displayEmail}</p>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="profile-modal-menu">
            <button
              type="button"
              className="profile-modal-menu-item"
              onClick={handleNavigateToProfile}
            >
              <div className="profile-modal-menu-icon">
                <IoPersonOutline size={22} />
              </div>
              <span className="profile-modal-menu-text">Account Settings</span>
            </button>
            <button
              type="button"
              className="profile-modal-menu-item"
              onClick={handleNavigateToSettings}
            >
              <div className="profile-modal-menu-icon">
                <IoSettingsOutline size={22} />
              </div>
              <span className="profile-modal-menu-text">Settings</span>
            </button>

            {/* Divider within menu */}
            <div className="profile-modal-menu-divider" />

            <button
              type="button"
              className="profile-modal-menu-item profile-modal-menu-item--logout"
              onClick={handleLogoutClick}
            >
              <div className="profile-modal-menu-icon">
                <IoLogOutOutline size={22} />
              </div>
              <span className="profile-modal-menu-text">Log Out</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="profile-modal-confirm-backdrop"
          role="presentation"
          onClick={handleCancelLogout}
        >
          <div
            className="profile-modal-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-logout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="profile-modal-logout-title" className="profile-modal-confirm-title">
              Log out?
            </h3>
            <p className="profile-modal-confirm-message">
              Are you sure you want to log out?
            </p>
            <div className="profile-modal-confirm-actions">
              <button
                type="button"
                className="profile-modal-confirm-btn profile-modal-confirm-btn--cancel"
                onClick={handleCancelLogout}
              >
                Cancel
              </button>
              <button
                type="button"
                className="profile-modal-confirm-btn profile-modal-confirm-btn--confirm"
                onClick={handleConfirmLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
