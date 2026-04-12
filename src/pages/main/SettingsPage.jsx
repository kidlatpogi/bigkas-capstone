import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoKeyOutline,
  IoShieldCheckmarkOutline,
  IoMicOutline,
  IoCameraOutline,
  IoContrastOutline,
  IoHardwareChipOutline,
  IoLogOutOutline,
  IoChevronForward,
} from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessionContext } from '../../context/useSessionContext';
import { ROUTES } from '../../utils/constants';
import './InnerPages.css';
import './SettingsPage.css';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const THEME_TOGGLE_HIDDEN_KEY = 'bigkas-hide-theme-toggle';
const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';

function SettingsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthContext();
  const { clearSessionMedia } = useSessionContext();

  /* ── Enumerate real devices when available ── */
  const [microphones, setMicrophones] = useState([]);
  const [cameras, setCameras]         = useState([]);
  const [mic, setMic] = useState(() => localStorage.getItem('pref_mic') || '');
  const [cam, setCam] = useState(() => localStorage.getItem('pref_cam') || '');
  const [micSensitivity, setMicSensitivity] = useState(
    () => localStorage.getItem(MIC_SENSITIVITY_KEY) || 'high'
  );
  const [hideThemeToggle, setHideThemeToggle] = useState(
    () => localStorage.getItem(THEME_TOGGLE_HIDDEN_KEY) === '1'
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearMediaModal, setShowClearMediaModal] = useState(false);
  const [isClearingMedia, setIsClearingMedia] = useState(false);
  const [clearMediaMessage, setClearMediaMessage] = useState('');
  const [clearMediaStatus, setClearMediaStatus] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const enumerate = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(t => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        const cams = devices.filter(d => d.kind === 'videoinput');
        setMicrophones(mics);
        setCameras(cams);
        if (!mic && mics.length) { setMic(mics[0].deviceId); localStorage.setItem('pref_mic', mics[0].deviceId); }
        if (!cam && cams.length) { setCam(cams[0].deviceId); localStorage.setItem('pref_cam', cams[0].deviceId); }
      } catch {
        setMicrophones([{ deviceId: 'default', label: 'Default Microphone' }]);
        setCameras([{ deviceId: 'default', label: 'Default Camera' }]);
      }
    };
    enumerate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMicChange = (e) => { setMic(e.target.value); localStorage.setItem('pref_mic', e.target.value); };
  const handleCamChange = (e) => { setCam(e.target.value); localStorage.setItem('pref_cam', e.target.value); };
  const handleMicSensitivityChange = (e) => {
    const next = e.target.value;
    setMicSensitivity(next);
    localStorage.setItem(MIC_SENSITIVITY_KEY, next);
  };
  const handleThemeToggleVisibilityChange = (e) => {
    const shouldHide = e.target.checked;
    setHideThemeToggle(shouldHide);
    localStorage.setItem(THEME_TOGGLE_HIDDEN_KEY, shouldHide ? '1' : '0');
    window.dispatchEvent(new Event('theme-toggle-visibility-changed'));
  };

  const handleLogout = () => { setShowLogoutModal(true); };

  const handleClearMedia = async () => {
    setIsClearingMedia(true);
    setClearMediaMessage('');
    setClearMediaStatus('');
    const result = await clearSessionMedia();
    setIsClearingMedia(false);
    if (result?.success) {
      setShowClearMediaModal(false);
      const clearedCount = Number(result?.clearedFiles || 0);
      setClearMediaMessage(
        clearedCount > 0
          ? `Successfully cleared recordings (${clearedCount} file${clearedCount > 1 ? 's' : ''}).`
          : 'Successfully cleared recordings.'
      );
      setClearMediaStatus('success');
      return;
    }

    setClearMediaMessage(result?.error || 'Failed to clear recordings. Please try again.');
    setClearMediaStatus('error');
  };

  const displayName  = user?.nickname || user?.name || 'My Profile';
  const profileInitial = String(displayName).trim().charAt(0).toUpperCase() || 'U';
  const displayEmail  = user?.email || '';
  const avatarUrl     = user?.avatar_url || null;

  return (
    <div className="inner-page settings-page">
      <div className="inner-page-header">
        <h1 className="inner-page-title">Settings</h1>
      </div>

      {/* ── Account section ── */}
      <p className="stg-section-label">ACCOUNT</p>
      <div className="stg-card">

        {/* Profile row */}
        <button className="stg-row" onClick={() => navigate(ROUTES.PROFILE)}>
          <span className="stg-row-icon stg-icon-gold">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="stg-avatar"
                onError={() => {
                  if (!avatarError) {
                    setAvatarError(true);
                  }
                }}
              />
            ) : (
              <span className="stg-avatar-fallback" aria-hidden="true">{profileInitial}</span>
            )}
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">{displayName}</span>
            <span className="stg-row-sub">{displayEmail}</span>
          </div>
          <IoChevronForward size={17} className="stg-chevron" />
        </button>

        <div className="stg-divider" />

        {/* Change Password */}
        <button className="stg-row" onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}>
          <span className="stg-row-icon">
            <IoKeyOutline size={20} />
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">Change Password</span>
          </div>
          <IoChevronForward size={17} className="stg-chevron" />
        </button>

        <div className="stg-divider" />

        {/* Account Settings */}
        <button className="stg-row" onClick={() => navigate(ROUTES.ACCOUNT_SETTINGS)}>
          <span className="stg-row-icon">
            <IoShieldCheckmarkOutline size={20} />
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">Account Settings</span>
            <span className="stg-row-sub">Manage connected accounts &amp; data</span>
          </div>
          <IoChevronForward size={17} className="stg-chevron" />
        </button>
      </div>

      {/* ── Appearance section ── */}
      <p className="stg-section-label">APPEARANCE</p>
      <div className="stg-card">
        <div className="stg-row stg-row--toggle">
          <span className="stg-row-icon">
            <IoContrastOutline size={20} />
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">Hide Theme Button</span>
            <span className="stg-row-sub">Hide or show the floating light-dark toggle button</span>
          </div>
          <label className="stg-switch" aria-label="Hide theme button">
            <input
              type="checkbox"
              className="stg-switch-input"
              checked={hideThemeToggle}
              onChange={handleThemeToggleVisibilityChange}
            />
            <span className="stg-switch-slider" />
          </label>
        </div>
      </div>

      {/* ── Hardware section ── */}
      <p className="stg-section-label">HARDWARE</p>
      <div className="stg-card">

        {/* Microphone */}
        <div className="stg-row stg-row--select">
          <span className="stg-row-icon">
            <IoMicOutline size={20} />
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">Microphone</span>
            <div className="stg-select-wrap">
              <select className="stg-select" value={mic} onChange={handleMicChange}>
                {microphones.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
              <IoChevronForward size={14} className="stg-select-arrow" />
            </div>
          </div>
        </div>

        <div className="stg-divider" />

        {/* Mic sensitivity */}
        <div className="stg-row stg-row--select">
          <span className="stg-row-icon">
            <IoMicOutline size={20} />
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">Mic Sensitivity</span>
            <span className="stg-row-sub">Increase if your voice is not picked up clearly</span>
            <div className="stg-select-wrap">
              <select className="stg-select" value={micSensitivity} onChange={handleMicSensitivityChange}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High (Recommended)</option>
              </select>
              <IoChevronForward size={14} className="stg-select-arrow" />
            </div>
          </div>
        </div>

        <div className="stg-divider" />

        {/* Camera */}
        <div className="stg-row stg-row--select">
          <span className="stg-row-icon">
            <IoCameraOutline size={20} />
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">Camera</span>
            <div className="stg-select-wrap">
              <select className="stg-select" value={cam} onChange={handleCamChange}>
                {cameras.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
              <IoChevronForward size={14} className="stg-select-arrow" />
            </div>
          </div>
        </div>

        <div className="stg-divider" />

        {/* Test A/V */}
        <button className="stg-row" onClick={() => navigate(ROUTES.AUDIO_TEST)}>
          <span className="stg-row-icon">
            <IoHardwareChipOutline size={20} />
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">Test Audio / Video</span>
            <span className="stg-row-sub">Check your mic and camera work correctly</span>
          </div>
          <IoChevronForward size={17} className="stg-chevron" />
        </button>
      </div>

      {/* ── Data section ── */}
      <p className="stg-section-label">DATA</p>
      <div className="stg-card">
        <button className="stg-row" onClick={() => setShowClearMediaModal(true)}>
          <span className="stg-row-icon stg-icon-danger">
            <IoCameraOutline size={20} />
          </span>
          <div className="stg-row-body">
            <span className="stg-row-title">Clear Recordings</span>
            <span className="stg-row-sub">Remove all saved audio/video files from cloud storage</span>
          </div>
          <IoChevronForward size={17} className="stg-chevron" />
        </button>
      </div>

      {clearMediaMessage ? (
        <p
          className={`stg-inline-message ${clearMediaStatus === 'success' ? 'stg-inline-message--success' : ''} ${clearMediaStatus === 'error' ? 'stg-inline-message--error' : ''}`.trim()}
          role="status"
          aria-live="polite"
        >
          {clearMediaMessage}
        </p>
      ) : null}

      {/* ── Log out ── */}
      <button className="stg-btn-logout" onClick={handleLogout}>
        <IoLogOutOutline size={20} />
        Log Out
      </button>

      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Log out?"
        message="Are you sure you want to log out of Bigkas?"
        confirmLabel="Log Out"
        cancelLabel="Stay"
        type="danger"
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={async () => { setShowLogoutModal(false); await logout(); }}
      />

      <ConfirmationModal
        isOpen={showClearMediaModal}
        title="Clear recordings?"
        message="This will permanently delete all your stored audio/video recordings from cloud storage. Session scores and text feedback will remain."
        confirmLabel={isClearingMedia ? 'Clearing...' : 'Clear'}
        cancelLabel="Cancel"
        type="danger"
        onCancel={() => { if (!isClearingMedia) setShowClearMediaModal(false); }}
        onConfirm={() => { if (!isClearingMedia) handleClearMedia(); }}
      />
    </div>
  );
}

export default SettingsPage;
