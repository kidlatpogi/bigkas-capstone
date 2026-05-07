import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronForward, IoCamera, IoColorPalette, IoLockClosed, IoArrowBack } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import './SettingsProfilePageMobile.css';

// Import decorative assets
import mascotSprite from '../../assets/Sprites/Robot/0001.webp';
import goldRank from '../../assets/Sprites/Rank/rank-gold.png';
import legendaryRank from '../../assets/Sprites/Rank/rank-legendary.png';

function SettingsProfilePageMobile() {
  const navigate = useNavigate();
  const { user, updateProfile, uploadAvatar } = useAuthContext();
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
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [heroTheme, setHeroTheme] = useState(() => {
    return localStorage.getItem('pref_hero_theme') || 'emerald';
  });

  useEffect(() => {
    if (user) {
      const fn = user.firstName || '';
      const ln = user.lastName || '';
      setFirstName(fn);
      setLastName(ln);
      setInitialSnapshot({ firstName: fn, lastName: ln });
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('pref_hero_theme', heroTheme);
  }, [heroTheme]);

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
        const uploadRes = await uploadAvatar(avatarFile);
        if (uploadRes.success) {
          avatarUrl = uploadRes.url;
        } else {
          throw new Error(uploadRes.error || 'Failed to upload avatar.');
        }
      }

      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        avatarUrl
      });

      setInitialSnapshot({ firstName, lastName });
      setAvatarFile(null);
      setAvatarRemoved(false);
      setUpdateMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Auto-dismiss success message after 3s
      setTimeout(() => setUpdateMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setUpdateMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const userInitials = useMemo(() => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  }, [firstName, lastName]);

  return (
    <div className="sp-mobile-page">
      {/* Header Bar */}
      <header className="sp-mobile-header">
        <button className="sp-back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1 className="sp-header-title">Edit Profile</h1>
        <div className="sp-header-right" />
      </header>

      <div className="sp-mobile-scroll">
        <div className={`sp-mobile-hero hero-theme--${heroTheme}`}>
          <div className="hero-decoration">
            {heroTheme === 'mascot' && <img src={mascotSprite} alt="" className="decoration-img decoration-mascot" />}
            {heroTheme === 'trophy' && <img src={legendaryRank} alt="" className="decoration-img decoration-trophy" />}
            {heroTheme === 'gold' && <img src={goldRank} alt="" className="decoration-img decoration-trophy" />}
          </div>
          
          <div className="hero-avatar-wrapper">
            <button type="button" className="hero-avatar-btn" onClick={handleAvatarClick} aria-label="Change avatar">
              <div className="hero-avatar-ring">
                {(avatarLocalUrl || (user?.avatarUrl && !avatarRemoved)) ? (
                  <img
                    src={avatarLocalUrl || user.avatarUrl}
                    alt="Avatar"
                    className="hero-avatar-img"
                  />
                ) : (
                  <div className="hero-avatar-placeholder">{userInitials}</div>
                )}
              </div>
              <div className="hero-avatar-camera">
                <IoCamera />
              </div>
            </button>
          </div>

          <button 
            type="button" 
            className="hero-theme-trigger-mobile" 
            onClick={() => setIsThemeModalOpen(true)}
          >
            <IoColorPalette />
          </button>
        </div>

        <div className="sp-mobile-content">
          {updateMessage.text && (
            <div className={`sp-status-message-mobile sp-status-message-mobile--${updateMessage.type}`}>
              {updateMessage.text}
            </div>
          )}

          <form className="sp-mobile-form" onSubmit={handleSubmit}>
            <div className="sp-mobile-section">
              <h2 className="sp-section-label">Personal Details</h2>
              <div className="sp-mobile-field">
                <label className="sp-field-label">First Name</label>
                <input
                  type="text"
                  className="sp-mobile-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                />
              </div>
              <div className="sp-mobile-field">
                <label className="sp-field-label">Last Name</label>
                <input
                  type="text"
                  className="sp-mobile-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div className="sp-mobile-section">
              <h2 className="sp-section-label">Account</h2>
              <div className="sp-mobile-field">
                <label className="sp-field-label">Email Address</label>
                <div className="sp-mobile-input sp-mobile-input--read-only">
                  {user?.email}
                </div>
                <p className="sp-field-help">Managed by your account provider.</p>
              </div>
            </div>

            <div className="sp-mobile-section">
              <h2 className="sp-section-label">Security</h2>
              <Button 
                variant="practice" 
                className="sp-mobile-action-btn"
                onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}
                fullWidth
              >
                Change Password
              </Button>
            </div>

            <div className="sp-mobile-footer-actions">
               {hasChanges && (
                 <>
                   <Button
                     type="button"
                     variant="ghost"
                     onClick={handleCancel}
                     className="sp-footer-btn"
                   >
                     Cancel
                   </Button>
                   <Button
                     type="submit"
                     variant="practice"
                     isLoading={isUpdating}
                     className="sp-footer-btn"
                   >
                     Save Changes
                   </Button>
                 </>
               )}
            </div>
          </form>
        </div>
      </div>

      {/* Modals adapted for mobile */}
      {isAvatarModalOpen && (
        <div className="sp-mobile-drawer-overlay" onClick={() => setIsAvatarModalOpen(false)}>
          <div className="sp-mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sp-drawer-handle" />
            <h3 className="sp-drawer-title">Profile Photo</h3>
            <div className="sp-drawer-actions">
              <button className="sp-drawer-btn" onClick={() => fileRef.current?.click()}>
                Upload New Photo
              </button>
              <button className="sp-drawer-btn sp-drawer-btn--danger" onClick={handleRemoveAvatar}>
                Remove Photo
              </button>
            </div>
            <button className="sp-drawer-close" onClick={() => setIsAvatarModalOpen(false)}>Cancel</button>
            <input type="file" ref={fileRef} className="sp-sr-only" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {isThemeModalOpen && (
        <div className="sp-mobile-drawer-overlay" onClick={() => setIsThemeModalOpen(false)}>
          <div className="sp-mobile-drawer sp-mobile-drawer--large" onClick={(e) => e.stopPropagation()}>
            <div className="sp-drawer-handle" />
            <h3 className="sp-drawer-title">Choose Theme</h3>
            
            <div className="sp-theme-grid">
              <button 
                className={`sp-theme-card ${heroTheme === 'emerald' ? 'is-active' : ''}`}
                onClick={() => setHeroTheme('emerald')}
              >
                <div className="sp-theme-swatch emerald" />
                <span>Emerald</span>
              </button>
              <button 
                className={`sp-theme-card ${heroTheme === 'mascot' ? 'is-active' : ''}`}
                onClick={() => setHeroTheme('mascot')}
              >
                <div className="sp-theme-swatch mascot" />
                <span>B-01</span>
              </button>
              <button className="sp-theme-card is-locked" disabled>
                <div className="sp-theme-swatch trophy">
                  <IoLockClosed />
                </div>
                <span>Legend</span>
              </button>
              <button className="sp-theme-card is-locked" disabled>
                <div className="sp-theme-swatch gold">
                  <IoLockClosed />
                </div>
                <span>Champion</span>
              </button>
            </div>
            
            <button className="sp-drawer-confirm" onClick={() => setIsThemeModalOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsProfilePageMobile;
