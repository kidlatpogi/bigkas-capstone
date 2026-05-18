import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoChevronForward, IoCamera, IoColorPalette, IoLockClosed } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import './SettingsProfilePage.css';

import { getSpriteUrl } from '../../utils/assetUtils';

import { getBigkasLevelFromUser } from '../../utils/activityProgress';
import {
  DEFAULT_PROFILE_THEME,
  getAllowedProfileTheme,
  readStoredProfileTheme,
  writeStoredProfileTheme,
} from '../../utils/profileTheme';
import {
  getClaimedTrophyLevels,
  getFeaturedTrophy,
  getTrophyImageUrl,
  getTrophyTitle,
  setFeaturedTrophyLevel,
} from '../../utils/trophyClaims';
import {
  fetchUserTrophyClaims,
  getClaimedTrophyLevelsFromRows,
  getFeaturedTrophyLevelFromRows,
  setFeaturedTrophyInDB,
} from '../../services/trophiesService';

const mascotSprite = getSpriteUrl('Robot/0002.webp');

const THEME_CONFIG = [
  { id: 'emerald', label: 'Default', requires: 0, decoration: null, className: 'emerald' },
  { id: 'mascot', label: 'B-01', requires: 0, decoration: getSpriteUrl('Robot/0002.webp'), className: 'mascot' },
  { id: 'bronze', label: 'Bronze', requires: 1, decoration: getSpriteUrl('Rank/rank-bronze.webp'), className: 'bronze' },
  { id: 'silver', label: 'Silver', requires: 2, decoration: getSpriteUrl('Rank/rank-silver.webp'), className: 'silver' },
  { id: 'gold', label: 'Gold', requires: 3, decoration: getSpriteUrl('Rank/rank-gold.webp'), className: 'gold' },
  { id: 'mythril', label: 'Mythril', requires: 4, decoration: getSpriteUrl('Rank/rank-mythril.webp'), className: 'mythril' },
  { id: 'trophy', label: 'Legend', requires: 5, decoration: getSpriteUrl('Rank/rank-legendary.webp'), className: 'trophy' },
];

function SettingsProfilePage() {
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
  const [heroTheme, setHeroTheme] = useState(DEFAULT_PROFILE_THEME);
  const [heroThemeUserId, setHeroThemeUserId] = useState(null);
  const [claimedTrophyLevels, setClaimedTrophyLevels] = useState([]);
  const [featuredTrophy, setFeaturedTrophy] = useState(null);

  const userLevel = useMemo(() => getBigkasLevelFromUser(user), [user]);
  const currentLevelNumber = userLevel.levelNumber;
  const activeHeroTheme = useMemo(() => {
    if (heroThemeUserId !== (user?.id || null)) return DEFAULT_PROFILE_THEME;
    return getAllowedProfileTheme(heroTheme, THEME_CONFIG, currentLevelNumber);
  }, [currentLevelNumber, heroTheme, heroThemeUserId, user?.id]);

  const getThemeDecoration = (themeId) => {
    const config = THEME_CONFIG.find(t => t.id === themeId);
    return config?.decoration || null;
  };

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
    const nextTheme = readStoredProfileTheme(user?.id, THEME_CONFIG, currentLevelNumber);
    setHeroTheme(nextTheme);
    setHeroThemeUserId(user?.id || null);
  }, [currentLevelNumber, user?.id]);

  useEffect(() => {
    if (heroThemeUserId !== (user?.id || null)) return;
    if (activeHeroTheme !== heroTheme) {
      setHeroTheme(activeHeroTheme);
      return;
    }
    writeStoredProfileTheme(user?.id, activeHeroTheme);
  }, [activeHeroTheme, heroTheme, heroThemeUserId, user?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setClaimedTrophyLevels([]);
      setFeaturedTrophy(null);
      return undefined;
    }

    fetchUserTrophyClaims(user.id)
      .then(({ trophies, backendUnavailable }) => {
        if (cancelled) return;
        if (backendUnavailable) {
          setClaimedTrophyLevels(getClaimedTrophyLevels(user.id));
          setFeaturedTrophy(getFeaturedTrophy(user.id));
          return;
        }

        const levels = getClaimedTrophyLevelsFromRows(trophies);
        const featuredLevel = getFeaturedTrophyLevelFromRows(trophies);
        setClaimedTrophyLevels(levels);
        setFeaturedTrophy(featuredLevel ? { level: featuredLevel, label: `Level ${featuredLevel} Trophy`, title: getTrophyTitle(featuredLevel) } : null);
      })
      .catch(() => {
        if (cancelled) return;
        setClaimedTrophyLevels([]);
        setFeaturedTrophy(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
    } catch (err) {
      setUpdateMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const userInitials = useMemo(() => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  }, [firstName, lastName]);

  const handleFeatureTrophy = useCallback(async (level) => {
    try {
      const trophies = await setFeaturedTrophyInDB(level);
      const featuredLevel = getFeaturedTrophyLevelFromRows(trophies);
      setClaimedTrophyLevels(getClaimedTrophyLevelsFromRows(trophies));
      setFeaturedTrophy(featuredLevel ? { level: featuredLevel, label: `Level ${featuredLevel} Trophy`, title: getTrophyTitle(featuredLevel) } : null);
    } catch {
      const next = setFeaturedTrophyLevel(user?.id, level);
      setFeaturedTrophy(getFeaturedTrophy(user?.id) || (next ? { level: next, label: `Level ${next} Trophy`, title: getTrophyTitle(next) } : null));
    }
  }, [user?.id]);

  return (
    <div className="settings-profile-page dashboard-page-new">
      <div className="settings-profile-container">
        <div className={`profile-hero-card hero-theme--${activeHeroTheme}`}>
          <div className="hero-decoration">
            {activeHeroTheme === 'mascot' ? (
              <img src={mascotSprite} alt="" className="decoration-img decoration-mascot" />
            ) : (
              getThemeDecoration(activeHeroTheme) && (
                <img
                  src={getThemeDecoration(activeHeroTheme)}
                  alt=""
                  className={`decoration-img ${activeHeroTheme === 'trophy' ? 'decoration-trophy' : 'decoration-rank'}`}
                />
              )
            )}
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
          <div className="hero-info">
            <h1 className="hero-name">{firstName} {lastName}</h1>
            <p className="hero-email">{user?.email}</p>
            {featuredTrophy ? (
              <div className="hero-featured-trophy" aria-label={`Featured trophy: ${featuredTrophy.title}`}>
                <img src={getTrophyImageUrl(featuredTrophy.level)} alt="" className="hero-featured-trophy-img" width="28" height="28" />
                <div className="hero-featured-trophy-copy">
                  <span className="hero-featured-trophy-label">Featured Trophy</span>
                  <strong>{featuredTrophy.title}</strong>
                </div>
              </div>
            ) : null}
            <div className="hero-trophy-shelf" aria-label="Claimed trophy shelf">
              {[1, 2, 3, 4, 5].map((level) => {
                const isClaimed = claimedTrophyLevels.includes(level);
                const isFeatured = featuredTrophy?.level === level;
                return (
                  <button
                    key={level}
                    type="button"
                    className={`hero-trophy-token${isClaimed ? ' is-claimed' : ' is-locked'}${isFeatured ? ' is-featured' : ''}`}
                    disabled={!isClaimed}
                    onClick={() => handleFeatureTrophy(level)}
                    aria-label={isClaimed ? `Feature ${getTrophyTitle(level)}` : `Level ${level} trophy locked`}
                  >
                    <img src={getTrophyImageUrl(level)} alt="" width="22" height="22" />
                    <span>{level}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="hero-theme-trigger"
            onClick={() => setIsThemeModalOpen(true)}
            aria-label="Change theme"
          >
            <IoColorPalette />
            <span>Theme</span>
          </button>
        </div>

        <div className="settings-content-wrapper">
          <div className="settings-main-card">
            {updateMessage.text && (
              <div className={`sp-status-message sp-status-message--${updateMessage.type}`}>
                {updateMessage.text}
              </div>
            )}

            <form className="settings-form" onSubmit={handleSubmit}>
              <div className="settings-form-section">
                <h2 className="section-heading">Personal Details</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      type="text"
                      className="form-input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      type="text"
                      className="form-input"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                    />
                  </div>
                </div>
              </div>

              <div className="settings-divider" />

              <div className="settings-form-section">
                <h2 className="section-heading">Account</h2>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input form-input--disabled"
                    value={user?.email || ''}
                    readOnly
                    disabled
                  />
                  <p className="form-help-text">Email address is managed by your account provider.</p>
                </div>
              </div>

              <div className="settings-divider" />

              <div className="settings-form-section">
                <h2 className="section-heading">Security</h2>
                <div className="security-actions">
                  <Button
                    variant="practice"
                    className="security-btn"
                    onClick={() => navigate(ROUTES.CHANGE_PASSWORD)}
                    icon={IoChevronForward}
                  >
                    Change Password
                  </Button>
                </div>
              </div>

              <div className="settings-footer-actions">
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
          </div>
        </div>
      </div>

      {isAvatarModalOpen && (
        <div
          className="bigkas-modal-scrim sp-modal-backdrop"
          style={{ '--scrim-z': 800 }}
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div className="sp-modal" style={{ width: 'min(400px, 90vw)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="sp-modal-title" style={{ marginBottom: '8px' }}>Edit Photo</h3>
            <p style={{ textAlign: 'center', color: 'var(--sp-text-muted)', fontSize: '14px', marginBottom: '12px' }}>
              Update your profile picture
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Button
                variant="practice"
                onClick={() => fileRef.current?.click()}
              >
                Upload Photo
              </Button>

              <Button
                variant="danger"
                onClick={handleRemoveAvatar}
              >
                Remove Photo
              </Button>

              <Button
                variant="ghost"
                onClick={() => setIsAvatarModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
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

      {isThemeModalOpen && (
        <div
          className="bigkas-modal-scrim sp-modal-backdrop"
          style={{ '--scrim-z': 800 }}
          onClick={() => setIsThemeModalOpen(false)}
        >
          <div className="sp-modal sp-modal--wide" onClick={(e) => e.stopPropagation()}>
            <h3 className="sp-modal-title">Customize Profile Theme</h3>

            <div className="theme-modal-preview">
              <div className={`profile-hero-card profile-hero-card--preview hero-theme--${activeHeroTheme}`}>
                <div className="hero-decoration">
                  {activeHeroTheme === 'mascot' ? (
                    <img src={mascotSprite} alt="" className="decoration-img decoration-mascot" />
                  ) : (
                    getThemeDecoration(activeHeroTheme) && (
                      <img
                        src={getThemeDecoration(activeHeroTheme)}
                        alt=""
                        className={`decoration-img ${activeHeroTheme === 'trophy' ? 'decoration-trophy' : 'decoration-rank'}`}
                      />
                    )
                  )}
                </div>
                <div className="hero-avatar-wrapper">
                  <div className="hero-avatar-ring">
                    {(avatarLocalUrl || (user?.avatarUrl && !avatarRemoved)) ? (
                      <img src={avatarLocalUrl || user.avatarUrl} alt="" className="hero-avatar-img" />
                    ) : (
                      <div className="hero-avatar-placeholder">{userInitials}</div>
                    )}
                  </div>
                </div>
                <div className="hero-info">
                  <h1 className="hero-name">{firstName} {lastName}</h1>
                  <p className="hero-email">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="theme-picker">
              {THEME_CONFIG.map((theme) => {
                const isLocked = currentLevelNumber < theme.requires;
                const isActive = activeHeroTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-option theme-option--${theme.className} ${isActive ? 'is-active' : ''} ${isLocked ? 'theme-option--locked' : ''}`}
                    onClick={() => {
                      if (isLocked) return;
                      setHeroTheme(theme.id);
                      setHeroThemeUserId(user?.id || null);
                    }}
                    disabled={isLocked}
                  >
                    <div className="theme-preview">
                      {isLocked && (
                        <div className="theme-lock-overlay">
                          <IoLockClosed />
                        </div>
                      )}
                    </div>
                    <span>{theme.label}</span>
                    {isLocked && (
                      <div className="theme-rank-banner">Requires Level {theme.requires}</div>
                    )}
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              variant="practice"
              className="sp-modal-cancel"
              onClick={() => setIsThemeModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsProfilePage;
