import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronForward, IoCamera } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import './SettingsProfilePage.css';

function SettingsProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, uploadAvatar, logout } = useAuthContext();
  const fileRef = useRef(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState({ firstName: '', lastName: '' });

  const [avatarLocalUrl, setAvatarLocalUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ type: '', text: '' });

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const fn = user.firstName || '';
      const ln = user.lastName || '';
      setFirstName(fn);
      setLastName(ln);
      setInitialSnapshot({ firstName: fn, lastName: ln });
    }
  }, [user]);

  const hasChanges = useMemo(() => {
    return firstName !== initialSnapshot.firstName ||
           lastName !== initialSnapshot.lastName ||
           avatarFile !== null ||
           avatarRemoved;
  }, [firstName, lastName, initialSnapshot, avatarFile, avatarRemoved]);

  const handleAvatarClick = () => {
    setIsAvatarModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarLocalUrl(URL.createObjectURL(file));
      setAvatarRemoved(false);
      setIsAvatarModalOpen(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarLocalUrl(null);
    setAvatarRemoved(true);
    setIsAvatarModalOpen(false);
  };

  const handleCancel = () => {
    setFirstName(initialSnapshot.firstName);
    setLastName(initialSnapshot.lastName);
    setAvatarFile(null);
    setAvatarLocalUrl(null);
    setAvatarRemoved(false);
    setUpdateMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges || isUpdating) return;

    setIsUpdating(true);
    setUpdateMessage({ type: '', text: '' });

    try {
      let avatarUrl = user.avatarUrl;

      if (avatarRemoved) {
        avatarUrl = null;
      } else if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      await updateProfile({
        firstName,
        lastName,
        avatarUrl
      });

      setInitialSnapshot({ firstName, lastName });
      setAvatarFile(null);
      setAvatarRemoved(false);
      setUpdateMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setUpdateMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (err) {
      setUpdateMessage({ type: 'error', text: 'Failed to log out.' });
    }
  };

  const userInitials = useMemo(() => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  }, [firstName, lastName]);

  return (
    <div className="settings-profile-page dashboard-page-new">
      <div className="settings-profile-shell">
        
        <div className="settings-profile-grid">
          <section className="sp-widget">
            <h2 className="sp-widget-title">Personal Info</h2>
            <div className="sp-avatar-block">
              <button type="button" className="sp-avatar-btn" onClick={handleAvatarClick} aria-label="Change avatar">
                <div className="sp-avatar-ring">
                  {(avatarLocalUrl || (user?.avatarUrl && !avatarRemoved)) ? (
                    <img
                      src={avatarLocalUrl || user.avatarUrl}
                      alt="Avatar"
                      className="sp-avatar-img"
                    />
                  ) : (
                    <div className="sp-avatar-placeholder">{userInitials}</div>
                  )}
                </div>
                <div className="sp-avatar-camera">
                  <IoCamera />
                </div>
              </button>
              <div className="sp-avatar-info">
                <h2 className="sp-avatar-name">{firstName} {lastName}</h2>
                <p className="sp-avatar-email">{user?.email}</p>
              </div>
            </div>

            {updateMessage.text && (
              <div className={`sp-message sp-message--${updateMessage.type}`}>
                {updateMessage.text}
              </div>
            )}

            <form className="sp-form" onSubmit={handleSubmit}>
              <div className="sp-name-row">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    className="sp-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className="sp-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="sp-field">
                <label className="sp-label">Email Address</label>
                <input
                  type="email"
                  className="sp-input sp-input--readonly"
                  value={user?.email || ''}
                  readOnly
                  disabled
                />
              </div>

              <div className="sp-btn-row">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={!hasChanges || isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="practice"
                  disabled={!hasChanges || isUpdating}
                  isLoading={isUpdating}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </section>

          <div className="settings-profile-side-col">
            <section className="sp-widget">
              <h3 className="sp-widget-title">Account Actions</h3>
              <div className="sp-links-stack">
                <Button variant="practice" onClick={() => {}} icon={IoChevronForward}>
                  Change Password
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {isAvatarModalOpen && (
        <div className="sp-modal-backdrop" onClick={() => setIsAvatarModalOpen(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="sp-modal-title">Edit Photo</h3>
            <button type="button" className="sp-modal-action" onClick={() => fileRef.current?.click()}>
              Upload Photo
            </button>
            <button type="button" className="sp-modal-action sp-modal-action--danger" onClick={handleRemoveAvatar}>
              Remove Photo
            </button>
            <button type="button" className="sp-modal-cancel" onClick={() => setIsAvatarModalOpen(false)}>
              Cancel
            </button>
            <input
              type="file"
              ref={fileRef}
              className="sp-sr-only"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsProfilePage;
