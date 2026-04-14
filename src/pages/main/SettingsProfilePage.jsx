import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronForward, IoCamera } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import LegalModal from '../../components/Legal/LegalModal';
import { TERMS_AND_CONDITIONS } from '../../constants/legal/terms';
import { PRIVACY_POLICY } from '../../constants/legal/privacy';
import './DashboardPage.css';
import './SettingsProfilePage.css';

function SettingsProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, uploadAvatar } = useAuthContext();
  const fileRef = useRef(null);

  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '', content: '' });
  const showTerms = () => setLegalModal({ isOpen: true, title: 'Terms & Conditions', content: TERMS_AND_CONDITIONS });
  const showPrivacy = () => setLegalModal({ isOpen: true, title: 'Privacy Policy', content: PRIVACY_POLICY });
  const closeLegal = () => setLegalModal((prev) => ({ ...prev, isOpen: false }));

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState({ firstName: '', lastName: '', nickname: '' });

  const [avatarLocalUrl, setAvatarLocalUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarRemoteFailed, setAvatarRemoteFailed] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const remoteAvatarUrl = useMemo(
    () => String(user?.avatar_url || user?.avatarUrl || user?.profileImage || user?.photoURL || '').trim(),
    [user],
  );

  const avatarInitials = useMemo(() => {
    const fromNames = `${firstName || ''} ${lastName || ''}`.trim();
    if (fromNames) {
      const parts = fromNames.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      return (parts[0] || '').slice(0, 2).toUpperCase() || 'U';
    }
    return (user?.email || '').slice(0, 2).toUpperCase() || 'U';
  }, [firstName, lastName, user?.email]);

  const displayAvatarUrl = avatarLocalUrl || (!avatarRemoved && remoteAvatarUrl && !avatarRemoteFailed ? remoteAvatarUrl : null);

  useEffect(() => { setAvatarRemoteFailed(false); }, [remoteAvatarUrl]);

  useEffect(() => {
    if (!user) return;
    const fn = user.firstName || '';
    const ln = user.lastName || '';
    const nn = user.nickname || '';
    setFirstName(fn);
    setLastName(ln);
    setNickname(nn);
    setInitialSnapshot({ firstName: fn, lastName: ln, nickname: nn });
  }, [user]);

  const email = user?.email || '';

  const fullName = useMemo(() => `${firstName.trim()} ${lastName.trim()}`.trim(), [firstName, lastName]);
  const initialFullName = useMemo(
    () => `${initialSnapshot.firstName.trim()} ${initialSnapshot.lastName.trim()}`.trim(),
    [initialSnapshot],
  );

  const hasChanges = useMemo(() => {
    return (
      fullName !== initialFullName ||
      nickname.trim() !== initialSnapshot.nickname.trim() ||
      avatarRemoved ||
      avatarFile !== null
    );
  }, [fullName, initialFullName, nickname, initialSnapshot.nickname, avatarRemoved, avatarFile]);

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setAvatarFile(file);
    setAvatarRemoved(false);
    setShowAvatarModal(false);
    e.target.value = '';
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setAvatarFile(null);
    setAvatarRemoved(true);
    setShowAvatarModal(false);
  }, []);

  useEffect(() => () => { if (avatarLocalUrl) URL.revokeObjectURL(avatarLocalUrl); }, [avatarLocalUrl]);

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    if (!firstName.trim()) { setSaveError('First name is required.'); return; }

    setSaveError('');
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      let newAvatarUrl;
      if (avatarFile && typeof uploadAvatar === 'function') {
        const result = await uploadAvatar(avatarFile);
        if (result?.success) { newAvatarUrl = result.url; }
        else { setSaveError(result?.error || 'Failed to upload avatar.'); setIsSaving(false); return; }
      } else if (avatarRemoved) {
        newAvatarUrl = null;
      }

      const result = await updateProfile({
        name: fullName,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nickname: nickname.trim() || null,
        avatarUrl: newAvatarUrl,
      });

      if (result?.success === false) {
        setSaveError(result.error || 'Failed to save changes.');
      } else {
        setSaveSuccess(true);
        setInitialSnapshot({ firstName: firstName.trim(), lastName: lastName.trim(), nickname: nickname.trim() });
        setAvatarFile(null);
        setAvatarRemoved(false);
      }
    } catch {
      setSaveError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(initialSnapshot.firstName);
    setLastName(initialSnapshot.lastName);
    setNickname(initialSnapshot.nickname);
    setAvatarLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setAvatarFile(null);
    setAvatarRemoved(false);
    setSaveError('');
    setSaveSuccess(false);
  };

  return (
    <div className="dashboard-page-new settings-profile-page">
      <div className="settings-profile-shell">
        <header className="settings-profile-hero dashboard-anim-top">
          <h1 className="settings-profile-hero-title">Profile</h1>
          <p className="settings-profile-hero-sub">
            Your speaking identity — keep it fresh so your journey stays personal.
          </p>
        </header>

        <div className="settings-profile-grid">
          {/* Avatar + Form Card */}
          <section className="dashboard-card settings-profile-card--main dashboard-anim-left dashboard-anim-delay-2">
            <div className="sp-avatar-block">
              <button
                type="button"
                className="sp-avatar-btn"
                onClick={() => setShowAvatarModal(true)}
                aria-label="Change profile picture"
              >
                <span className="sp-avatar-ring">
                  {displayAvatarUrl ? (
                    <img
                      src={displayAvatarUrl}
                      alt=""
                      className="sp-avatar-img"
                      onError={() => setAvatarRemoteFailed(true)}
                    />
                  ) : (
                    <span className="sp-avatar-placeholder" aria-hidden="true">{avatarInitials}</span>
                  )}
                </span>
                <span className="sp-avatar-camera"><IoCamera size={16} /></span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sp-sr-only"
                onChange={handleAvatarChange}
                aria-hidden="true"
                tabIndex={-1}
              />
              <div className="sp-avatar-info">
                <span className="sp-avatar-name">{fullName || 'Your Name'}</span>
                <span className="sp-avatar-email">{email}</span>
              </div>
            </div>

            {saveError && <div className="sp-message sp-message--error">{saveError}</div>}
            {saveSuccess && <div className="sp-message sp-message--success">Profile updated successfully!</div>}

            <div className="sp-form">
              <div className="sp-name-row">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-first-name">First Name</label>
                  <input
                    id="sp-first-name"
                    className="sp-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    placeholder="Juan"
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-last-name">Last Name</label>
                  <input
                    id="sp-last-name"
                    className="sp-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    placeholder="Dela Cruz"
                  />
                </div>
              </div>

              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-email">Email Address</label>
                <input
                  id="sp-email"
                  className="sp-input sp-input--readonly"
                  value={email}
                  readOnly
                  tabIndex={-1}
                />
              </div>

              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-nickname">Nickname</label>
                <input
                  id="sp-nickname"
                  className="sp-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your display name"
                  maxLength={30}
                />
              </div>

              <div className="sp-btn-row">
                <button type="button" className="sp-btn sp-btn--cancel" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </button>
                <button type="button" className="sp-btn sp-btn--save" onClick={handleSave} disabled={isSaving || !hasChanges}>
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </section>

          {/* Quick Links Column */}
          <div className="settings-profile-side-col">
            <section className="dashboard-card settings-profile-card--links dashboard-anim-right dashboard-anim-delay-3">
              <h2 className="sp-card-title">Account</h2>
              <div className="sp-links-stack">
                <button type="button" className="sp-link-row" onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}>
                  <span>Change Password</span>
                  <IoChevronForward size={16} className="sp-link-chevron" />
                </button>
                <button type="button" className="sp-link-row" onClick={() => navigate(ROUTES.ACCOUNT_SETTINGS)}>
                  <span>Account Settings</span>
                  <IoChevronForward size={16} className="sp-link-chevron" />
                </button>
                <button type="button" className="sp-link-row" onClick={() => navigate(ROUTES.SETTINGS)}>
                  <span>App Settings</span>
                  <IoChevronForward size={16} className="sp-link-chevron" />
                </button>
              </div>
            </section>

            <section className="dashboard-card settings-profile-card--legal dashboard-anim-right dashboard-anim-delay-4">
              <h2 className="sp-card-title">Legal</h2>
              <div className="sp-links-stack">
                <button type="button" className="sp-link-row" onClick={showTerms}>
                  <span>Terms &amp; Conditions</span>
                  <IoChevronForward size={16} className="sp-link-chevron" />
                </button>
                <button type="button" className="sp-link-row" onClick={showPrivacy}>
                  <span>Privacy Policy</span>
                  <IoChevronForward size={16} className="sp-link-chevron" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Avatar change modal */}
      {showAvatarModal && (
        <div className="sp-modal-backdrop" onClick={() => setShowAvatarModal(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="sp-modal-title">Profile Picture</h3>
            <button type="button" className="sp-modal-action" onClick={() => fileRef.current?.click()}>
              {displayAvatarUrl ? 'Change Photo' : 'Upload Photo'}
            </button>
            {displayAvatarUrl && (
              <button type="button" className="sp-modal-action sp-modal-action--danger" onClick={handleRemoveAvatar}>
                Remove Photo
              </button>
            )}
            <button type="button" className="sp-modal-cancel" onClick={() => setShowAvatarModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <LegalModal isOpen={legalModal.isOpen} onClose={closeLegal} title={legalModal.title} content={legalModal.content} />
    </div>
  );
}

export default SettingsProfilePage;
