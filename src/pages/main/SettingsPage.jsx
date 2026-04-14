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
  IoTrashOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessionContext } from '../../context/useSessionContext';
import { ROUTES } from '../../utils/constants';
import './DashboardPage.css';
import './SettingsPage.css';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const THEME_TOGGLE_HIDDEN_KEY = 'bigkas-hide-theme-toggle';
const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';

function SettingsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthContext();
  const { clearSessionMedia } = useSessionContext();

  const [microphones, setMicrophones] = useState([]);
  const [cameras, setCameras] = useState([]);
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
    setMicSensitivity(e.target.value);
    localStorage.setItem(MIC_SENSITIVITY_KEY, e.target.value);
  };
  const handleThemeToggleVisibilityChange = (e) => {
    const shouldHide = e.target.checked;
    setHideThemeToggle(shouldHide);
    localStorage.setItem(THEME_TOGGLE_HIDDEN_KEY, shouldHide ? '1' : '0');
    window.dispatchEvent(new Event('theme-toggle-visibility-changed'));
  };

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
          ? `Successfully cleared ${clearedCount} recording${clearedCount > 1 ? 's' : ''}.`
          : 'Successfully cleared recordings.'
      );
      setClearMediaStatus('success');
      return;
    }
    setClearMediaMessage(result?.error || 'Failed to clear recordings. Please try again.');
    setClearMediaStatus('error');
  };

  const displayName = user?.nickname || user?.name || 'Speaker';

  return (
    <div className="dashboard-page-new stg-page">
      <div className="stg-shell">
        <header className="stg-hero dashboard-anim-top">
          <h1 className="stg-hero-title">Settings</h1>
          <p className="stg-hero-sub">Configure your devices, appearance, and account preferences.</p>
        </header>

        <div className="stg-grid">
          {/* ── Left column ── */}
          <div className="stg-col-main">
            {/* Account */}
            <section className="dashboard-card stg-card-section dashboard-anim-left dashboard-anim-delay-1">
              <h2 className="stg-section-title">Account</h2>
              <div className="stg-rows">
                <button className="stg-row" onClick={() => navigate(ROUTES.PROFILE)}>
                  <span className="stg-row-icon stg-row-icon--green">
                    <IoShieldCheckmarkOutline size={20} />
                  </span>
                  <div className="stg-row-body">
                    <span className="stg-row-title">{displayName}</span>
                    <span className="stg-row-sub">Manage your profile and account details</span>
                  </div>
                  <IoChevronForward size={16} className="stg-chevron" />
                </button>

                <div className="stg-row-divider" />

                <button className="stg-row" onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}>
                  <span className="stg-row-icon">
                    <IoKeyOutline size={20} />
                  </span>
                  <div className="stg-row-body">
                    <span className="stg-row-title">Change Password</span>
                  </div>
                  <IoChevronForward size={16} className="stg-chevron" />
                </button>

                <div className="stg-row-divider" />

                <button className="stg-row" onClick={() => navigate(ROUTES.ACCOUNT_SETTINGS)}>
                  <span className="stg-row-icon">
                    <IoShieldCheckmarkOutline size={20} />
                  </span>
                  <div className="stg-row-body">
                    <span className="stg-row-title">Account Settings</span>
                    <span className="stg-row-sub">Manage connected accounts &amp; data</span>
                  </div>
                  <IoChevronForward size={16} className="stg-chevron" />
                </button>
              </div>
            </section>

            {/* Appearance */}
            <section className="dashboard-card stg-card-section dashboard-anim-left dashboard-anim-delay-2">
              <h2 className="stg-section-title">Appearance</h2>
              <div className="stg-rows">
                <div className="stg-row stg-row--toggle">
                  <span className="stg-row-icon">
                    <IoContrastOutline size={20} />
                  </span>
                  <div className="stg-row-body">
                    <span className="stg-row-title">Hide Theme Button</span>
                    <span className="stg-row-sub">Show or hide the floating light/dark toggle</span>
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
            </section>
          </div>

          {/* ── Right column ── */}
          <div className="stg-col-side">
            {/* Hardware */}
            <section className="dashboard-card stg-card-section dashboard-anim-right dashboard-anim-delay-2">
              <h2 className="stg-section-title">Hardware</h2>
              <div className="stg-rows">
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
                    </div>
                  </div>
                </div>

                <div className="stg-row-divider" />

                <div className="stg-row stg-row--select">
                  <span className="stg-row-icon">
                    <IoMicOutline size={20} />
                  </span>
                  <div className="stg-row-body">
                    <span className="stg-row-title">Mic Sensitivity</span>
                    <span className="stg-row-sub">Increase if your voice isn&apos;t picked up clearly</span>
                    <div className="stg-select-wrap">
                      <select className="stg-select" value={micSensitivity} onChange={handleMicSensitivityChange}>
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High (Recommended)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="stg-row-divider" />

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
                    </div>
                  </div>
                </div>

                <div className="stg-row-divider" />

                <button className="stg-row" onClick={() => navigate(ROUTES.AUDIO_TEST)}>
                  <span className="stg-row-icon">
                    <IoHardwareChipOutline size={20} />
                  </span>
                  <div className="stg-row-body">
                    <span className="stg-row-title">Test Audio / Video</span>
                    <span className="stg-row-sub">Check your mic and camera work correctly</span>
                  </div>
                  <IoChevronForward size={16} className="stg-chevron" />
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* ── Danger Zone — full width at bottom ── */}
        <section className="dashboard-card stg-danger-zone dashboard-anim-bottom dashboard-anim-delay-4">
          <div className="stg-danger-header">
            <IoWarningOutline size={22} className="stg-danger-icon" />
            <h2 className="stg-danger-title">Danger Zone</h2>
          </div>
          <p className="stg-danger-desc">
            Actions in this section are destructive and cannot be undone. Proceed with caution.
          </p>

          <div className="stg-danger-actions">
            <div className="stg-danger-action-row">
              <div className="stg-danger-action-info">
                <IoTrashOutline size={18} className="stg-danger-action-icon" />
                <div>
                  <span className="stg-danger-action-label">Clear Recordings</span>
                  <span className="stg-danger-action-sub">Remove all saved audio/video files from cloud storage</span>
                </div>
              </div>
              <button
                type="button"
                className="stg-danger-btn"
                onClick={() => setShowClearMediaModal(true)}
              >
                Clear Data
              </button>
            </div>

            {clearMediaMessage && (
              <p
                className={`stg-danger-message ${clearMediaStatus === 'success' ? 'stg-danger-message--success' : ''} ${clearMediaStatus === 'error' ? 'stg-danger-message--error' : ''}`.trim()}
                role="status"
                aria-live="polite"
              >
                {clearMediaMessage}
              </p>
            )}

            <div className="stg-danger-action-row">
              <div className="stg-danger-action-info">
                <IoLogOutOutline size={18} className="stg-danger-action-icon" />
                <div>
                  <span className="stg-danger-action-label">Log Out</span>
                  <span className="stg-danger-action-sub">Sign out of your Bigkas account</span>
                </div>
              </div>
              <button
                type="button"
                className="stg-danger-btn stg-danger-btn--logout"
                onClick={() => setShowLogoutModal(true)}
              >
                Log Out
              </button>
            </div>
          </div>
        </section>
      </div>

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
