import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { isValidEmail, validatePassword } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import macbookImage from '../../assets/backgrounds/Login/MacBook.png';
import PasswordToggle from '../../components/common/PasswordToggle';
import LegalModal from '../../components/Legal/LegalModal';
import { TERMS_AND_CONDITIONS } from '../../constants/legal/terms';
import { PRIVACY_POLICY } from '../../constants/legal/privacy';
import { motion } from 'framer-motion';
import './RegisterPage.css';

/**
 * Register Page — Centered form with blue gradient background
 * Separate styling from Login page
 */
function RegisterPage() {
  const layoutRef = useRef(null);
  const navigate = useNavigate();
  const { register, isLoading } = useAuthContext();

  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '', content: '' });
  const [consentChecked, setConsentChecked] = useState(false);

  const showTerms = (e) => {
    e.preventDefault();
    setLegalModal({ isOpen: true, title: 'Terms & Conditions', content: TERMS_AND_CONDITIONS });
  };
  const showPrivacy = (e) => {
    e.preventDefault();
    setLegalModal({ isOpen: true, title: 'Privacy Policy', content: PRIVACY_POLICY });
  };
  const closeLegal = () => setLegalModal({ ...legalModal, isOpen: false });

  useEffect(() => {
    // Add register-page-active class to body
    document.documentElement.classList.add('register-page-active');
    document.body.classList.add('register-page-active');

    return () => {
      // Clean up on unmount
      document.documentElement.classList.remove('register-page-active');
      document.body.classList.remove('register-page-active');
    };
  }, []);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [layoutMode, setLayoutMode] = useState('split');

  /* Password strength — 0..4 */
  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 4);
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'][passwordStrength];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mapSignupError = (message) => {
    if (!message) return 'Registration failed. Please try again.';
    const normalized = message.toLowerCase();

    if (normalized.includes('too many') || normalized.includes('429') || normalized.includes('rate limit')) {
      return 'Too many signup attempts. Please wait a minute and try again.';
    }

    if (normalized.includes('already registered') || normalized.includes('already exists') || normalized.includes('already been registered')) {
      return 'This email is already registered. Try logging in instead.';
    }

    if (normalized.includes('password')) {
      return 'Password does not meet the requirements. Use at least 8 characters with a mix of letters and numbers.';
    }

    if (normalized.includes('500') || normalized.includes('internal server') || normalized.includes('unavailable') || normalized.includes('email service')) {
      return 'The sign-up service is temporarily unavailable. This can happen when the email verification service is unreachable. Please try again in a few minutes.';
    }

    if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('internet')) {
      return 'Unable to reach the server. Please check your internet connection and try again.';
    }

    if (normalized.includes('invalid') && normalized.includes('email')) {
      return 'Please enter a valid email address.';
    }

    return message;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validateForm()) return;

    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });

      if (result.success) {
        // Write email to localStorage so VerifyEmailPage can read it even after
        // a hard refresh (navigation state is lost on reload).
        window.localStorage.setItem('bigkas_pending_verification_email', formData.email);

        // Redirect to OTP verification screen
        navigate(ROUTES.VERIFY_EMAIL, {
          state: { email: formData.email },
          replace: true,
        });
        return;
      }

      setErrors({ submit: mapSignupError(result.error) });
    } catch {
      setErrors({
        submit: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
      });
    }
  };

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
        root.style.setProperty('--register-kb-offset', '0px');
        return;
      }

      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty('--register-kb-offset', '0px');
        return;
      }

      const keyboardOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--register-kb-offset', `${Math.round(keyboardOffset)}px`);
    };

    setKeyboardOffset();
    window.visualViewport?.addEventListener('resize', setKeyboardOffset);
    window.visualViewport?.addEventListener('scroll', setKeyboardOffset);
    window.addEventListener('resize', setKeyboardOffset);

    return () => {
      root.style.setProperty('--register-kb-offset', '0px');
      window.visualViewport?.removeEventListener('resize', setKeyboardOffset);
      window.visualViewport?.removeEventListener('scroll', setKeyboardOffset);
      window.removeEventListener('resize', setKeyboardOffset);
    };
  }, [layoutMode]);

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
      className="auth-page"
      data-layout={layoutMode}
    >
      <div className="auth-form-panel">
        <motion.div
          className="floating-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="auth-brand">Bigkas</motion.div>
          <motion.h2 variants={itemVariants} className="auth-form-title">Create Account</motion.h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            {errors.submit && (
              <motion.div variants={itemVariants} className="auth-error-banner">{errors.submit}</motion.div>
            )}

            <motion.div variants={itemVariants} className="form-row">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className={`form-input ${errors.firstName ? 'form-input-error' : ''}`}
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  disabled={isLoading}
                />
                {errors.firstName && <span className="form-error">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lastName" className="form-label">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className={`form-input ${errors.lastName ? 'form-input-error' : ''}`}
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  disabled={isLoading}
                />
                {errors.lastName && <span className="form-error">{errors.lastName}</span>}
              </div>
            </motion.div>

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
                disabled={isLoading}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </motion.div>

            <motion.div variants={itemVariants} className="form-group">
              <label htmlFor="password" className="form-label">Current Password</label>
              <div className="pw-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <PasswordToggle
                  isVisible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  label="password"
                  disabled={isLoading}
                />
              </div>
              {formData.password && (
                <div className="pw-strength">
                  <div className="pw-strength-bars">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="pw-strength-bar"
                        style={{ background: n <= passwordStrength ? strengthColor : '#E5E7EB' }}
                      />
                    ))}
                  </div>
                  <span className="pw-strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
              {errors.password && <span className="form-error">{errors.password}</span>}
            </motion.div>

            <motion.div variants={itemVariants} className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <div className="pw-input-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className={`form-input ${errors.confirmPassword ? 'form-input-error' : ''}`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <PasswordToggle
                  isVisible={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  label="confirm password"
                  disabled={isLoading}
                />
              </div>
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </motion.div>

            <motion.div variants={itemVariants} className="form-group consent-group">
              <label className="consent-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#4b5563', lineHeight: '1.4' }}>
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <span>
                  I have read and agree to the <a href="#" onClick={showTerms} style={{ color: '#2d5a27', fontWeight: '700', textDecoration: 'none' }}>Terms and Conditions</a> and <a href="#" onClick={showPrivacy} style={{ color: '#2d5a27', fontWeight: '700', textDecoration: 'none' }}>Privacy Policy</a>, including the 14-day biometric data retention policy.
                </span>
              </label>
            </motion.div>

            <motion.div variants={itemVariants} className="auth-submit-btn">
              <button type="submit" disabled={isLoading || !consentChecked}>
                {isLoading ? <span className="btn-loader"></span> : 'Create Account'}
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className="auth-footer">
              <Link to={ROUTES.LOGIN} className="auth-link">Login?</Link>
            </motion.div>
          </form>
        </motion.div>
      </div>

      <div className="auth-hero-panel" aria-hidden="true">
        <div className="auth-wave-pattern">
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={`bar-${index}`} className={`auth-wave-bar auth-wave-bar-${index + 1}`} />
          ))}
        </div>
        <img src={macbookImage} alt="" className="auth-hero-macbook" />
        <h1 className="auth-hero-title">
          Start you
          <br />
          Journey
        </h1>
      </div>

      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={closeLegal}
        title={legalModal.title}
        content={legalModal.content}
      />
    </div>
  );
}

export default RegisterPage;
