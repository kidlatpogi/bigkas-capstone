import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoShieldCheckmarkOutline,
  IoMicOutline,
  IoCameraOutline,
  IoHardwareChipOutline,
  IoChevronForward,
  IoTrashOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import { useSessionContext } from '../../context/useSessionContext';
import { ROUTES } from '../../utils/constants';
import './DashboardPage.css';
import './SettingsPage.css';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const MIC_SENSITIVITY_KEY = 'pref_mic_sensitivity';

function SettingsPage() {
  const navigate = useNavigate();
  const { clearSessionMedia } = useSessionContext();

  const [microphones, setMicrophones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [mic, setMic] = useState(() => localStorage.getItem('pref_mic') || '');
  const [cam, setCam] = useState(() => localStorage.getItem('pref_cam') || '');
  const [micSensitivity, setMicSensitivity] = useState(
    () => localStorage.getItem(MIC_SENSITIVITY_KEY) || 'high'
  );
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

  return (
    <div className="dashboard-page-new stg-page">
      <div className="stg-shell">
        <header className="stg-hero dashboard-anim-top">
          <h1 className="stg-hero-title">Settings</h1>
          <p className="stg-hero-sub">Manage security, hardware, legal, and destructive actions in one place.</p>
        </header>

        <div className="stg-grid">
          {/* ── Left column ── */}
          <div className="stg-col-main">
            {/* Legal */}
            <section className="dashboard-card stg-card-section dashboard-anim-left dashboard-anim-delay-1">
              <h2 className="stg-section-title">Legal</h2>
              <div className="stg-rows">
                <a className="stg-row" href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
                  <span className="stg-row-icon">
                    <IoShieldCheckmarkOutline size={20} />
                  </span>
                  <div className="stg-row-body">
                    <span className="stg-row-title">Terms &amp; Conditions</span>
                    <span className="stg-row-sub">Review platform usage terms and responsibilities</span>
                  </div>
                  <IoChevronForward size={16} className="stg-chevron" />
                </a>

                <div className="stg-row-divider" />

                <a className="stg-row" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                  <span className="stg-row-icon">
                    <IoShieldCheckmarkOutline size={20} />
                  </span>
                  <div className="stg-row-body">
                    <span className="stg-row-title">Privacy Policy</span>
                    <span className="stg-row-sub">Learn how your account and recording data are handled</span>
                  </div>
                  <IoChevronForward size={16} className="stg-chevron" />
                </a>
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
          </div>
        </section>
      </div>

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
