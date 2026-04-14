import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import { supabase } from '../../lib/supabase';
import './ProfilePage.css';

const CameraIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const fileRef  = useRef(null);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isSaving,        setIsSaving]        = useState(false);
  const [errors,          setErrors]          = useState({});
  const [saveError,       setSaveError]       = useState('');
  const [initialData,     setInitialData]     = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    email: '',
    avatarUri: null,
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    email: '',
    avatarUri: null,
  });

  const profileLoaded = useRef(false);

  useEffect(() => {
    if (!user || profileLoaded.current) return;

    const nextData = {
      firstName: user.firstName || '',
      lastName:  user.lastName  || '',
      nickname:  user.nickname  || '',
      email:     user.email     || '',
      avatarUri: user.avatar_url || null,
    };

    setInitialData(nextData);
    setFormData(nextData);
    profileLoaded.current = true;
  }, [user]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const hasChanges = useMemo(() => {
    return (
      formData.firstName.trim() !== initialData.firstName.trim() ||
      formData.lastName.trim() !== initialData.lastName.trim() ||
      formData.nickname.trim() !== initialData.nickname.trim() ||
      (formData.avatarUri || null) !== (initialData.avatarUri || null)
    );
  }, [formData, initialData]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previousAvatar = formData.avatarUri;
    const localPreview = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, avatarUri: localPreview }));
    setAvatarModalOpen(false);
    setAvatarUploading(true);

    try {
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        setErrors(prev => ({ ...prev, avatar: 'Failed to upload profile picture.' }));
        setFormData(prev => ({ ...prev, avatarUri: previousAvatar }));
      } else {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        setFormData(prev => ({ ...prev, avatarUri: publicUrl || previousAvatar }));
        setErrors(prev => ({ ...prev, avatar: undefined }));
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setErrors(prev => ({ ...prev, avatar: 'Failed to upload profile picture.' }));
      setFormData(prev => ({ ...prev, avatarUri: previousAvatar }));
    } finally {
      setAvatarUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatarUri: null }));
    setAvatarModalOpen(false);
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) return;
    if (!formData.firstName.trim()) {
      setErrors({ firstName: 'First name is required' });
      return;
    }
    setIsSaving(true);
    try {
      await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName.trim(),
          last_name:  formData.lastName.trim(),
          full_name:  `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          nickname:   formData.nickname.trim(),
          avatar_url: formData.avatarUri || null,
        },
      });
      setInitialData({ ...formData, avatarUri: formData.avatarUri || null });
      navigate(-1);
    } catch {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialData);
    setErrors({});
    setAvatarModalOpen(false);
    navigate(ROUTES.SETTINGS);
  };

  const initials = formData.firstName
    ? `${formData.firstName[0]}${formData.lastName?.[0] || ''}`.toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="profile-page">
      <header className="profile-hero dashboard-anim-top">
        <h1 className="profile-hero-title">Edit Profile</h1>
        <p className="profile-hero-sub">Refine your profile to keep your speaking journey personalized.</p>
      </header>

      <div className="profile-layout">
        <div className="profile-col-avatar dashboard-anim-left dashboard-anim-delay-2">
          <div className="profile-avatar-wrap">
            <button
              className="profile-avatar-btn"
              onClick={() => setAvatarModalOpen(true)}
              type="button"
            >
              <div className="profile-avatar-ring">
                {formData.avatarUri ? (
                  <img
                    src={formData.avatarUri}
                    alt="Avatar"
                    className="profile-avatar-img"
                    onError={() => setFormData(prev => ({ ...prev, avatarUri: null }))}
                  />
                ) : (
                  <div className="profile-avatar-placeholder">{initials}</div>
                )}
              </div>
              <div className="profile-avatar-camera-badge">
                <CameraIcon size={20} />
              </div>
            </button>

            {avatarUploading && (
              <p className="profile-avatar-status">Uploading…</p>
            )}
          </div>

          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {errors.avatar && <span className="profile-field-error">{errors.avatar}</span>}

          <p className="profile-avatar-hint">Tap the avatar to change your picture</p>
        </div>

        <div className="profile-col-form">
          <div className="profile-form-grid dashboard-anim-right dashboard-anim-delay-3">
            <div className="profile-field">
              <label className="profile-label" htmlFor="pf-first">First Name</label>
              <input
                id="pf-first"
                className={`profile-input${errors.firstName ? ' input-error' : ''}`}
                value={formData.firstName}
                onChange={e => updateField('firstName', e.target.value)}
                placeholder="First name"
              />
              {errors.firstName && (
                <span className="profile-field-error">{errors.firstName}</span>
              )}
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="pf-last">Last Name</label>
              <input
                id="pf-last"
                className="profile-input"
                value={formData.lastName}
                onChange={e => updateField('lastName', e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="profile-field dashboard-anim-right dashboard-anim-delay-4">
            <label className="profile-label" htmlFor="pf-email">Email Address</label>
            <input
              id="pf-email"
              className="profile-input profile-input--readonly"
              value={formData.email}
              readOnly
              disabled
              tabIndex={-1}
            />
          </div>

          <div className="profile-field dashboard-anim-right dashboard-anim-delay-5">
            <label className="profile-label" htmlFor="pf-nick">Nickname</label>
            <input
              id="pf-nick"
              className="profile-input"
              value={formData.nickname}
              onChange={e => updateField('nickname', e.target.value)}
              placeholder="@nickname"
            />
          </div>

          {saveError && <p className="profile-field-error profile-field-error--center">{saveError}</p>}

          <div className="profile-actions dashboard-anim-bottom dashboard-anim-delay-6">
            <button
              className="profile-btn profile-btn--save"
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving || avatarUploading || !hasChanges}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              className="profile-btn profile-btn--cancel"
              type="button"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {avatarModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setAvatarModalOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="profile-modal-title">Profile Picture</h3>

            {formData.avatarUri ? (
              <>
                <button
                  type="button"
                  className="profile-modal-action"
                  onClick={() => {
                    fileRef.current?.click();
                    setAvatarModalOpen(false);
                  }}
                >
                  Change Profile Picture
                </button>
                <button
                  type="button"
                  className="profile-modal-action profile-modal-action--danger"
                  onClick={handleRemoveAvatar}
                >
                  Remove Profile Picture
                </button>
              </>
            ) : (
              <button
                type="button"
                className="profile-modal-action"
                onClick={() => {
                  fileRef.current?.click();
                  setAvatarModalOpen(false);
                }}
              >
                Add Profile Picture
              </button>
            )}

            <button
              type="button"
              className="profile-modal-close"
              onClick={() => setAvatarModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
