import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IoChevronBack } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { isValidEmail } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import PasswordToggle from '../../components/common/PasswordToggle';
import { motion, AnimatePresence } from 'framer-motion';
import PushButton from '../../components/common/PushButton';
import { getAssetUrl, getSpriteUrl } from '../../utils/assetUtils';
import './LoginPage.css';

// Lazy load the specialized mobile version
const LoginPageMobile = lazy(() => import('./LoginPageMobile'));

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');

const LOGIN_LOCKOUT_UNTIL_KEY = 'bigkas_login_lockout_until';

const INSIGHT_WORDS = [
  { text: 'Visual', size: '1rem', opacity: 0.8, top: '15%', left: '12%', delay: 0 },
  { text: 'Vocal', size: '0.95rem', opacity: 0.7, top: '22%', left: '80%', delay: 1 },
  { text: 'Verbal', size: '0.9rem', opacity: 0.6, top: '68%', left: '8%', delay: 0.5 },
  { text: 'Gesture', size: '1.1rem', opacity: 0.9, top: '12%', left: '65%', delay: 2 },
  { text: 'Eye Contact', size: '1rem', opacity: 0.75, top: '55%', left: '82%', delay: 1.5 },
  { text: 'Jitter', size: '0.8rem', opacity: 0.5, top: '78%', left: '70%', delay: 3 },
  { text: 'Shimmer', size: '0.9rem', opacity: 0.65, top: '38%', left: '6%', delay: 2.5 },
  { text: 'Confidence', size: '1.15rem', opacity: 0.95, top: '50%', left: '10%', delay: 0 },
  { text: 'Clarity', size: '1rem', opacity: 0.8, top: '82%', left: '22%', delay: 4 },
  { text: 'Presence', size: '1.1rem', opacity: 0.85, top: '18%', left: '42%', delay: 1.2 },
  { text: 'Empower', size: '0.9rem', opacity: 0.6, top: '72%', left: '48%', delay: 2.2 },
  { text: 'Growth', size: '1.05rem', opacity: 0.8, top: '8%', left: '85%', delay: 0.8 },
  { text: 'Flow', size: '1rem', opacity: 0.7, top: '48%', left: '88%', delay: 3.5 },
  { text: 'Impact', size: '1.1rem', opacity: 0.9, top: '30%', left: '18%', delay: 4.5 },
  { text: 'Authentic', size: '0.95rem', opacity: 0.75, top: '62%', left: '60%', delay: 5 },
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

  return remaining;
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
 * Login Page — 1:1 from Figma screenshot
 * Split layout: left branding panel + right form panel
 */
/**
 * Desktop-optimized version of the Login Page
 */
function LoginPageDesktop({ managePageClass = true }) {
  const layoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    loginWithGoogle,
    resendVerificationEmail,
    isLoading,
  } = useAuthContext();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [resendLoading, setResendLoading] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);
  const [showAccountCreated, setShowAccountCreated] = useState(() => Boolean(location.state?.accountCreated));
  const [showAccountVerified, setShowAccountVerified] = useState(() => Boolean(location.state?.accountVerified));
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(() => getStoredLockoutSeconds());
  const [showPassword, setShowPassword] = useState(false);
  const [layoutMode, setLayoutMode] = useState('split');

  // Show the "Account created" banner from navigation state, auto-clear after 3s
  useEffect(() => {
    if (!showAccountCreated) return;
    const timer = setTimeout(() => setShowAccountCreated(false), 3000);
    window.history.replaceState({}, '');
    return () => clearTimeout(timer);
  }, [showAccountCreated]);

  // Show the "Email verified" success banner from VerifyEmailPage, auto-clear after 5s
  useEffect(() => {
    if (!showAccountVerified) return;
    const timer = setTimeout(() => setShowAccountVerified(false), 5000);
    window.history.replaceState({}, '');
    return () => clearTimeout(timer);
  }, [showAccountVerified]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
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
      document.documentElement.classList.add('login-page-active');
      document.body.classList.add('login-page-active');
    }
    return () => {
      if (managePageClass) {
        document.documentElement.classList.remove('login-page-active');
        document.body.classList.remove('login-page-active');
      }
    };
  }, [managePageClass]);

  // SEO Metadata
  useEffect(() => {
    document.title = 'Login | Bigkas — Master Public Speaking';
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Log in to Bigkas and continue your AI-powered journey to public speaking excellence. Analyze your voice, master your presence, and empower your communication.';
    if (!metaDesc.parentNode) document.head.appendChild(metaDesc);
  }, []);

  useEffect(() => {
    if (!layoutRef.current || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect?.width || window.innerWidth;
      setLayoutMode(width < 960 ? 'stack' : 'split');
    });

    observer.observe(layoutRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return undefined;

    const setKeyboardOffset = () => {
      if (layoutMode !== 'stack') {
        root.style.setProperty('--login-kb-offset', '0px');
        return;
      }

      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty('--login-kb-offset', '0px');
        return;
      }

      const keyboardOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--login-kb-offset', `${Math.round(keyboardOffset)}px`);
    };

    setKeyboardOffset();
    window.visualViewport?.addEventListener('resize', setKeyboardOffset);
    window.visualViewport?.addEventListener('scroll', setKeyboardOffset);
    window.addEventListener('resize', setKeyboardOffset);

    return () => {
      root.style.setProperty('--login-kb-offset', '0px');
      window.visualViewport?.removeEventListener('resize', setKeyboardOffset);
      window.visualViewport?.removeEventListener('scroll', setKeyboardOffset);
      window.removeEventListener('resize', setKeyboardOffset);
    };
  }, [layoutMode]);

  useEffect(() => {
    if (layoutMode !== 'stack') return undefined;

    const handleFocusIn = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches('input, textarea, select')) return;

      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }, 120);
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [layoutMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (showAccountCreated) {
      setShowAccountCreated(false);
    }
    if (showAccountVerified) {
      setShowAccountVerified(false);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) {
      setErrors({ submit: `Too many attempts. Try again in ${formatCountdown(lockoutSeconds)}` });
      return;
    }
    if (isLoading) return;
    if (!validateForm()) return;
    // Clear all banners when attempting to log in
    setShowUnverified(false);
    setShowAccountCreated(false);
    setShowAccountVerified(false);
    setResendSuccess(false);
    setErrors({});

    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate(resolvePostLoginRoute(result.user), { replace: true });
    } else if (result.requiresEmailConfirmation) {
      // User account exists but email is not verified
      setShowUnverified(true);
      setFormData({ email: '', password: '' });
    } else if (result.code === 'account_locked') {
      const lockSeconds = Math.max(1, Number(result.lockoutSeconds || 60));
      const unlockTime = result.unlockTime || new Date(Date.now() + lockSeconds * 1000).toISOString();
      window.localStorage.setItem(LOGIN_LOCKOUT_UNTIL_KEY, unlockTime);
      setLockoutSeconds(lockSeconds);
      setFormData({ email: '', password: '' });
    } else {
      // Clear fields for invalid credentials or account not found
      setErrors({ submit: result.error });
      setFormData({ email: '', password: '' });
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;

    const email = (formData.email || '').trim();
    if (!email) {
      setErrors((prev) => ({
        ...prev,
        submit: 'Enter your email in the field above to resend verification.',
      }));
      return;
    }

    setResendLoading(true);
    const result = await resendVerificationEmail(email);
    setResendLoading(false);

    if (result.success) {
      setResendSuccess(true);
      setResendCooldown(60);
      setTimeout(() => setResendSuccess(false), 5000);
      return;
    }

    setErrors((prev) => ({
      ...prev,
      submit: result.error || 'Unable to resend verification email.',
    }));
  };

  const handleGoogleSignIn = async () => {
    const result = await loginWithGoogle();
    if (!result?.success) {
      setErrors((prev) => ({
        ...prev,
        submit: result?.error || 'Google sign-in failed. Please try again.',
      }));
    }
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
    <div
      ref={layoutRef}
      className="auth-page-v2"
      data-layout={layoutMode}
    >
      <div className="auth-container">
        <motion.div
          className="auth-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Side: Branding & Visuals */}
          <div className="auth-visual-side">
            <motion.div variants={itemVariants} className="auth-brand-logo">
              <img 
                src={bigkasLogo} 
                alt="Bigkas" 
                className="auth-logo-img" 
                width="48" 
                height="48" 
                loading="eager" 
              />
              <span>Bigkas</span>
            </motion.div>
            
            <div className="auth-visual-content">
              <motion.div 
                className="auth-robot-img-wrap auth-robot-floating"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="auth-robot-glow" />
                <img 
                  src="https://assets.bigkas.site/Sprites/Robot/0001.webp" 
                  alt="AI Companion" 
                  className="auth-robot-img" 
                  fetchpriority="high"
                  loading="eager"
                  width="460"
                  height="460"
                />
              </motion.div>

              {/* Floating Insight Cloud */}
              {INSIGHT_WORDS.map((word, i) => (
                <div 
                  key={i}
                  className="insight-chip insight-chip-floating"
                  style={{ 
                    top: word.top, 
                    left: word.left, 
                    fontSize: word.size,
                    opacity: word.opacity,
                    animationDelay: `${word.delay}s`,
                    animationDuration: `${6 + (i % 4)}s`
                  }}
                >
                  {word.text}
                </div>
              ))}
              <motion.h2 variants={itemVariants} className="auth-hero-tagline">
                Master <span>Public Speaking</span>
              </motion.h2>
              <motion.p variants={itemVariants} className="auth-hero-desc">
                Your AI-powered journey to public speaking excellence starts here.
              </motion.p>
            </div>
            
            {/* Decorative soundwaves */}
            <div className="auth-visual-waves">
              {[...Array(24)].map((_, i) => (
                <div key={i} className={`auth-visual-wave auth-visual-wave-${(i % 6) + 1}`} />
              ))}
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="auth-form-side">
            <div className="auth-form-inner">
              <motion.h1 variants={itemVariants} className="auth-form-headline">Welcome Back</motion.h1>
              <motion.p variants={itemVariants} className="auth-form-subline">Please enter your credentials to continue</motion.p>

              <form className="auth-form" onSubmit={handleLogin}>
                <AnimatePresence>
                  {showAccountCreated && !showUnverified && !errors.submit && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="auth-status-banner is-success"
                    >
                      Account created! Please check your email to verify before logging in.
                    </motion.div>
                  )}

                  {showAccountVerified && !showUnverified && !errors.submit && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="auth-status-banner is-success"
                    >
                      ✓ Email verified! You can now log in.
                    </motion.div>
                  )}

                  {resendSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="auth-status-banner is-success"
                    >
                      Verification email resent! Check your inbox.
                    </motion.div>
                  )}

                  {(lockoutMessage || errors.submit) && !showUnverified && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="auth-status-banner is-error"
                    >
                      {lockoutMessage || errors.submit}
                    </motion.div>
                  )}

                  {showUnverified && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="auth-status-banner is-warning"
                    >
                      <p>Verify your Email Address. Check your inbox and spam folder.</p>
                      <button
                        type="button"
                        className="auth-resend-inline-btn"
                        onClick={handleResendVerification}
                        disabled={resendLoading || resendCooldown > 0}
                      >
                        {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Retry in ${resendCooldown}s` : 'Resend Email'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={itemVariants} className="form-group-v2">
                  <label htmlFor="email">Email</label>
                  <div className="input-field-wrap">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className={errors.email ? 'is-invalid' : ''}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      disabled={isLoading || lockoutSeconds > 0}
                      enterKeyHint="next"
                    />
                  </div>
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </motion.div>

                <motion.div variants={itemVariants} className="form-group-v2">
                  <label htmlFor="password">Password</label>
                  <div className="input-field-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      className={errors.password ? 'is-invalid' : ''}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      disabled={isLoading || lockoutSeconds > 0}
                      autoComplete="current-password"
                      enterKeyHint="done"
                    />
                    <PasswordToggle
                      isVisible={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      label="password"
                      disabled={isLoading || lockoutSeconds > 0}
                    />
                  </div>
                  <div className="form-footer-row">
                    <Link to={ROUTES.FORGOT_PASSWORD} className="forgot-pw-link">Forgot Password?</Link>
                  </div>
                  {errors.password && <span className="field-error">{errors.password}</span>}
                </motion.div>

                <motion.div variants={itemVariants} className="form-actions-v2">
                  <PushButton
                    type="submit"
                    disabled={isLoading || lockoutSeconds > 0}
                    bgColor="#059669"
                    shadowColor="#047857"
                    className="login-submit-btn"
                    aria-label="Log in to your account"
                  >
                    {isLoading ? (
                      <span className="loading-spinner" />
                    ) : (
                      lockoutSeconds > 0 ? `Locked (${formatCountdown(lockoutSeconds)})` : 'Login'
                    )}
                  </PushButton>
                </motion.div>

                <motion.div variants={itemVariants} className="divider-v2">
                  <span>OR</span>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <button
                    type="button"
                    className="google-signin-btn-v2"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    aria-label="Continue with Google"
                  >
                    <img src="https://assets.bigkas.site/Images/Google-Logo.webp" alt="" width="20" height="20" />
                    Continue with Google
                  </button>
                </motion.div>

                <motion.div variants={itemVariants} className="signup-prompt-v2">
                  Don't have an account? <Link to={ROUTES.REGISTER}>Create one now</Link>
                </motion.div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


/**
 * Main Responsive Wrapper for Login Page
 * Switches between Desktop and Mobile/Tablet specialized versions
 */
function LoginPage() {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Suspense fallback={null}>
      {isMobileOrTablet ? <LoginPageMobile /> : <LoginPageDesktop />}
    </Suspense>
  );
}

export default LoginPage;
