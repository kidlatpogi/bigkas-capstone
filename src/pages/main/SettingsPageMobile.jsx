import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoChevronForward, 
  IoLockClosedOutline,
  IoPersonCircleOutline,
  IoLogOutOutline,
  IoAlertCircleOutline,
  IoArrowBack,
  IoVideocamOutline
} from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import LegalModal from '../../components/Legal/LegalModal';
import { TERMS_AND_CONDITIONS } from '../../constants/legal/terms';
import { PRIVACY_POLICY } from '../../constants/legal/privacy';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import './SettingsPageMobile.css';

import { getSpriteUrl } from '../../utils/assetUtils';

// Define decorative asset URLs
const mascotSprite = getSpriteUrl('Robot/0001.webp');
const goldRank = getSpriteUrl('Rank/rank-gold.png');
const legendaryRank = getSpriteUrl('Rank/rank-legendary.png');

const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';

function SettingsPageMobile() {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  
  const [micSensitivity, setMicSensitivity] = useState(() => {
    return localStorage.getItem(MIC_SENSITIVITY_KEY) || '80';
  });

  const [legalModal, setLegalModal] = useState({ isOpen: false, type: '', title: '', content: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [heroTheme] = useState(() => {
    return localStorage.getItem('pref_hero_theme') || 'emerald';
  });

  useEffect(() => {
    localStorage.setItem(MIC_SENSITIVITY_KEY, micSensitivity);
  }, [micSensitivity]);

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
    <div className="stg-mobile-page">
      <header className="stg-mobile-header">
        <button className="stg-back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1 className="stg-header-title">Settings</h1>
        <div className="stg-header-right" />
      </header>

      <div className="stg-mobile-scroll">
        <div className={`stg-mobile-hero hero-theme--${heroTheme}`}>
          <div className="hero-decoration">
            {heroTheme === 'mascot' && <img src={mascotSprite} alt="" className="decoration-img decoration-mascot" />}
            {heroTheme === 'trophy' && <img src={legendaryRank} alt="" className="decoration-img decoration-trophy" />}
            {heroTheme === 'gold' && <img src={goldRank} alt="" className="decoration-img decoration-trophy" />}
          </div>
          <div className="hero-info-mobile">
            <h2 className="hero-title-mobile">Preferences</h2>
            <p className="hero-sub-mobile">Customize your experience</p>
          </div>
        </div>

        <div className="stg-mobile-content">
          <section className="stg-mobile-section">
            <h3 className="stg-section-title">Account</h3>
            <div className="stg-mobile-list">
              <button className="stg-mobile-item" onClick={() => navigate(ROUTES.PROFILE)}>
                <div className="stg-item-icon account">
                  <IoPersonCircleOutline />
                </div>
                <div className="stg-item-content">
                  <span className="stg-item-label">Profile Information</span>
                  <span className="stg-item-hint">Name, email, and avatar</span>
                </div>
                <IoChevronForward className="stg-item-chevron" />
              </button>

              <button className="stg-mobile-item" onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}>
                <div className="stg-item-icon security">
                  <IoLockClosedOutline />
                </div>
                <div className="stg-item-content">
                  <span className="stg-item-label">Password & Security</span>
                  <span className="stg-item-hint">Change your password</span>
                </div>
                <IoChevronForward className="stg-item-chevron" />
              </button>
            </div>
          </section>

          <section className="stg-mobile-section">
            <h3 className="stg-section-title">App Settings</h3>
            <div className="stg-mobile-list">
              <div className="stg-mobile-item no-click stacked">
                <div className="stg-item-top">
                  <div className="stg-item-icon voice">
                    <IoAlertCircleOutline />
                  </div>
                  <div className="stg-item-content">
                    <span className="stg-item-label">Mic Sensitivity</span>
                    <span className="stg-item-hint">Current: {micSensitivity}%</span>
                  </div>
                </div>
                <div className="stg-range-wrapper">
                   <select 
                      className="stg-mobile-select"
                      value={micSensitivity}
                      onChange={(e) => setMicSensitivity(e.target.value)}
                    >
                      <option value="100">High (100%)</option>
                      <option value="80">Normal (80%)</option>
                      <option value="50">Low (50%)</option>
                    </select>
                </div>
              </div>

              <button className="stg-mobile-item" onClick={() => navigate(ROUTES.AUDIO_TEST)}>
                <div className="stg-item-icon voice">
                  <IoVideocamOutline />
                </div>
                <div className="stg-item-content">
                  <span className="stg-item-label">Test Audio/ Video</span>
                  <span className="stg-item-hint">Verify camera and microphone</span>
                </div>
                <IoChevronForward className="stg-item-chevron" />
              </button>
            </div>
          </section>

          <section className="stg-mobile-section">
            <h3 className="stg-section-title">About</h3>
            <div className="stg-mobile-list">
              <button className="stg-mobile-item" onClick={() => openLegal('terms')}>
                <div className="stg-item-content">
                  <span className="stg-item-label">Terms of Service</span>
                </div>
                <IoChevronForward className="stg-item-chevron" />
              </button>
              
              <button className="stg-mobile-item" onClick={() => openLegal('privacy')}>
                <div className="stg-item-content">
                  <span className="stg-item-label">Privacy Policy</span>
                </div>
                <IoChevronForward className="stg-item-chevron" />
              </button>

              <div className="stg-mobile-item no-click">
                <div className="stg-item-content">
                  <span className="stg-item-label">App Version</span>
                  <span className="stg-item-hint">1.0.4 (Build 2024.01)</span>
                </div>
              </div>
            </div>
          </section>

          <section className="stg-mobile-section danger">
            <button className="stg-mobile-item logout-btn" onClick={() => setShowLogoutConfirm(true)}>
              <div className="stg-item-icon logout">
                <IoLogOutOutline />
              </div>
              <div className="stg-item-content">
                <span className="stg-item-label">Log Out</span>
              </div>
            </button>
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

export default SettingsPageMobile;
