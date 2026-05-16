import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/common/BackButton';
import PasswordToggle from '../../components/common/PasswordToggle';
import PushButton from '../../components/common/PushButton';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import { isValidEmail } from '../../utils/validators';
import { getAssetUrl } from '../../utils/assetUtils';
import './AdminLoginPage.css';

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');
const ADMIN_LOGIN_LOCKOUT_UNTIL_KEY = 'bigkas_admin_login_lockout_until';
const LOGIN_LOCKOUT_SECONDS = 30;

function normalizeLockoutSeconds(value) {
  const seconds = Math.ceil(Number(value) || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(LOGIN_LOCKOUT_SECONDS, seconds);
}

function getStoredLockoutSeconds() {
  if (typeof window === 'undefined') return 0;

  const rawValue = window.localStorage.getItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY);
  const lockoutUntil = rawValue ? Number.parseInt(rawValue, 10) : 0;

  if (!Number.isFinite(lockoutUntil)) {
    window.localStorage.removeItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY);
    return 0;
  }

  const secondsRemaining = Math.ceil((lockoutUntil - Date.now()) / 1000);

  if (secondsRemaining <= 0) {
    window.localStorage.removeItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY);
    return 0;
  }

  const clampedRemaining = normalizeLockoutSeconds(secondsRemaining);
  if (clampedRemaining !== secondsRemaining) {
    window.localStorage.setItem(
      ADMIN_LOGIN_LOCKOUT_UNTIL_KEY,
      String(Date.now() + clampedRemaining * 1000)
    );
  }

  return clampedRemaining;
}

function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function AdminLoginPage({ managePageClass = true }) {
  const navigate = useNavigate();
  const { adminLogin, isLoading } = useAuthContext();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(() => getStoredLockoutSeconds());

  useEffect(() => {
    if (!managePageClass) return undefined;

    document.documentElement.classList.add('admin-login-page-active');
    document.body.classList.add('admin-login-page-active');

    return () => {
      document.documentElement.classList.remove('admin-login-page-active');
      document.body.classList.remove('admin-login-page-active');
    };
  }, [managePageClass]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setLockoutSeconds(getStoredLockoutSeconds());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  const isLockedOut = lockoutSeconds > 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name] || errors.submit) {
      setErrors((prev) => ({ ...prev, [name]: null, submit: null }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.email) {
      nextErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLockedOut || isLoading || !validate()) return;

    const result = await adminLogin(formData.email, formData.password);

    if (result.success) {
      setFormData({ email: '', password: '' });
      setLockoutSeconds(0);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY);
      }
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      return;
    }

    if (result.code === 'account_locked') {
      const seconds = normalizeLockoutSeconds(result.lockoutSeconds) || LOGIN_LOCKOUT_SECONDS;
      setLockoutSeconds(seconds);

      if (typeof window !== 'undefined' && seconds > 0) {
        window.localStorage.setItem(
          ADMIN_LOGIN_LOCKOUT_UNTIL_KEY,
          String(Date.now() + seconds * 1000)
        );
      }
    }

    setFormData((prev) => ({ ...prev, password: '' }));
    setErrors({
      submit:
        result.error ||
        'Admin access denied. Check your credentials and try again.'
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <BackButton
          className="auth-back-btn"
          onClick={() => navigate(ROUTES.HOME)}
          aria-label="Back to home"
        />

        <div className="auth-brand-content">
          <div className="admin-logo-wrapper">
            <img src={bigkasLogo} alt="BIGKAS" className="admin-auth-logo" />
            <h1 className="auth-brand-name">BIGKAS</h1>
          </div>
          <p className="auth-brand-tagline">RESTRICTED ADMIN ACCESS</p>
          <div className="auth-brand-line" />
          <ul className="auth-brand-features">
            <li>01 HIDDEN ENTRY ROUTE</li>
            <li>02 PASSWORD LOGIN WITH LOCKOUT</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-panel">
        <BackButton
          className="auth-mobile-back"
          onClick={() => navigate(ROUTES.HOME)}
          aria-label="Back to home"
        />

        <div
          className="auth-form-container floating-card"
        >
          <h2 className="auth-form-title">
            ADMIN LOGIN
          </h2>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {errors.submit && (
              <div className="auth-error-banner" role="alert">
                {errors.submit}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="admin-email" className="form-label">
                EMAIL ADDRESS
              </label>
              <input
                id="admin-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="enter admin email"
                autoComplete="email"
                disabled={isLockedOut || isLoading}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="admin-password" className="form-label">
                PASSWORD
              </label>
              <div className="password-input-wrapper">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="enter password"
                  autoComplete="current-password"
                  disabled={isLockedOut || isLoading}
                />
                <PasswordToggle
                  isVisible={showPassword}
                  onToggle={() => setShowPassword((prev) => !prev)}
                  disabled={isLockedOut || isLoading}
                  label="admin password"
                />
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <PushButton
              type="submit"
              disabled={isLockedOut || isLoading}
              className="auth-submit-btn"
              bgColor="#059669"
              shadowColor="#064e3b"
              textColor="#ffffff"
            >
              {isLoading && <span className="btn-loader" aria-hidden="true" />}
              {isLockedOut ? `LOCKED (${formatCountdown(lockoutSeconds)})` : 'ENTER ADMIN'}
            </PushButton>
          </form>
        </div>
      </div>
    </div>
  );
}
