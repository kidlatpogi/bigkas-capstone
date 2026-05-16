import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { isValidEmail } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { getAssetUrl } from '../../utils/assetUtils';
import googleIcon from '../../assets/logos/google-icon.svg';
import './LoginPageMobile.css';

// Lazy load UI components
const PushButton = lazy(() => import('../../components/common/PushButton'));
const PasswordToggle = lazy(() => import('../../components/common/PasswordToggle'));

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');

const LOGIN_LOCKOUT_UNTIL_KEY = 'bigkas_login_lockout_until';
const LOGIN_LOCKOUT_SECONDS = 30;

function normalizeLockoutSeconds(value) {
  const seconds = Math.ceil(Number(value) || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(LOGIN_LOCKOUT_SECONDS, seconds);
}

const INSIGHT_WORDS = [
  { text: 'Visual', size: '0.85rem', opacity: 0.6, top: '15%', left: '12%', delay: 0 },
  { text: 'Vocal', size: '0.8rem', opacity: 0.5, top: '22%', left: '80%', delay: 1 },
  { text: 'Verbal', size: '0.75rem', opacity: 0.4, top: '68%', left: '8%', delay: 0.5 },
  { text: 'Presence', size: '0.9rem', opacity: 0.7, top: '18%', left: '42%', delay: 1.2 },
];

function getStoredLockoutSeconds() {
  const storedUnlockTime = window.localStorage.getItem(LOGIN_LOCKOUT_UNTIL_KEY);
  if (!storedUnlockTime) return 0;
  const unlockTimeMs = Date.parse(storedUnlockTime);
  if (!Number.isFinite(unlockTimeMs)) {
    window.localStorage.removeItem(LOGIN_LOCKOUT_UNTIL_KEY);
    return 0;
  }
  const remaining = Math.ceil((unlockTimeMs - Date.now()) / 1000);
  if (remaining <= 0) {
    window.localStorage.removeItem(LOGIN_LOCKOUT_UNTIL_KEY);
    return 0;
  }

  const clampedRemaining = normalizeLockoutSeconds(remaining);
  if (clampedRemaining !== remaining) {
    window.localStorage.setItem(
      LOGIN_LOCKOUT_UNTIL_KEY,
      new Date(Date.now() + clampedRemaining * 1000).toISOString()
    );
  }

  return clampedRemaining;
}

function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function resolvePostLoginRoute(user) {
  if (user?.onboardingStage === 'profiling') return ROUTES.USER_PROFILING;
  if (user?.onboardingStage === 'pretest') return ROUTES.USER_PRETEST;
  if (user?.onboardingStage === 'analyzing') return ROUTES.USER_ANALYZING;
  return ROUTES.HOME;
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

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [resendLoading, setResendLoading] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);
  const [showAccountCreated, setShowAccountCreated] = useState(() => Boolean(location.state?.accountCreated));
  const [showAccountVerified, setShowAccountVerified] = useState(() => Boolean(location.state?.accountVerified));
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(() => getStoredLockoutSeconds());
  const [showPassword, setShowPassword] = useState(false);

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
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          window.localStorage.removeItem(LOGIN_LOCKOUT_UNTIL_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

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
    document.title = 'Login | Bigkas — Master Public Speaking';
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Login to your Bigkas account to continue your public speaking journey. Access your sessions, feedback, and personalized AI training.';
    if (!metaDesc.parentNode) document.head.appendChild(metaDesc);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
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
    if (lockoutSeconds > 0 || isLoading) return;
    if (!validateForm()) return;
    
    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate(resolvePostLoginRoute(result.user), { replace: true });
    } else if (result.requiresEmailConfirmation) {
      setShowUnverified(true);
    } else if (result.code === 'account_locked') {
      const lockSeconds = normalizeLockoutSeconds(result.lockoutSeconds) || LOGIN_LOCKOUT_SECONDS;
      window.localStorage.setItem(
        LOGIN_LOCKOUT_UNTIL_KEY,
        new Date(Date.now() + lockSeconds * 1000).toISOString()
      );
      setLockoutSeconds(lockSeconds);
    } else {
      setErrors({ submit: result.error });
      setFormData({ email: '', password: '' });
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
            <m.div className="auth-mobile-hero-text" initial="hidden" animate="visible" variants={itemVariants}>
              <h2>Master <span>Public Speaking</span></h2>
              <p>Your AI-powered journey to excellence starts here.</p>
            </m.div>
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
          alt="Bigkas Logo" 
          width="32" 
          height="32" 
          fetchPriority="high" 
          loading="eager"
        />
        <span>Bigkas</span>
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
                <m.div 
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
                </m.div>
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
                disabled={isLoading || lockoutSeconds > 0}
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
                  disabled={isLoading || lockoutSeconds > 0}
                />
                <Suspense fallback={null}>
                  <PasswordToggle
                    isVisible={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </Suspense>
              </div>
              <div className="forgot-password-wrap-mobile">
                <Link to={ROUTES.FORGOT_PASSWORD}>Forgot Password?</Link>
              </div>
              {errors.password && <span className="error-text-mobile">{errors.password}</span>}
            </div>

            <Suspense fallback={<div style={{ height: '56px' }} />}>
              <PushButton
                type="submit"
                disabled={isLoading || lockoutSeconds > 0}
                bgColor="#047857" /* High contrast emerald-700 */
                shadowColor="#065f46"
                className="mobile-login-btn"
              >
                {isLoading ? '...' : lockoutSeconds > 0 ? `Locked (${lockoutSeconds}s)` : 'LOGIN'}
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
