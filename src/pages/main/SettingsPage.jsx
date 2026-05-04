import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoChevronForward, 
  IoNotificationsOutline, 
  IoLockClosedOutline,
  IoShieldCheckmarkOutline,
  IoPersonCircleOutline,
  IoLogOutOutline,
  IoAlertCircleOutline,
  IoVideocamOutline
} from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import LegalModal from '../../components/Legal/LegalModal';
import { TERMS_AND_CONDITIONS } from '../../constants/legal/terms';
import { PRIVACY_POLICY } from '../../constants/legal/privacy';
import './SettingsProfilePage.css';
import './SettingsPage.css';
import ConfirmationModal from '../../components/common/ConfirmationModal';

// Import decorative assets
import mascotSprite from '../../assets/Sprites/Robot/0001.webp';
import goldRank from '../../assets/Sprites/Rank/rank-gold.png';
import legendaryRank from '../../assets/Sprites/Rank/rank-legendary.png';

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
  const [heroTheme] = useState(() => {
    return localStorage.getItem('pref_hero_theme') || 'emerald';
  });

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
    <div className="settings-profile-page dashboard-page-new">
      <div className="settings-profile-container">
        <div className={`profile-hero-card hero-theme--${heroTheme}`}>
          <div className="hero-decoration">
            {heroTheme === 'mascot' && <img src={mascotSprite} alt="" className="decoration-img decoration-mascot" />}
            {heroTheme === 'trophy' && <img src={legendaryRank} alt="" className="decoration-img decoration-trophy" />}
            {heroTheme === 'gold' && <img src={goldRank} alt="" className="decoration-img decoration-trophy" />}
          </div>
          <div className="hero-info" style={{ position: 'relative', zIndex: 2 }}>
            <h1 className="hero-name">Preferences</h1>
            <p className="hero-email" style={{ opacity: 0.9 }}>Customize your experience and manage your account.</p>
          </div>
        </div>

        <div className="settings-content-wrapper">
          <div className="settings-main-card sp-preferences-card">
            
            {/* Account Section */}
            <div className="settings-form-section">
              <h2 className="section-heading">Account</h2>
              <div className="sp-list-group">
                <button className="sp-list-item" onClick={() => navigate(ROUTES.PROFILE)}>
                  <div className="sp-list-icon">
                    <IoPersonCircleOutline />
                  </div>
                  <div className="sp-list-content">
                    <span className="sp-list-label">Profile Information</span>
                    <span className="sp-list-hint">Name, email, and avatar</span>
                  </div>
                  <IoChevronForward className="sp-list-chevron" />
                </button>

                <button className="sp-list-item" onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}>
                  <div className="sp-list-icon">
                    <IoLockClosedOutline />
                  </div>
                  <div className="sp-list-content">
                    <span className="sp-list-label">Password & Security</span>
                    <span className="sp-list-hint">Update your login credentials</span>
                  </div>
                  <IoChevronForward className="sp-list-chevron" />
                </button>
              </div>
            </div>

            <div className="settings-divider" />

            {/* App Settings */}
            <div className="settings-form-section">
              <h2 className="section-heading">App Settings</h2>
              <div className="sp-list-group">
                <div className="sp-list-item sp-list-item--interactive">
                  <div className="sp-list-icon">
                    <IoNotificationsOutline />
                  </div>
                  <div className="sp-list-content">
                    <span className="sp-list-label">Push Notifications</span>
                    <span className="sp-list-hint">Get alerts for streak and updates</span>
                  </div>
                  <label className="sp-toggle">
                    <input 
                      type="checkbox" 
                      className="sp-toggle-input"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    />
                    <span className="sp-toggle-slider"></span>
                  </label>
                </div>

                <div className="sp-list-item sp-list-item--interactive">
                  <div className="sp-list-icon">
                    <IoAlertCircleOutline />
                  </div>
                  <div className="sp-list-content">
                    <span className="sp-list-label">Microphone Sensitivity</span>
                    <span className="sp-list-hint">Current: {micSensitivity}%</span>
                    <div className="sp-select-wrapper">
                      <select 
                        className="sp-select"
                        value={micSensitivity}
                        onChange={(e) => setMicSensitivity(e.target.value)}
                      >
                        <option value="100">High (100%) - Quiet rooms</option>
                        <option value="80">Normal (80%) - Default</option>
                        <option value="50">Low (50%) - Noisy environments</option>
                      </select>
                      <IoChevronForward className="sp-select-icon" />
                    </div>
                  </div>
                </div>

                <button className="sp-list-item" onClick={() => navigate(ROUTES.AUDIO_TEST)}>
                  <div className="sp-list-icon">
                    <IoVideocamOutline />
                  </div>
                  <div className="sp-list-content">
                    <span className="sp-list-label">Test Audio/ Video</span>
                    <span className="sp-list-hint">Verify your camera and microphone setup</span>
                  </div>
                  <IoChevronForward className="sp-list-chevron" />
                </button>

              </div>
            </div>

            <div className="settings-divider" />

            {/* Legal & About */}
            <div className="settings-form-section">
              <h2 className="section-heading">About</h2>
              <div className="sp-list-group">
                <button className="sp-list-item" onClick={() => openLegal('terms')}>
                  <div className="sp-list-content">
                    <span className="sp-list-label">Terms of Service</span>
                  </div>
                  <IoChevronForward className="sp-list-chevron" />
                </button>
                
                <button className="sp-list-item" onClick={() => openLegal('privacy')}>
                  <div className="sp-list-content">
                    <span className="sp-list-label">Privacy Policy</span>
                  </div>
                  <IoChevronForward className="sp-list-chevron" />
                </button>



              </div>
            </div>

            {/* Danger Zone */}


          </div>
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
