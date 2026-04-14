import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { isValidEmail } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import BackButton from '../../components/common/BackButton';
import PasswordToggle from '../../components/common/PasswordToggle';
import PushButton from '../../components/common/PushButton';
import googleLogo from '../../assets/Google-Logo.png';
import { motion } from 'framer-motion';
import './LoginPage.css';

const LOGIN_LOCKOUT_UNTIL_KEY = 'bigkas_login_lockout_until';

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
function LoginPage({ managePageClass = true }) {
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

  const handleGoogleSignIn = async () => {
    const result = await loginWithGoogle();
    if (!result?.success) {
      setErrors((prev) => ({
        ...prev,
        submit: result?.error || 'Google sign-in failed. Please try again.',
      }));
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
      <BackButton className="auth-login-back" />
      <div className="auth-form-panel">
        <motion.div 
          className="auth-form-container floating-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 variants={itemVariants} className="auth-form-title">Login to Bigkas</motion.h2>

          <form className="auth-form" onSubmit={handleLogin}>
            {showAccountCreated && !showUnverified && !errors.submit && (
              <motion.div variants={itemVariants} className="auth-success-banner">
                Account created successfully! Please check your email to verify your account before logging in.
              </motion.div>
            )}

            {showAccountVerified && !showUnverified && !errors.submit && (
              <motion.div variants={itemVariants} className="auth-success-banner">
                ✓ Email verified! You can now log in.
              </motion.div>
            )}

            {resendSuccess && (
              <motion.div variants={itemVariants} className="auth-success-banner">
                Verification email resent! Please check your inbox.
              </motion.div>
            )}

            {(lockoutMessage || errors.submit) && !showUnverified && (
              <motion.div variants={itemVariants} className="auth-error-banner">{lockoutMessage || errors.submit}</motion.div>
            )}

            {showUnverified && (
              <motion.div variants={itemVariants} className="auth-unverified-banner">
                <p className="auth-unverified-text">
                  Verify your Email Address. Check your inbox and spam folder for the verification link.
                </p>
                <button
                  type="button"
                  className="auth-resend-btn"
                  onClick={handleResendVerification}
                  disabled={resendLoading || resendCooldown > 0}
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Resend Verification Email'}
                </button>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                placeholder="name@gmail.com"
                disabled={isLoading || lockoutSeconds > 0}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </motion.div>

            <motion.div variants={itemVariants} className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
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
                bgColor="#2d5a27"
                shadowColor="#1a3b16"
                textColor="#ffffff"
              >
                {isLoading ? <span className="btn-loader"></span> : (lockoutSeconds > 0 ? `LOCKED (${formatCountdown(lockoutSeconds)})` : 'Login')}
              </PushButton>
            </motion.div>
          </form>


          <motion.div variants={itemVariants}>
            <Link to={ROUTES.FORGOT_PASSWORD} className="auth-forgot-link">Forgot Password?</Link>
          </motion.div>

          <motion.div variants={itemVariants} className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PushButton
              type="button" 
              onClick={handleGoogleSignIn} 
              disabled={isLoading}
              bgColor="#ffffff"
              shadowColor="#d5d5d5"
              textColor="#333333"
            >
              <img src={googleLogo} alt="Google" className="auth-google-logo" style={{ width: '1.5rem', height: '1.5rem', objectFit: 'contain' }} />
              <span className="btn-content">Login with Google</span>
            </PushButton>
          </motion.div>

          <motion.div variants={itemVariants} style={{ width: '100%', textAlign: 'center' }}>
            <Link to={ROUTES.REGISTER} className="auth-link">Create Account?</Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginPage;
