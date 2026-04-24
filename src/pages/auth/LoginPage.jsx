import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { isValidEmail } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import kamayImage from '../../assets/backgrounds/Login/Kamay.png';
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

  const heroBars = [
    { left: '3%', top: '12%', h: '60%' },
    { left: '12%', top: '28%', h: '40%' },
    { left: '21%', top: '44%', h: '24%' },
    { left: '30%', top: '22%', h: '52%' },
    { left: '39%', top: '34%', h: '34%' },
    { left: '48%', top: '10%', h: '68%' },
    { left: '57%', top: '24%', h: '46%' },
    { left: '66%', top: '16%', h: '58%' },
    { left: '75%', top: '28%', h: '40%' },
    { left: '84%', top: '12%', h: '60%' },
    { left: '93%', top: '44%', h: '26%' },
  ];

  return (
    <div className="min-h-dvh w-full bg-[#064E3B] lg:flex">
      <section className="relative hidden overflow-hidden bg-[#064E3B] lg:block lg:w-1/2">
        <p className="pt-5 text-center font-nunito text-[12px] font-semibold text-white">
          Just you and the mic. No judgement. Just Data
        </p>

        <div className="absolute inset-0">
          {heroBars.map((bar, index) => (
            <div
              key={`${bar.left}-${index}`}
              className="absolute w-[72px] rounded-full bg-[#34D399] opacity-50"
              style={{ left: bar.left, top: bar.top, height: bar.h }}
            />
          ))}
        </div>

        <img
          src={kamayImage}
          alt="Hand holding phone"
          className="absolute bottom-0 left-0 z-10 h-[70%] max-h-[760px] w-auto object-contain"
        />

        <h1 className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-pre-line text-center font-nunito text-[60px] font-extrabold leading-[0.95] text-white">
          Master{'\n'}Speaking
        </h1>
      </section>

      <section className="relative flex min-h-dvh w-full items-center justify-center px-4 py-6 lg:w-1/2 lg:justify-end lg:px-0 lg:py-0">
        <motion.div
          className="relative w-full max-w-[540px] overflow-hidden rounded-3xl bg-[#FDFDF9] p-7 sm:p-10 lg:h-dvh lg:max-w-[560px] lg:rounded-none lg:rounded-l-[24px] lg:pl-7 lg:pr-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[rgba(52,211,153,0.18)] to-transparent" />

          <motion.h1 variants={itemVariants} className="relative z-10 font-fredoka text-[52px] leading-none text-[#059669]">
            Bigkas
          </motion.h1>

          <div className="relative z-10 flex min-h-[76dvh] items-center justify-center lg:min-h-[calc(100dvh-90px)]">
            <form className="w-full max-w-[360px] font-nunito" onSubmit={handleLogin}>
              <motion.h2 variants={itemVariants} className="mb-10 text-center font-nunito text-[44px] font-semibold text-[#111827]">
                Login
              </motion.h2>

              <motion.div variants={itemVariants} className="mb-5">
                <label htmlFor="email" className="mb-1.5 block text-[28px] font-semibold text-[#111827]">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`h-[54px] w-full rounded-full border bg-white px-6 text-[22px] outline-none transition ${errors.email ? 'border-red-500' : 'border-[#111827]'}`}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@gmail.com"
                  disabled={isLoading || lockoutSeconds > 0}
                />
                {errors.email && <span className="mt-1 block text-sm text-red-600">{errors.email}</span>}
              </motion.div>

              <motion.div variants={itemVariants} className="mb-2">
                <label htmlFor="password" className="mb-1.5 block text-[28px] font-semibold text-[#111827]">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className={`h-[54px] w-full rounded-full border bg-white px-6 text-[26px] outline-none transition ${errors.password ? 'border-red-500' : 'border-[#111827]'}`}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••"
                  disabled={isLoading || lockoutSeconds > 0}
                  autoComplete="current-password"
                />
                {errors.password && <span className="mt-1 block text-sm text-red-600">{errors.password}</span>}
              </motion.div>

              <motion.div variants={itemVariants} className="mb-8 text-right">
                <Link to={ROUTES.FORGOT_PASSWORD} className="text-[31px] font-semibold text-[#111827]">
                  Forgot Password?
                </Link>
              </motion.div>

              {(lockoutMessage || errors.submit) && !showUnverified && (
                <motion.div variants={itemVariants} className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {lockoutMessage || errors.submit}
                </motion.div>
              )}

              {showUnverified && (
                <motion.div variants={itemVariants} className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="mb-2">
                    Verify your Email Address. Check your inbox and spam folder for the verification link.
                  </p>
                  <button
                    type="button"
                    className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold"
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

              {resendSuccess && (
                <motion.div variants={itemVariants} className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                  Verification email resent! Please check your inbox.
                </motion.div>
              )}

              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={isLoading || lockoutSeconds > 0}
                className="h-[60px] w-full rounded-full border border-[#7C2D12] bg-[#F97316] text-[30px] font-semibold text-white shadow-[0_4px_0_0_#7C2D12] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Loading...' : (lockoutSeconds > 0 ? `Locked (${formatCountdown(lockoutSeconds)})` : 'Login')}
              </motion.button>

              <motion.div variants={itemVariants} className="mt-7 text-center">
                <Link to={ROUTES.REGISTER} className="text-[33px] font-semibold text-[#111827]">
                  Create Account?
                </Link>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default LoginPage;
