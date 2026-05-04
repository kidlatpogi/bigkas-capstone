import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoChevronForward, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline, IoArrowBackOutline } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import './SettingsProfilePage.css';
import './ChangePasswordPage.css';

// Import decorative assets
import mascotSprite from '../../assets/Sprites/Robot/0002.webp';
import bronzeRank from '../../assets/Sprites/Rank/rank-bronze.png';
import silverRank from '../../assets/Sprites/Rank/rank-silver.png';
import goldRank from '../../assets/Sprites/Rank/rank-gold.png';
import mythrilRank from '../../assets/Sprites/Rank/rank-mythril.png';
import legendaryRank from '../../assets/Sprites/Rank/rank-legendary.png';

const THEME_CONFIG = [
  { id: 'emerald', label: 'Default', requires: 0, decoration: null, className: 'emerald' },
  { id: 'mascot', label: 'B-01', requires: 0, decoration: mascotSprite, className: 'mascot' },
  { id: 'bronze', label: 'Bronze', requires: 1, decoration: bronzeRank, className: 'bronze' },
  { id: 'silver', label: 'Silver', requires: 2, decoration: silverRank, className: 'silver' },
  { id: 'gold', label: 'Gold', requires: 3, decoration: goldRank, className: 'gold' },
  { id: 'mythril', label: 'Mythril', requires: 4, decoration: mythrilRank, className: 'mythril' },
  { id: 'trophy', label: 'Legend', requires: 5, decoration: legendaryRank, className: 'trophy' },
];

function PwdField({ label, value, onChange, show, onToggle, placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: 48 }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="cp-visibility-toggle"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <IoEyeOffOutline /> : <IoEyeOutline />}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, changePassword } = useAuthContext();

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isSaving,   setIsSaving]   = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  // Show/hide toggles
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);
  
  const [heroTheme] = useState(() => {
    return localStorage.getItem('pref_hero_theme') || 'emerald';
  });

  const getThemeDecoration = (themeId) => {
    const config = THEME_CONFIG.find(t => t.id === themeId);
    return config?.decoration || null;
  };

  const userInitials = useMemo(() => {
    if (!user) return '?';
    const first = user.firstName || '';
    const last = user.lastName || '';
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
  }, [user]);

  const handleSave = async () => {
    setError('');
    if (!currentPwd || !newPwd || !confirmPwd) {
      setError('All fields are required.');
      return;
    }
    if (newPwd.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      if (result?.success === false) {
        setError(result.error || 'Failed to change password.');
      } else {
        setSuccess(true);
        setTimeout(() => navigate(-1), 1200);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-profile-page">
      <div className="settings-profile-container">
        {/* Hero Banner */}
        <div className={`profile-hero-card hero-theme--${heroTheme}`}>
          <div className="hero-decoration">
            {heroTheme === 'mascot' ? (
              <img src={mascotSprite} alt="" className="decoration-img decoration-mascot" />
            ) : (
              getThemeDecoration(heroTheme) && (
                <img 
                  src={getThemeDecoration(heroTheme)} 
                  alt="" 
                  className={`decoration-img ${heroTheme === 'trophy' ? 'decoration-trophy' : 'decoration-rank'}`} 
                />
              )
            )}
          </div>

          <div className="hero-avatar-wrapper">
            <div className="hero-avatar-ring">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="hero-avatar-img" />
              ) : (
                <div className="hero-avatar-placeholder">{userInitials}</div>
              )}
            </div>
          </div>

          <div className="hero-info" style={{ position: 'relative', zIndex: 2 }}>
            <h1 className="hero-name">{user?.firstName} {user?.lastName}</h1>
            <p className="hero-email" style={{ opacity: 0.9 }}>{user?.email}</p>
          </div>
        </div>

        <div className="settings-content-wrapper">
          <div className="settings-main-card">
            
            {error && (
              <div className="sp-status-message sp-status-message--error">
                {error}
              </div>
            )}
            
            {success && (
              <div className="sp-status-message sp-status-message--success">
                Password changed successfully! Redirecting…
              </div>
            )}

            <div className="settings-form">
              <div className="settings-form-section">
                <h2 className="section-heading">Change Password</h2>
                
                <PwdField
                  label="Current Password"
                  value={currentPwd}
                  onChange={setCurrentPwd}
                  show={showCur}
                  onToggle={() => setShowCur(v => !v)}
                  placeholder="Enter current password"
                />

                <div className="settings-divider" style={{ margin: '8px 0' }} />

                <div className="form-grid">
                  <PwdField
                    label="New Password"
                    value={newPwd}
                    onChange={setNewPwd}
                    show={showNew}
                    onToggle={() => setShowNew(v => !v)}
                    placeholder="Min. 8 characters"
                  />
                  <PwdField
                    label="Confirm New Password"
                    value={confirmPwd}
                    onChange={setConfirmPwd}
                    show={showCon}
                    onToggle={() => setShowCon(v => !v)}
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <div className="settings-footer-actions">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(-1)} 
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  variant="practice" 
                  onClick={handleSave} 
                  disabled={isSaving}
                  isLoading={isSaving}
                >
                  Save New Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
