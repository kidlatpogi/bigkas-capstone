import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoChevronForward, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import './SettingsProfilePage.css';
import './ChangePasswordPage.css';

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
  const { changePassword } = useAuthContext();

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
  const fromParam = new URLSearchParams(location.search).get('from');
  const fromSource = String(location.state?.from || fromParam || '').toLowerCase();
  const breadcrumbParent = fromSource === 'profile'
    ? { label: 'Profile', to: ROUTES.PROFILE }
    : { label: 'Settings', to: ROUTES.SETTINGS };

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
        <div className="profile-hero-card hero-theme--emerald">
          <div className="hero-info">
            <h1 className="hero-name">Security</h1>
            <p className="hero-email" style={{ opacity: 0.9 }}>Update your password to keep your account safe.</p>
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
