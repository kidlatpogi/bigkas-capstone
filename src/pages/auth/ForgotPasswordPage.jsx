import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { isValidEmail, validatePassword } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import PasswordToggle from '../../components/common/PasswordToggle';
import PushButton from '../../components/common/PushButton';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { getAssetUrl, getSpriteUrl } from '../../utils/assetUtils';
import './ForgotPasswordPage.css';

import ForgotPasswordPageMobile from './ForgotPasswordPageMobile';

const robotImgUrl = "https://assets.bigkas.site/Sprites/Robot/0001.webp";
const bigkasLogoUrl = "https://assets.bigkas.site/Images/Bigkas-Logo.webp";

// Module-level preloading for LCP optimization
if (typeof window !== 'undefined') {
  const p1 = new Image(); p1.src = robotImgUrl;
  const p2 = new Image(); p2.src = bigkasLogoUrl;
}

function ForgotPasswordPageDesktop({
  email,
  setEmail,
  digits,
  inputRefs,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  error,
  infoMessage,
  step,
  isLoading,
  resendCooldown,
  handleDigitChange,
  handleKeyDown,
  handleRequestCode,
  handleSubmit,
  passwordStrength,
  strengthLabel,
  strengthColor,
  layoutRef,
  layoutMode,
  navigate
}) {
  const isRequestStep = step === 'request';
  const isVerifyStep = step === 'verify';
  const isResetStep = step === 'reset';
  const isDoneStep = step === 'done';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const insightWords = [
    { text: 'Visual', size: '1rem', opacity: 0.8, top: '15%', left: '12%', delay: 0 },
    { text: 'Vocal', size: '0.95rem', opacity: 0.7, top: '22%', left: '80%', delay: 1 },
    { text: 'Verbal', size: '0.9rem', opacity: 0.6, top: '68%', left: '8%', delay: 0.5 },
    { text: 'Gesture', size: '1.1rem', opacity: 0.9, top: '12%', left: '65%', delay: 2 },
    { text: 'Eye Contact', size: '1rem', opacity: 0.75, top: '55%', left: '82%', delay: 1.5 },
    { text: 'Confidence', size: '1.15rem', opacity: 0.95, top: '50%', left: '10%', delay: 0 },
    { text: 'Presence', size: '1.1rem', opacity: 0.85, top: '18%', left: '42%', delay: 1.2 },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <div ref={layoutRef} className="auth-page-v2" data-layout={layoutMode}>
        <div className="auth-container">
          <m.div
            className="auth-card"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="auth-visual-side">
              <div className="auth-brand-logo">
                <img 
                  src={bigkasLogoUrl} 
                  alt="Bigkas" 
                  className="auth-logo-img" 
                  width="48" 
                  height="48" 
                  loading="eager" 
                  fetchpriority="high"
                />
                <span>Bigkas</span>
              </div>
              <div className="auth-visual-content">
                <div className="auth-robot-img-wrap">
                  <div className="auth-robot-glow" />
                  <img 
                    src={robotImgUrl} 
                    alt="AI Companion" 
                    className="auth-robot-img" 
                    fetchpriority="high"
                    loading="eager"
                    width="460"
                    height="460"
                  />
                </div>

                {insightWords.map((word, i) => (
                  <m.div 
                    key={i}
                    className="insight-chip"
                    style={{ top: word.top, left: word.left, fontSize: word.size, opacity: word.opacity }}
                    animate={{ y: [0, -20, 0], x: [0, 15, 0] }}
                    transition={{ duration: 6 + (i % 4), repeat: Infinity, delay: word.delay, ease: "easeInOut" }}
                  >
                    {word.text}
                  </m.div>
                ))}

                <m.h2 variants={itemVariants} className="auth-hero-tagline">
                  Master <span>Public Speaking</span>
                </m.h2>
                <m.p variants={itemVariants} className="auth-hero-desc">
                  Recovery journey starts here. Let's get you back in.
                </m.p>
              </div>
            </div>

            <div className="auth-form-side">
              <div className="auth-form-inner">
                <m.h1 variants={itemVariants} className="auth-form-headline">
                  {isDoneStep ? 'Success!' : 'Forgot Password'}
                </m.h1>
                <m.p variants={itemVariants} className="auth-form-subline">
                  {isRequestStep && 'Enter your email to receive a reset code.'}
                  {isVerifyStep && 'We sent a 6-digit code to your email.'}
                  {isResetStep && 'Create a strong new password.'}
                  {isDoneStep && 'Your password has been updated.'}
                </m.p>

                <form className="auth-form" onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    {(error || infoMessage) && !isDoneStep && (
                      <m.div 
                        key={error ? 'err' : 'info'}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`auth-status-banner ${error ? 'is-error' : 'is-success'}`}
                      >
                        {error || infoMessage}
                      </m.div>
                    )}
                  </AnimatePresence>

                  {isRequestStep && (
                    <m.div variants={itemVariants} className="form-group-v2">
                      <label>Email Address</label>
                      <div className="input-field-wrap">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@gmail.com"
                          disabled={isLoading}
                          autoFocus
                        />
                      </div>
                    </m.div>
                  )}

                  {isVerifyStep && (
                    <m.div variants={itemVariants} className="form-group-v2">
                      <label>6-Digit Code</label>
                      <div className="otp-container-v2">
                        {digits.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => (inputRefs.current[i] = el)}
                            className="otp-box-v2"
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(e, i)}
                            onKeyDown={(e) => handleKeyDown(e, i)}
                          />
                        ))}
                      </div>
                      <div className="form-footer-row" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                        {resendCooldown > 0 ? (
                          <span className="resend-timer-v2">Resend in {resendCooldown}s</span>
                        ) : (
                          <button type="button" className="resend-link-v2" onClick={handleRequestCode}>Resend Code</button>
                        )}
                      </div>
                    </m.div>
                  )}

                  {isResetStep && (
                    <>
                      <m.div variants={itemVariants} className="form-group-v2">
                        <label>New Password</label>
                        <div className="input-field-wrap">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                          <PasswordToggle isVisible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                        </div>
                        {newPassword && (
                          <div className="pw-strength-v2">
                            <div className="pw-strength-track">
                              <div className="pw-strength-fill" style={{ width: `${(passwordStrength / 4) * 100}%`, background: strengthColor }} />
                            </div>
                            <span style={{ color: strengthColor }}>{strengthLabel}</span>
                          </div>
                        )}
                      </m.div>
                      <m.div variants={itemVariants} className="form-group-v2">
                        <label>Confirm Password</label>
                        <div className="input-field-wrap">
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                          <PasswordToggle isVisible={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
                        </div>
                      </m.div>
                    </>
                  )}

                  {!isDoneStep && (
                    <m.div variants={itemVariants} className="form-actions-v2">
                      <PushButton type="submit" disabled={isLoading} bgColor="#059669" shadowColor="#047857">
                        {isLoading ? <span className="loading-spinner" /> : (
                          isRequestStep ? 'Send Code' : isVerifyStep ? 'Verify Code' : 'Reset Password'
                        )}
                      </PushButton>
                    </m.div>
                  )}

                  {isDoneStep && (
                    <m.div variants={itemVariants} className="form-actions-v2">
                      <PushButton type="button" onClick={() => navigate(ROUTES.LOGIN)} bgColor="#059669" shadowColor="#047857">
                        Back to Login
                      </PushButton>
                    </m.div>
                  )}

                  <m.div variants={itemVariants} className="signup-prompt-v2">
                    <Link to={ROUTES.LOGIN}>Return to Login</Link>
                  </m.div>
                </form>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </LazyMotion>
  );
}

function ForgotPasswordPage({ managePageClass = true }) {
  const layoutRef = useRef(null);
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [step, setStep] = useState('request'); // request | verify | reset | done
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [layoutMode, setLayoutMode] = useState('split');

  const isRequestStep = step === 'request';
  const isVerifyStep = step === 'verify';
  const isResetStep = step === 'reset';
  const isDoneStep = step === 'done';

  useEffect(() => {
    if (managePageClass) {
      document.documentElement.classList.add('forgot-page-active');
      document.body.classList.add('forgot-page-active');
    }
    return () => {
      if (managePageClass) {
        document.documentElement.classList.remove('forgot-page-active');
        document.body.classList.remove('forgot-page-active');
      }
    };
  }, [managePageClass]);

  useEffect(() => {
    if (!layoutRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect?.width || window.innerWidth;
      setLayoutMode(width < 960 ? 'stack' : 'split');
    });
    observer.observe(layoutRef.current);
    return () => observer.disconnect();
  }, []);

  const passwordStrength = (() => {
    const p = newPassword;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score += 1;
    if (p.length >= 12) score += 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    return Math.min(score, 4);
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'][passwordStrength];

  const focusBox = (index) => inputRefs.current[index]?.focus();

  const handleDigitChange = (e, index) => {
    const raw = e.target.value;
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);
    setError('');
    if (index < OTP_LENGTH - 1) focusBox(index + 1);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        const updated = [...digits];
        updated[index] = '';
        setDigits(updated);
      } else if (index > 0) {
        const updated = [...digits];
        updated[index - 1] = '';
        setDigits(updated);
        focusBox(index - 1);
      }
    } else if (e.key === 'Enter' && isVerifyStep) {
      handleVerifyCode();
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECS);
    const intervalId = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestCode = async () => {
    setError(null);
    if (!email.trim() || !isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }
    setIsLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setIsLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStep('verify');
    setInfoMessage(`We sent a code to ${email}.`);
    startResendCooldown();
  };

  const handleVerifyCode = async () => {
    const token = digits.join('');
    if (token.length !== OTP_LENGTH) {
      setError('Enter 6-digit code');
      return;
    }
    setIsLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });
    setIsLoading(false);
    if (verifyError) {
      setError(mapOtpError(verifyError));
      return;
    }
    setStep('reset');
    setInfoMessage('Verify successful. Reset your password.');
  };

  const handleSetNewPassword = async () => {
    if (!newPassword.trim()) {
      setError('Password required');
      return;
    }
    const val = validatePassword(newPassword);
    if (!val.isValid) {
      setError(val.errors[0]);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setIsLoading(false);
      setError(updateError.message);
      return;
    }
    await supabase.auth.signOut();
    setIsLoading(false);
    setStep('done');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRequestStep) handleRequestCode();
    else if (isVerifyStep) handleVerifyCode();
    else if (isResetStep) handleSetNewPassword();
  };

  const commonProps = {
    email, setEmail, digits, inputRefs, newPassword, setNewPassword,
    confirmPassword, setConfirmPassword, showPassword, setShowPassword,
    showConfirm, setShowConfirm, error, infoMessage, step, isLoading,
    resendCooldown, handleDigitChange, handleKeyDown, handleRequestCode,
    handleSubmit, passwordStrength, strengthLabel, strengthColor,
    layoutRef, layoutMode, navigate, bigkasLogo: bigkasLogoUrl
  };

  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobileOrTablet(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobileOrTablet ? (
    <ForgotPasswordPageMobile {...commonProps} />
  ) : (
    <ForgotPasswordPageDesktop {...commonProps} />
  );
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECS = 60;

function mapOtpError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const msg = String(error.message || '').toLowerCase();
  if (msg.includes('expired')) return 'This code has expired. Request a new one.';
  if (msg.includes('invalid') || msg.includes('incorrect')) return 'Incorrect code. Please check again.';
  return error.message || 'Verification failed.';
}

export default ForgotPasswordPage;
