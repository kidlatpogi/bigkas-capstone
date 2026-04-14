import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BackButton from '../../components/common/BackButton';
import PasswordToggle from '../../components/common/PasswordToggle';
import PushButton from '../../components/common/PushButton';
import { ENV } from '../../config/env';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import { isValidEmail } from '../../utils/validators';
import { motion } from 'framer-motion';
import './AdminLoginPage.css';

const ADMIN_LOGIN_LOCKOUT_UNTIL_KEY = 'bigkas_admin_login_lockout_until';

function getStoredLockoutSeconds() {
  const storedUnlockTime = window.localStorage.getItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY);
  if (!storedUnlockTime) return 0;

  const unlockTimeMs = Date.parse(storedUnlockTime);
  if (!Number.isFinite(unlockTimeMs)) {
    window.localStorage.removeItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY);
    return 0;
  }

  const remaining = Math.ceil((unlockTimeMs - Date.now()) / 1000);
  if (remaining <= 0) {
    window.localStorage.removeItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY);
    return 0;
  }

  return remaining;
}

function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function AdminLoginPage({ managePageClass = true }) {
  const navigate = useNavigate();
  const { adminLogin, isLoading } = useAuthContext();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [lockoutSeconds, setLockoutSeconds] = useState(() => getStoredLockoutSeconds());
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (managePageClass) {
      document.documentElement.classList.add('admin-login-page-active');
      document.body.classList.add('admin-login-page-active');
    }
    return () => {
      if (managePageClass) {
        document.documentElement.classList.remove('admin-login-page-active');
        document.body.classList.remove('admin-login-page-active');
      }
    };
  }, [managePageClass]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.localStorage.removeItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.submit) {
      setErrors((prev) => ({ ...prev, [name]: null, submit: null }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.email) {
      nextErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      nextErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (lockoutSeconds > 0) {
      setErrors({ submit: `Too many attempts. Try again in ${formatCountdown(lockoutSeconds)}` });
      return;
    }

    if (isLoading || !validateForm()) return;

    const result = await adminLogin(formData.email, formData.password);

    if (result.success) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      return;
    }

    if (result.code === 'account_locked') {
      const lockSeconds = Math.max(1, Number(result.lockoutSeconds || 60));
      const unlockTime = result.unlockTime || new Date(Date.now() + lockSeconds * 1000).toISOString();
      window.localStorage.setItem(ADMIN_LOGIN_LOCKOUT_UNTIL_KEY, unlockTime);
      setLockoutSeconds(lockSeconds);
    }

    setErrors({ submit: result.error || 'Admin login failed.' });
    setFormData({ email: '', password: '' });
  };

  const lockoutMessage = lockoutSeconds > 0
    ? `Too many attempts. Try again in ${formatCountdown(lockoutSeconds)}`
    : null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <BackButton className="auth-back-btn" onClick={() => navigate(ROUTES.HOME)} />

        <div className="auth-brand-content">
          <h1 className="auth-brand-name">BIGKAS</h1>
          <p className="auth-brand-tagline">RESTRICTED ADMIN ACCESS</p>
          <div className="auth-brand-line" />

          <ul className="auth-brand-features">
            <li>
              <span className="feature-num">01</span>
              <span className="feature-text">HIDDEN ENTRY ROUTE</span>
            </li>
            <li>
              <span className="feature-num">02</span>
              <span className="feature-text">SERVER-SIDE EMAIL ALLOWLIST</span>
            </li>
            <li>
              <span className="feature-num">03</span>
              <span className="feature-text">PASSWORD LOGIN WITH LOCKOUT</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="auth-form-panel">
        <BackButton className="auth-mobile-back" onClick={() => navigate(ROUTES.HOME)} />
        <motion.div 
          className="auth-form-container floating-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 variants={itemVariants} className="auth-form-title">ADMIN LOGIN</motion.h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            {(lockoutMessage || errors.submit) && (
              <motion.div variants={itemVariants} className="auth-error-banner">{lockoutMessage || errors.submit}</motion.div>
            )}

            <motion.div variants={itemVariants} className="form-group">
              <label htmlFor="email" className="form-label">EMAIL ADDRESS</label>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@bigkas.site"
                disabled={isLoading || lockoutSeconds > 0}
                autoComplete="username"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </motion.div>

            <motion.div variants={itemVariants} className="form-group">
              <label htmlFor="password" className="form-label">PASSWORD</label>
              <div className="pw-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={isLoading || lockoutSeconds > 0}
                  autoComplete="current-password"
                />
                <PasswordToggle
                  isVisible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  label="password"
                  disabled={isLoading || lockoutSeconds > 0}
                />
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </motion.div>

            <motion.div variants={itemVariants}>
              <PushButton
                type="submit"
                disabled={isLoading || lockoutSeconds > 0}
                bgColor="#D32F2F"
                shadowColor="#9A0007"
                textColor="#ffffff"
              >
                {isLoading ? <span className="btn-loader"></span> : (lockoutSeconds > 0 ? `LOCKED (${formatCountdown(lockoutSeconds)})` : 'ENTER ADMIN')}
              </PushButton>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default AdminLoginPage;