import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoChevronForward, 
  IoNotificationsOutline, 
  IoLockClosedOutline,
  IoShieldCheckmarkOutline,
  IoPersonCircleOutline,
  IoLogOutOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import LegalModal from '../../components/Legal/LegalModal';
import { TERMS_AND_CONDITIONS } from '../../constants/legal/terms';
import { PRIVACY_POLICY } from '../../constants/legal/privacy';
import './SettingsPage.css';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';
const AUTO_NEXT_KEY = 'pref_auto_next';

function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [micSensitivity, setMicSensitivity] = useState(() => {
    return localStorage.getItem(MIC_SENSITIVITY_KEY) || '80';
  });
  const [autoNext, setAutoNext] = useState(() => {
    return localStorage.getItem(AUTO_NEXT_KEY) === 'true';
  });

  const [legalModal, setLegalModal] = useState({ isOpen: false, type: '', title: '', content: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    localStorage.setItem(MIC_SENSITIVITY_KEY, micSensitivity);
  }, [micSensitivity]);

  useEffect(() => {
    localStorage.setItem(AUTO_NEXT_KEY, autoNext.toString());
  }, [autoNext]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const openLegal = (type) => {
    if (type === 'terms') {
      setLegalModal({
        isOpen: true,
        type: 'terms',
        title: 'Terms of Service',
        content: TERMS_AND_CONDITIONS
      });
    } else {
      setLegalModal({
        isOpen: true,
        type: 'privacy',
        title: 'Privacy Policy',
        content: PRIVACY_POLICY
      });
    }
  };

  return (
    <div className="settings-page-new">
      <div className="settings-container">
        <header className="settings-header">
          <h1 className="settings-title">Preferences</h1>
          <p className="settings-subtitle">Customize your experience and manage your account.</p>
        </header>

        <div className="settings-grid">
          {/* Account Section */}
          <section className="settings-section">
            <h2 className="settings-section-title">Account</h2>
            <div className="settings-card">
              <button 
                className="settings-item" 
                onClick={() => navigate(ROUTES.PROFILE)}
              >
                <div className="settings-item-icon account">
                  <IoPersonCircleOutline />
                </div>
                <div className="settings-item-content">
                  <span className="settings-item-label">Profile Information</span>
                  <span className="settings-item-hint">Name, email, and avatar</span>
                </div>
                <IoChevronForward className="settings-item-chevron" />
              </button>

              <button 
                className="settings-item"
                onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}
              >
                <div className="settings-item-icon security">
                  <IoLockClosedOutline />
                </div>
                <div className="settings-item-content">
                  <span className="settings-item-label">Password & Security</span>
                  <span className="settings-item-hint">Update your login credentials</span>
                </div>
                <IoChevronForward className="settings-item-chevron" />
              </button>
            </div>
          </section>

          {/* App Preferences */}
          <section className="settings-section">
            <h2 className="settings-section-title">App Settings</h2>
            <div className="settings-card">
              <div className="settings-item no-click">
                <div className="settings-item-icon notifications">
                  <IoNotificationsOutline />
                </div>
                <div className="settings-item-content">
                  <span className="settings-item-label">Push Notifications</span>
                  <span className="settings-item-hint">Get alerts for streak and updates</span>
                </div>
                <label className="settings-switch">
                  <input 
                    type="checkbox" 
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  />
                  <span className="settings-switch-slider"></span>
                </label>
              </div>

              <div className="settings-item no-click">
                <div className="settings-item-icon voice">
                  <IoAlertCircleOutline />
                </div>
                <div className="settings-item-content">
                  <span className="settings-item-label">Microphone Sensitivity</span>
                  <span className="settings-item-hint">Current: {micSensitivity}%</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={micSensitivity}
                    onChange={(e) => setMicSensitivity(e.target.value)}
                    className="settings-range"
                  />
                </div>
              </div>

              <div className="settings-item no-click">
                <div className="settings-item-icon flow">
                  <IoShieldCheckmarkOutline />
                </div>
                <div className="settings-item-content">
                  <span className="settings-item-label">Auto-advance Tasks</span>
                  <span className="settings-item-hint">Move to next step automatically</span>
                </div>
                <label className="settings-switch">
                  <input 
                    type="checkbox" 
                    checked={autoNext}
                    onChange={(e) => setAutoNext(e.target.checked)}
                  />
                  <span className="settings-switch-slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* Legal & About */}
          <section className="settings-section">
            <h2 className="settings-section-title">About</h2>
            <div className="settings-card">
              <button className="settings-item" onClick={() => openLegal('terms')}>
                <div className="settings-item-content">
                  <span className="settings-item-label">Terms of Service</span>
                </div>
                <IoChevronForward className="settings-item-chevron" />
              </button>
              
              <button className="settings-item" onClick={() => openLegal('privacy')}>
                <div className="settings-item-content">
                  <span className="settings-item-label">Privacy Policy</span>
                </div>
                <IoChevronForward className="settings-item-chevron" />
              </button>

              <div className="settings-item no-click">
                <div className="settings-item-content">
                  <span className="settings-item-label">App Version</span>
                  <span className="settings-item-hint">1.0.4 (Build 2024.01)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="settings-section">
            <div className="settings-card danger">
              <button 
                className="settings-item logout" 
                onClick={() => setShowLogoutConfirm(true)}
              >
                <div className="settings-item-icon logout">
                  <IoLogOutOutline />
                </div>
                <div className="settings-item-content">
                  <span className="settings-item-label">Log Out</span>
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>

      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal({ ...legalModal, isOpen: false })}
        title={legalModal.title}
        content={legalModal.content}
      />

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Log Out"
        message="Are you sure you want to log out of Bigkas?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        variant="danger"
      />
    </div>
  );
}

export default SettingsPage;
