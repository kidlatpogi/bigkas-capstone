import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronForward, IoCamera } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import './EditProfilePage.css';

function EditProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, uploadAvatar } = useAuthContext();

  const goBack = () => navigate(-1);

  const initialFirstName = user?.firstName || user?.name?.split(' ')[0] || '';
  const initialLastName = user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '';
  const initialNickname = user?.nickname || '';
  const initialAvatarUrl = user?.avatar_url || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [nickname, setNickname] = useState(initialNickname);
  const [email] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ firstName: '', lastName: '' });
  const fileRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (avatarUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarUrl);
    }

    setAvatarFile(file);
    setAvatarRemoved(false);
    setAvatarUrl(URL.createObjectURL(file));
    setShowAvatarModal(false);
  };

  const handleRemoveAvatar = () => {
    if (avatarUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarUrl);
    }

    setAvatarFile(null);
    setAvatarRemoved(true);
    setAvatarUrl('');
    setShowAvatarModal(false);
  };

  const fullName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.trim(),
    [firstName, lastName]
  );

  const initialFullName = useMemo(
    () => `${initialFirstName.trim()} ${initialLastName.trim()}`.trim(),
    [initialFirstName, initialLastName]
  );

  const hasChanges = useMemo(() => {
    return (
      fullName !== initialFullName ||
      nickname.trim() !== initialNickname.trim() ||
      avatarRemoved ||
      avatarFile !== null
    );
  }, [fullName, initialFullName, nickname, initialNickname, avatarRemoved, avatarFile]);

  const isSaveDisabled = isSaving || !hasChanges;

  const handleSave = async () => {
    if (isSaveDisabled) return;

    const nextErrors = { firstName: '', lastName: '' };
    if (!firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required';

    if (nextErrors.firstName || nextErrors.lastName) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({ firstName: '', lastName: '' });
    setError('');
    setIsSaving(true);

    try {
      let newAvatarUrl;

      if (avatarFile && typeof uploadAvatar === 'function') {
        const result = await uploadAvatar(avatarFile);
        if (result?.success) {
          newAvatarUrl = result.url;
        } else {
          setError(result?.error || 'Failed to upload avatar.');
          setIsSaving(false);
          return;
        }
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
        setError(result.error || 'Failed to save changes.');
      } else {
        setSuccess(true);
        setTimeout(() => goBack(), 650);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-shell">
        <div className="edit-profile-header">
          <h1 className="edit-profile-title">Edit Profile</h1>
        </div>

        {error && <div className="page-error">{error}</div>}
        {success && <div className="page-success">Profile updated successfully!</div>}

        <div className="edit-avatar-wrap">
          <button
            type="button"
            className="edit-avatar-btn"
            onClick={() => setShowAvatarModal(true)}
            aria-label="Change profile picture"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="edit-avatar-img" />
            ) : (
              <div className="edit-avatar-placeholder">{initials || 'U'}</div>
            )}
            <span className="edit-avatar-camera"><IoCamera size={14} /></span>
          </button>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            className="edit-avatar-input"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="edit-profile-form">
          <div className="edit-profile-row">
            <div className="edit-field">
              <label className="edit-label">FIRST NAME</label>
              <input
                className={`edit-input ${fieldErrors.firstName ? 'is-error' : ''}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
              />
              {fieldErrors.firstName && <span className="edit-error">{fieldErrors.firstName}</span>}
            </div>

            <div className="edit-field">
              <label className="edit-label">LAST NAME</label>
              <input
                className={`edit-input ${fieldErrors.lastName ? 'is-error' : ''}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
              />
              {fieldErrors.lastName && <span className="edit-error">{fieldErrors.lastName}</span>}
            </div>
          </div>

          <div className="edit-field">
            <label className="edit-label">EMAIL ADDRESS</label>
            <input className="edit-input" value={email} disabled readOnly />
          </div>

          <div className="edit-field">
            <label className="edit-label">NICKNAME</label>
            <input
              className="edit-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your display name"
              maxLength={30}
            />
          </div>

          <button
            type="button"
            className="edit-nav-row"
            onClick={() => navigate(ROUTES.CHANGE_PASSWORD, { state: { from: 'profile' } })}
          >
            <span>Change Password</span>
            <IoChevronForward size={18} />
          </button>

          <button
            type="button"
            className="edit-nav-row"
            onClick={() => navigate(ROUTES.ACCOUNT_SETTINGS, { state: { from: 'profile' } })}
          >
            <span>Account Settings</span>
            <IoChevronForward size={18} />
          </button>
        </div>

        <div className="edit-actions">
          <button
            type="button"
            className="edit-save"
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>

          <button
            type="button"
            className="edit-cancel"
            onClick={goBack}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>

      {showAvatarModal && (
        <div className="edit-avatar-modal-overlay" onClick={() => setShowAvatarModal(false)}>
          <div className="edit-avatar-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="edit-avatar-modal-title">Change Profile Photo</h3>

            <button
              type="button"
              className="edit-avatar-modal-action"
              onClick={() => fileRef.current?.click()}
            >
              Choose from device
            </button>

            <button
              type="button"
              className="edit-avatar-modal-action danger"
              onClick={handleRemoveAvatar}
              disabled={!avatarUrl && !avatarFile}
            >
              Remove current photo
            </button>

            <button
              type="button"
              className="edit-avatar-modal-cancel"
              onClick={() => setShowAvatarModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProfilePage;
