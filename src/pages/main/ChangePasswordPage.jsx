import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import './InnerPages.css';
import './ChangePasswordPage.css';

function PwdField({ label, value, onChange, show, onToggle }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="cp-visibility-toggle"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? 'Hide' : 'Show'}
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
    <div className="subpage-layout change-password-layout">
      <div className="subpage-frame">
        <nav className="subpage-breadcrumb" aria-label="Breadcrumb">
          <Link className="subpage-breadcrumb-link" to={breadcrumbParent.to}>
            {breadcrumbParent.label}
          </Link>
          <span className="subpage-breadcrumb-sep">&gt;</span>
          <span className="subpage-breadcrumb-current">Change Password</span>
        </nav>

        <div className="inner-page change-password-page">
          <div className="inner-page-header change-password-header">
            <h1 className="inner-page-title">Change Password</h1>
          </div>

          {error && <div className="page-error">{error}</div>}
          {success && <div className="page-success">Password changed! Redirecting…</div>}

          <PwdField
            label="Current Password"
            value={currentPwd}
            onChange={setCurrentPwd}
            show={showCur}
            onToggle={() => setShowCur(v => !v)}
          />
          <PwdField
            label="New Password"
            value={newPwd}
            onChange={setNewPwd}
            show={showNew}
            onToggle={() => setShowNew(v => !v)}
          />
          <PwdField
            label="Confirm New Password"
            value={confirmPwd}
            onChange={setConfirmPwd}
            show={showCon}
            onToggle={() => setShowCon(v => !v)}
          />

          <div className="btn-row">
            <button className="btn-secondary" onClick={() => navigate(-1)} disabled={isSaving}>Cancel</button>
            <button className="btn-primary cp-btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save New Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
