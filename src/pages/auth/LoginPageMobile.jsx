import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { isValidEmail } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import { LazyMotion, domAnimation, motion as Motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl } from '../../utils/assetUtils';
import googleIcon from '../../assets/logos/google-icon.svg';
import './LoginPageMobile.css';

// Lazy load UI components
const PushButton = lazy(() => import('../../components/common/PushButton'));
const PasswordToggle = lazy(() => import('../../components/common/PasswordToggle'));

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');

const LEGACY_LOGIN_LOCKOUT_UNTIL_KEY = 'bigkas_login_lockout_until';
const LOGIN_LOCKED_ACCOUNTS_KEY = 'bigkas_login_locked_accounts';
const LOGIN_FAILED_ATTEMPTS_KEY = 'bigkas_login_failed_attempts';
const LOGIN_LOCK_MIGRATION_KEY = 'bigkas_login_lock_schema_v2_applied';
const LOGIN_GUARD_PREFIX = 'bigkas_login_guard_v1';
const MAX_LOGIN_ATTEMPTS = 3;
const ACCOUNT_LOCKED_MESSAGE = 'Account locked after 3 failed login attempts. Please reset your password or contact support.';

const INSIGHT_WORDS = [
  { text: 'Visual', size: '0.85rem', opacity: 0.6, top: '15%', left: '12%', delay: 0 },
  { text: 'Vocal', size: '0.8rem', opacity: 0.5, top: '22%', left: '80%', delay: 1 },
  { text: 'Verbal', size: '0.75rem', opacity: 0.4, top: '68%', left: '8%', delay: 0.5 },
  { text: 'Presence', size: '0.9rem', opacity: 0.7, top: '18%', left: '42%', delay: 1.2 },
];

function normalizeLoginEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function readLoginStorageMap(key) {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return {};
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
  } catch {
    return {};
  }
}

function writeLoginStorageMap(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getLoginGuardKey(email) {
  return `${LOGIN_GUARD_PREFIX}:user:${email}`;
}

function clearStoredLoginLock(email) {
  const normalizedEmail = normalizeLoginEmail(email);
  if (!normalizedEmail) return;

  const lockedAccounts = readLoginStorageMap(LOGIN_LOCKED_ACCOUNTS_KEY);
  const failedAttempts = readLoginStorageMap(LOGIN_FAILED_ATTEMPTS_KEY);
  delete lockedAccounts[normalizedEmail];
  delete failedAttempts[normalizedEmail];
  writeLoginStorageMap(LOGIN_LOCKED_ACCOUNTS_KEY, lockedAccounts);
  writeLoginStorageMap(LOGIN_FAILED_ATTEMPTS_KEY, failedAttempts);
  window.localStorage.removeItem(getLoginGuardKey(normalizedEmail));
  window.localStorage.removeItem(LEGACY_LOGIN_LOCKOUT_UNTIL_KEY);
}

function migrateLegacyLoginLocks() {
  if (window.localStorage.getItem(LOGIN_LOCK_MIGRATION_KEY)) return;
  window.localStorage.removeItem(LOGIN_LOCKED_ACCOUNTS_KEY);
  window.localStorage.removeItem(LOGIN_FAILED_ATTEMPTS_KEY);
  window.localStorage.removeItem(LEGACY_LOGIN_LOCKOUT_UNTIL_KEY);
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(`${LOGIN_GUARD_PREFIX}:user:`)) {
      window.localStorage.removeItem(key);
    }
  }
  window.localStorage.setItem(LOGIN_LOCK_MIGRATION_KEY, 'true');
}

function isCredentialFailure(code) {
  return [
    'invalid_credentials',
    'account_not_found',
    'unknown_auth_error',
  ].includes(String(code || '').toLowerCase());
}

function resolvePostLoginRoute(user) {
  if (user?.onboardingStage === 'profiling') return ROUTES.USER_PROFILING;
  if (user?.onboardingStage === 'pretest') return ROUTES.USER_PRETEST;
  if (user?.onboardingStage === 'analyzing') return ROUTES.USER_ANALYZING;
  return ROUTES.ACTIVITY;
}

/**
 * LoginPageMobile — Optimized for Mobile/Tablet
 * - Flat structure (removed card/sides)
 * - Safe Area aware
 * - Background visuals
 */
function LoginPageMobile({ managePageClass = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, resendVerificationEmail, isLoading } = useAuthContext();
  const passwordResetEmail = normalizeLoginEmail(location.state?.passwordResetEmail);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [resendLoading, setResendLoading] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);
  const [showAccountCreated, setShowAccountCreated] = useState(() => Boolean(location.state?.accountCreated));
  const [showAccountVerified, setShowAccountVerified] = useState(() => Boolean(location.state?.accountVerified));
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lockedAccounts, setLockedAccounts] = useState(() => {
    migrateLegacyLoginLocks();
    clearStoredLoginLock(passwordResetEmail);
    return readLoginStorageMap(LOGIN_LOCKED_ACCOUNTS_KEY);
  });
  const [failedAttempts, setFailedAttempts] = useState(() => readLoginStorageMap(LOGIN_FAILED_ATTEMPTS_KEY));
  const [showPassword, setShowPassword] = useState(false);
  const normalizedEmail = normalizeLoginEmail(formData.email);
  const isAccountLocked = Boolean(normalizedEmail && lockedAccounts[normalizedEmail]);

  useEffect(() => {
    if (!showAccountCreated) return;
    const timer = setTimeout(() => setShowAccountCreated(false), 3000);
    return () => clearTimeout(timer);
  }, [showAccountCreated]);

  useEffect(() => {
    if (!showAccountVerified) return;
    const timer = setTimeout(() => setShowAccountVerified(false), 5000);
    return () => clearTimeout(timer);
  }, [showAccountVerified]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_LOGIN_LOCKOUT_UNTIL_KEY);
  }, []);

  useEffect(() => {
    if (!passwordResetEmail) return;
    window.history.replaceState({}, '');
  }, [passwordResetEmail]);

  useEffect(() => {
    if (managePageClass) {
      document.documentElement.classList.add('login-page-mobile-active');
      document.body.classList.add('login-page-mobile-active');
    }
    return () => {
      if (managePageClass) {
        document.documentElement.classList.remove('login-page-mobile-active');
        document.body.classList.remove('login-page-mobile-active');
      }
    };
  }, [managePageClass]);

  // SEO Metadata
  useEffect(() => {
    document.title = 'Login | TalkTics — Master Public Speaking';
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Login to your TalkTics account to continue your public speaking journey. Access your sessions, feedback, and personalized AI training.';
    if (!metaDesc.parentNode) document.head.appendChild(metaDesc);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    if (name === 'email') {
      const nextEmail = normalizeLoginEmail(value);
      setErrors((prev) => ({
        ...prev,
        submit: nextEmail && lockedAccounts[nextEmail] ? ACCOUNT_LOCKED_MESSAGE : null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Valid email required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isAccountLocked) {
      setErrors({ submit: ACCOUNT_LOCKED_MESSAGE });
      return;
    }
    if (isLoading) return;
    if (!validateForm()) return;
    
    const result = await login(formData.email, formData.password);
    if (result.success) {
      if (normalizedEmail) {
        clearStoredLoginLock(normalizedEmail);
      }
      navigate(resolvePostLoginRoute(result.user), { replace: true });
    } else if (result.requiresEmailConfirmation) {
      if (normalizedEmail) {
        clearStoredLoginLock(normalizedEmail);
        setFailedAttempts(readLoginStorageMap(LOGIN_FAILED_ATTEMPTS_KEY));
      }
      setShowUnverified(true);
    } else if (result.code === 'account_locked') {
      const nextLockedAccounts = {
        ...lockedAccounts,
        [normalizedEmail]: { lockedAt: new Date().toISOString() },
      };
      setLockedAccounts(nextLockedAccounts);
      writeLoginStorageMap(LOGIN_LOCKED_ACCOUNTS_KEY, nextLockedAccounts);
      setErrors({ submit: ACCOUNT_LOCKED_MESSAGE });
      setFormData((prev) => ({ ...prev, password: '' }));
    } else {
      const nextFailedCount = normalizedEmail ? Number(failedAttempts[normalizedEmail] || 0) + 1 : 0;
      if (!isCredentialFailure(result.code)) {
        setErrors({ submit: result.error });
      } else if (normalizedEmail && nextFailedCount >= MAX_LOGIN_ATTEMPTS) {
        const nextLockedAccounts = {
          ...lockedAccounts,
          [normalizedEmail]: { lockedAt: new Date().toISOString() },
        };
        const nextAttempts = { ...failedAttempts };
        delete nextAttempts[normalizedEmail];
        setLockedAccounts(nextLockedAccounts);
        setFailedAttempts(nextAttempts);
        writeLoginStorageMap(LOGIN_LOCKED_ACCOUNTS_KEY, nextLockedAccounts);
        writeLoginStorageMap(LOGIN_FAILED_ATTEMPTS_KEY, nextAttempts);
        setErrors({ submit: ACCOUNT_LOCKED_MESSAGE });
      } else {
        const nextAttempts = normalizedEmail
          ? { ...failedAttempts, [normalizedEmail]: nextFailedCount }
          : failedAttempts;
        setFailedAttempts(nextAttempts);
        writeLoginStorageMap(LOGIN_FAILED_ATTEMPTS_KEY, nextAttempts);
        setErrors({ submit: result.error });
      }
      setFormData((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await loginWithGoogle();
    if (!result?.success) setErrors({ submit: result?.error || 'Google sign-in failed' });
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    const result = await resendVerificationEmail(formData.email);
    setResendLoading(false);
    if (result.success) {
      setResendSuccess(true);
      setResendCooldown(60);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="auth-mobile-page">
        {/* 1. Background Visuals Layer */}
        <div className="auth-mobile-visual-bg">
          <div className="auth-mobile-header-accent" />
          
          <div className="auth-mobile-visual-content">
            <Motion.div className="auth-mobile-hero-text" initial="hidden" animate="visible" variants={itemVariants}>
              <h2>Master <span>Public Speaking</span></h2>
              <p>Your AI-powered journey to excellence starts here.</p>
            </Motion.div>
          </div>

        {/* Floating Insight Words in BG */}
        {INSIGHT_WORDS.map((word, i) => (
          <div 
            key={i}
            className="insight-chip-bg"
            style={{ 
              top: word.top, 
              left: word.left, 
              fontSize: word.size,
              opacity: word.opacity,
              animationDelay: `${word.delay}s`
            }}
          >
            {word.text}
          </div>
        ))}
      </div>

      {/* 2. Upper Left Brand Logo */}
      <div className="auth-brand-logo-mobile">
        <img 
          src={bigkasLogo} 
          alt="TalkTics Logo" 
          width="32" 
          height="32" 
          fetchPriority="high" 
          loading="eager"
        />
        <span>TalkTics</span>
      </div>

      {/* 3. Main Form Content (Flattened) */}
      <div className="auth-mobile-form-container">
        <div className="auth-mobile-form-card">
          <div className="auth-form-header-mobile">
            <h1>Welcome Back</h1>
            <p>Enter your credentials to continue</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <AnimatePresence mode="wait">
              {(showAccountCreated || showAccountVerified || resendSuccess || errors.submit || showUnverified) && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`auth-status-banner-mobile ${errors.submit ? 'is-error' : showUnverified ? 'is-warning' : 'is-success'}`}
                >
                  {errors.submit || (showUnverified ? 'Please verify your email' : 'Success!')}
                  {showUnverified && (
                    <button type="button" onClick={handleResendVerification} disabled={resendLoading || resendCooldown > 0}>
                      {resendLoading ? '...' : resendCooldown > 0 ? `(${resendCooldown}s)` : 'Resend'}
                    </button>
                  )}
                </Motion.div>
              )}
            </AnimatePresence>

            <div className="form-group-mobile">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                disabled={isLoading}
              />
              {errors.email && <span className="error-text-mobile">{errors.email}</span>}
            </div>

            <div className="form-group-mobile">
              <label htmlFor="password">Password</label>
              <div className="input-with-toggle-mobile">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={isLoading || isAccountLocked}
                />
                <Suspense fallback={null}>
                  <PasswordToggle
                    isVisible={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </Suspense>
              </div>
              <div className="forgot-password-wrap-mobile">
                <Link to={ROUTES.FORGOT_PASSWORD} state={{ email: formData.email }}>Forgot Password?</Link>
              </div>
              {errors.password && <span className="error-text-mobile">{errors.password}</span>}
            </div>

            <Suspense fallback={<div style={{ height: '56px' }} />}>
              <PushButton
                type="button"
                onClick={handleLogin}
                disabled={isLoading || isAccountLocked}
                bgColor="#047857" /* High contrast emerald-700 */
                shadowColor="#065f46"
                className="mobile-login-btn"
              >
                {isLoading ? '...' : isAccountLocked ? 'ACCOUNT LOCKED' : 'LOGIN'}
              </PushButton>
            </Suspense>

            <div className="mobile-divider">
              <span>OR</span>
            </div>

            <button 
              type="button" 
              className="google-btn-mobile" 
              onClick={handleGoogleSignIn} 
              disabled={isLoading}
              aria-label="Continue with Google"
            >
              <img 
                src={googleIcon} 
                alt="Google Logo" 
                width="20" 
                height="20" 
                loading="eager"
              />
              Continue with Google
            </button>

            <div className="signup-link-mobile">
              Don't have an account? <Link to={ROUTES.REGISTER}>Create one now</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
    </LazyMotion>
  );
}

export default LoginPageMobile;
