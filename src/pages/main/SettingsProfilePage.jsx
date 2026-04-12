import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '../../context/useAuthContext';
import LegalModal from '../../components/Legal/LegalModal';
import { TERMS_AND_CONDITIONS } from '../../constants/legal/terms';
import { PRIVACY_POLICY } from '../../constants/legal/privacy';
import './DashboardPage.css';
import './SettingsProfilePage.css';

function SettingsProfilePage() {
  const { user } = useAuthContext();
  const fileRef = useRef(null);

  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '', content: '' });

  const showTerms = () => setLegalModal({ isOpen: true, title: 'Terms & Conditions', content: TERMS_AND_CONDITIONS });
  const showPrivacy = () => setLegalModal({ isOpen: true, title: 'Privacy Policy', content: PRIVACY_POLICY });
  const closeLegal = () => setLegalModal({ ...legalModal, isOpen: false });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState({ firstName: '', lastName: '' });

  const [avatarLocalUrl, setAvatarLocalUrl] = useState(null);
  const [avatarRemoteFailed, setAvatarRemoteFailed] = useState(false);

  const remoteAvatarUrl = useMemo(
    () => String(user?.avatar_url || user?.avatarUrl || user?.profileImage || user?.photoURL || '').trim(),
    [user],
  );

  const avatarInitials = useMemo(() => {
    const fromNames = `${firstName || ''} ${lastName || ''}`.trim();
    if (fromNames) {
      const parts = fromNames.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      const one = parts[0] || '';
      return one.slice(0, 2).toUpperCase() || 'U';
    }
    const em = user?.email || '';
    if (em) return em.slice(0, 2).toUpperCase();
    return 'U';
  }, [firstName, lastName, user?.email]);

  useEffect(() => {
    setAvatarRemoteFailed(false);
  }, [remoteAvatarUrl]);

  const [microphones, setMicrophones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [micId, setMicId] = useState('');
  const [camId, setCamId] = useState('');
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [isRequestingDevices, setIsRequestingDevices] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fn = user.firstName || '';
    const ln = user.lastName || '';
    setFirstName(fn);
    setLastName(ln);
    setInitialSnapshot({ firstName: fn, lastName: ln });
  }, [user]);

  const email = user?.email || '';

  const applyDevicesFromList = useCallback((devices) => {
    const mics = devices.filter((d) => d.kind === 'audioinput');
    const cams = devices.filter((d) => d.kind === 'videoinput');
    setMicrophones(mics);
    setCameras(cams);
    setMicId((prev) => {
      if (prev && mics.some((m) => m.deviceId === prev)) return prev;
      const stored = localStorage.getItem('pref_mic');
      if (stored && mics.some((m) => m.deviceId === stored)) return stored;
      return mics[0]?.deviceId || '';
    });
    setCamId((prev) => {
      if (prev && cams.some((c) => c.deviceId === prev)) return prev;
      const stored = localStorage.getItem('pref_cam');
      if (stored && cams.some((c) => c.deviceId === stored)) return stored;
      return cams[0]?.deviceId || '';
    });
  }, []);

  const loadDevices = useCallback(async () => {
    setIsRequestingDevices(true);
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let mics = devices.filter((d) => d.kind === 'audioinput');
      let cams = devices.filter((d) => d.kind === 'videoinput');

      const needStream =
        (mics.length === 0 && cams.length === 0) ||
        (mics.length + cams.length > 0 && [...mics, ...cams].every((d) => !d.label));

      if (needStream) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((t) => t.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
        mics = devices.filter((d) => d.kind === 'audioinput');
        cams = devices.filter((d) => d.kind === 'videoinput');
      }

      setPermissionBlocked(false);
      applyDevicesFromList(devices);
    } catch {
      setPermissionBlocked(true);
      setMicrophones([]);
      setCameras([]);
      setMicId('');
      setCamId('');
    } finally {
      setIsRequestingDevices(false);
    }
  }, [applyDevicesFromList]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDevices();
      } catch {
        if (!cancelled) {
          setPermissionBlocked(true);
          setMicrophones([]);
          setCameras([]);
          setIsRequestingDevices(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDevices]);

  const requestDeviceAccess = useCallback(async () => {
    setIsRequestingDevices(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      setPermissionBlocked(false);
      applyDevicesFromList(devices);
    } catch {
      setPermissionBlocked(true);
    } finally {
      setIsRequestingDevices(false);
    }
  }, [applyDevicesFromList]);

  const handleAvatarClick = () => {
    fileRef.current?.click();
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLocalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    e.target.value = '';
  };

  useEffect(
    () => () => {
      if (avatarLocalUrl) URL.revokeObjectURL(avatarLocalUrl);
    },
    [avatarLocalUrl],
  );

  const handleMicChange = useCallback((e) => {
    const next = e.target.value;
    setMicId(next);
    if (next) localStorage.setItem('pref_mic', next);
  }, []);

  const handleCamChange = useCallback((e) => {
    const next = e.target.value;
    setCamId(next);
    if (next) localStorage.setItem('pref_cam', next);
  }, []);

  const handleSave = () => {
    console.log('Profile save (simulated API)', { firstName, lastName });
  };

  const handleCancel = () => {
    setFirstName(initialSnapshot.firstName);
    setLastName(initialSnapshot.lastName);
    setAvatarLocalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleChangePassword = () => {
    console.log('Redirecting to password reset...');
  };

  const handleDeleteData = () => {
    const ok = window.confirm('Are you sure you want to delete all recording data?');
    console.log('Delete recording data confirmed:', ok);
  };

  const micLabel = (d, i) => (d.label && d.label.trim()) || `Microphone ${i + 1}`;
  const camLabel = (d, i) => (d.label && d.label.trim()) || `Camera ${i + 1}`;

  const selectMicDisabled = isRequestingDevices || permissionBlocked || microphones.length === 0;
  const selectCamDisabled = isRequestingDevices || permissionBlocked || cameras.length === 0;

  return (
    <div className="dashboard-page-new settings-profile-page">
      <div className="dashboard-shell settings-profile-shell">
        <div className="settings-profile-inner">
          <section
            className="dashboard-card settings-profile-card settings-profile-card--main dashboard-anim-left dashboard-anim-delay-2"
            aria-labelledby="settings-profile-heading"
          >
            <header className="settings-profile-card-header">
              <h2 id="settings-profile-heading" className="settings-profile-card-title">
                Profile
              </h2>
            </header>

            <div className="settings-profile-main-body">
              <button
                type="button"
                className="settings-profile-avatar-btn"
                onClick={handleAvatarClick}
                aria-label="Change profile picture"
              >
                <span className="settings-profile-avatar-ring">
                  {avatarLocalUrl ? (
                    <img src={avatarLocalUrl} alt="" className="settings-profile-avatar-img" />
                  ) : remoteAvatarUrl && !avatarRemoteFailed ? (
                    <img
                      src={remoteAvatarUrl}
                      alt=""
                      className="settings-profile-avatar-img"
                      onError={() => setAvatarRemoteFailed(true)}
                    />
                  ) : (
                    <span className="settings-profile-avatar-placeholder" aria-hidden="true">
                      {avatarInitials}
                    </span>
                  )}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="settings-profile-file-input"
                onChange={handleAvatarFile}
                aria-hidden="true"
                tabIndex={-1}
              />

              <div className="settings-profile-form-block">
                <div className="settings-profile-name-row">
                  <div className="settings-profile-field">
                    <label className="settings-profile-label" htmlFor="settings-first-name">
                      First Name
                    </label>
                    <input
                      id="settings-first-name"
                      className="settings-profile-input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="settings-profile-field">
                    <label className="settings-profile-label" htmlFor="settings-last-name">
                      Last Name
                    </label>
                    <input
                      id="settings-last-name"
                      className="settings-profile-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="settings-profile-field">
                  <label className="settings-profile-label" htmlFor="settings-email">
                    Email
                  </label>
                  <input
                    id="settings-email"
                    className="settings-profile-input settings-profile-input--readonly"
                    value={email}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div className="settings-profile-btn-row">
                  <button type="button" className="settings-profile-btn settings-profile-btn--cancel" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="button" className="settings-profile-btn settings-profile-btn--save" onClick={handleSave}>
                    Save
                  </button>
                </div>

                <button
                  type="button"
                  className="settings-profile-btn settings-profile-btn--navy settings-profile-btn-full"
                  onClick={handleChangePassword}
                >
                  Change Password
                </button>
              </div>
            </div>
          </section>

          <div className="settings-profile-rail-column">
            <section
              className="dashboard-card settings-profile-card settings-profile-card--hardware dashboard-anim-right dashboard-anim-delay-3"
              aria-labelledby="settings-hardware-heading"
            >
              <header className="settings-profile-card-header">
                <h2 id="settings-hardware-heading" className="settings-profile-card-title">
                  Hardware
                </h2>
              </header>

              {permissionBlocked && !isRequestingDevices && (
                <div className="settings-profile-permission-hint">
                  <p className="settings-profile-permission-text">Camera and microphone access is required to list devices.</p>
                  <button type="button" className="settings-profile-btn settings-profile-btn--navy" onClick={requestDeviceAccess}>
                    Allow camera &amp; microphone
                  </button>
                </div>
              )}

              <div className="settings-profile-hardware-stack">
                <div className="settings-profile-hardware-row">
                  <label className="settings-profile-label settings-profile-label--hardware" htmlFor="settings-mic">
                    Microphone
                  </label>
                  <select
                    id="settings-mic"
                    className="settings-profile-select"
                    value={isRequestingDevices ? '' : micId}
                    onChange={handleMicChange}
                    disabled={selectMicDisabled}
                  >
                    {isRequestingDevices ? (
                      <option value="">Requesting permissions…</option>
                    ) : permissionBlocked ? (
                      <option value="">Grant permission to see devices</option>
                    ) : microphones.length === 0 ? (
                      <option value="">No microphone found</option>
                    ) : (
                      microphones.map((d, i) => (
                        <option key={d.deviceId || `mic-${i}`} value={d.deviceId}>
                          {micLabel(d, i)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="settings-profile-hardware-row">
                  <label className="settings-profile-label settings-profile-label--hardware" htmlFor="settings-cam">
                    Camera
                  </label>
                  <select
                    id="settings-cam"
                    className="settings-profile-select"
                    value={isRequestingDevices ? '' : camId}
                    onChange={handleCamChange}
                    disabled={selectCamDisabled}
                  >
                    {isRequestingDevices ? (
                      <option value="">Requesting permissions…</option>
                    ) : permissionBlocked ? (
                      <option value="">Grant permission to see devices</option>
                    ) : cameras.length === 0 ? (
                      <option value="">No camera found</option>
                    ) : (
                      cameras.map((d, i) => (
                        <option key={d.deviceId || `cam-${i}`} value={d.deviceId}>
                          {camLabel(d, i)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </section>

            <section
              className="dashboard-card settings-profile-card settings-profile-card--session dashboard-anim-right dashboard-anim-delay-4"
              aria-labelledby="settings-session-heading"
            >
              <header className="settings-profile-card-header">
                <h2 id="settings-session-heading" className="settings-profile-card-title">
                  Session / Recording Data
                </h2>
              </header>
              <button
                type="button"
                className="settings-profile-btn settings-profile-btn--danger settings-profile-btn-full"
                onClick={handleDeleteData}
              >
                Delete Data
              </button>
            </section>

            <section
              className="dashboard-card settings-profile-card settings-profile-card--legal dashboard-anim-right dashboard-anim-delay-5"
              aria-labelledby="settings-legal-heading"
            >
              <header className="settings-profile-card-header">
                <h2 id="settings-legal-heading" className="settings-profile-card-title">
                  Legal
                </h2>
              </header>
              <div className="settings-profile-legal-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  type="button"
                  className="settings-profile-btn settings-profile-btn--navy settings-profile-btn-full"
                  onClick={showTerms}
                >
                  Terms & Conditions
                </button>
                <button
                  type="button"
                  className="settings-profile-btn settings-profile-btn--navy settings-profile-btn-full"
                  onClick={showPrivacy}
                >
                  Privacy Policy
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={closeLegal}
        title={legalModal.title}
        content={legalModal.content}
      />
    </div>
  );
}

export default SettingsProfilePage;
