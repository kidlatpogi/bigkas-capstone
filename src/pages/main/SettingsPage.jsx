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
  IoDocumentTextOutline,
  IoLockClosedOutline,
  IoTrashOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessionContext } from '../../context/useSessionContext';
import { ROUTES } from '../../utils/constants';
import './SettingsPage.css';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const THEME_TOGGLE_HIDDEN_KEY = 'bigkas-hide-theme-toggle';
const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';

function SettingsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthContext();
  const { clearSessionMedia } = useSessionContext();

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

  return (
    <div className="stg-page">
      <header className="stg-hero dashboard-anim-top">
        <h1 className="stg-hero-title">Settings</h1>
        <p className="stg-hero-sub">Manage your account, devices, and preferences.</p>
      </header>

      <div className="stg-sections">
        {/* ── Account ── */}
        <section className="stg-section dashboard-anim-bottom dashboard-anim-delay-2">
          <h2 className="stg-section-label">Account</h2>

          <button className="stg-row" onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}>
            <span className="stg-row-icon">
              <IoKeyOutline size={20} />
            </span>
            <div className="stg-row-body">
              <span className="stg-row-title">Change Password</span>
              <span className="stg-row-sub">Update your login credentials</span>
            </div>
            <IoChevronForward size={16} className="stg-chevron" />
          </button>

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
        </section>

        {/* ── Appearance ── */}
        <section className="stg-section dashboard-anim-bottom dashboard-anim-delay-3">
          <h2 className="stg-section-label">Appearance</h2>

          <div className="stg-row stg-row--toggle">
            <span className="stg-row-icon">
              <IoContrastOutline size={20} />
            </span>
            <div className="stg-row-body">
              <span className="stg-row-title">Hide Theme Button</span>
              <span className="stg-row-sub">Toggle the floating light/dark mode button</span>
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
        </section>

        {/* ── Hardware ── */}
        <section className="stg-section dashboard-anim-bottom dashboard-anim-delay-4">
          <h2 className="stg-section-label">Hardware</h2>

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
              </div>
            </div>
          </div>

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
        </section>

        {/* ── Legal ── */}
        <section className="stg-section dashboard-anim-bottom dashboard-anim-delay-5">
          <h2 className="stg-section-label">Legal</h2>

          <a className="stg-row" href="/terms" target="_blank" rel="noopener noreferrer">
            <span className="stg-row-icon">
              <IoDocumentTextOutline size={20} />
            </span>
            <div className="stg-row-body">
              <span className="stg-row-title">Terms &amp; Conditions</span>
            </div>
            <IoChevronForward size={16} className="stg-chevron" />
          </a>

          <a className="stg-row" href="/privacy" target="_blank" rel="noopener noreferrer">
            <span className="stg-row-icon">
              <IoLockClosedOutline size={20} />
            </span>
            <div className="stg-row-body">
              <span className="stg-row-title">Privacy Policy</span>
            </div>
            <IoChevronForward size={16} className="stg-chevron" />
          </a>
        </section>

        {/* ── Danger Zone ── */}
        <section className="stg-section stg-section--danger dashboard-anim-bottom dashboard-anim-delay-6">
          <h2 className="stg-section-label stg-section-label--danger">
            <IoWarningOutline size={16} />
            Danger Zone
          </h2>

          <button className="stg-row stg-row--danger" onClick={() => setShowClearMediaModal(true)}>
            <span className="stg-row-icon stg-row-icon--danger">
              <IoTrashOutline size={20} />
            </span>
            <div className="stg-row-body">
              <span className="stg-row-title stg-row-title--danger">Delete Recording Data</span>
              <span className="stg-row-sub">Permanently remove all saved audio/video files from cloud storage. Session scores and text feedback will remain.</span>
            </div>
          </button>

          {clearMediaMessage ? (
            <p
              className={`stg-inline-msg ${clearMediaStatus === 'success' ? 'stg-inline-msg--success' : ''} ${clearMediaStatus === 'error' ? 'stg-inline-msg--error' : ''}`.trim()}
              role="status"
              aria-live="polite"
            >
              {clearMediaMessage}
            </p>
          ) : null}

          <button className="stg-row stg-row--danger" onClick={handleLogout}>
            <span className="stg-row-icon stg-row-icon--danger">
              <IoLogOutOutline size={20} />
            </span>
            <div className="stg-row-body">
              <span className="stg-row-title stg-row-title--danger">Log Out</span>
              <span className="stg-row-sub">Sign out of your Bigkas account</span>
            </div>
          </button>
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
