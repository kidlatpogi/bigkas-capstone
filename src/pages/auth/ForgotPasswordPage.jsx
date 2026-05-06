import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { isValidEmail, validatePassword } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import PasswordToggle from '../../components/common/PasswordToggle';
import PushButton from '../../components/common/PushButton';
import { motion, AnimatePresence } from 'framer-motion';
import { getSpriteUrl } from '../../utils/assetUtils';
import './ForgotPasswordPage.css';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECS = 60;

function mapOtpError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const msg = String(error.message || '').toLowerCase();
  if (msg.includes('expired')) return 'This code has expired. Request a new one.';
  if (msg.includes('invalid') || msg.includes('incorrect')) return 'Incorrect code. Please check again.';
  return error.message || 'Verification failed.';
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
    <div ref={layoutRef} className="auth-page-v2" data-layout={layoutMode}>
      <div className="auth-container">
        <motion.div
          className="auth-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="auth-visual-side">
            <div className="auth-visual-content">
              <motion.div variants={itemVariants} className="auth-brand-logo">Bigkas</motion.div>
              <motion.div 
                className="auth-robot-img-wrap"
                initial={{ opacity: 1, y: 0 }}
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="auth-robot-glow" />
                <img src={getSpriteUrl('Robot/0001.webp')} alt="AI Companion" className="auth-robot-img" />
              </motion.div>

              {insightWords.map((word, i) => (
                <motion.div 
                  key={i}
                  className="insight-chip"
                  style={{ top: word.top, left: word.left, fontSize: word.size, opacity: word.opacity }}
                  animate={{ y: [0, -20, 0], x: [0, 15, 0] }}
                  transition={{ duration: 6 + (i % 4), repeat: Infinity, delay: word.delay, ease: "easeInOut" }}
                >
                  {word.text}
                </motion.div>
              ))}

              <motion.h2 variants={itemVariants} className="auth-hero-tagline">
                Master <span>Public Speaking</span>
              </motion.h2>
              <motion.p variants={itemVariants} className="auth-hero-desc">
                Recovery journey starts here. Let's get you back in.
              </motion.p>
            </div>
            <div className="auth-visual-waves">
              {[...Array(24)].map((_, i) => (
                <div key={i} className={`auth-visual-wave auth-visual-wave-${(i % 6) + 1}`} />
              ))}
            </div>
          </div>

          <div className="auth-form-side">
            <div className="auth-form-inner">
              <motion.h3 variants={itemVariants} className="auth-form-headline">
                {isDoneStep ? 'Success!' : 'Forgot Password'}
              </motion.h3>
              <motion.p variants={itemVariants} className="auth-form-subline">
                {isRequestStep && 'Enter your email to receive a reset code.'}
                {isVerifyStep && 'We sent a 6-digit code to your email.'}
                {isResetStep && 'Create a strong new password.'}
                {isDoneStep && 'Your password has been updated.'}
              </motion.p>

              <form className="auth-form" onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {(error || infoMessage) && !isDoneStep && (
                    <motion.div 
                      key={error ? 'err' : 'info'}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`auth-status-banner ${error ? 'is-error' : 'is-success'}`}
                    >
                      {error || infoMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {isRequestStep && (
                  <motion.div variants={itemVariants} className="form-group-v2">
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
                  </motion.div>
                )}

                {isVerifyStep && (
                  <motion.div variants={itemVariants} className="form-group-v2">
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
                    {resendCooldown > 0 ? (
                      <span className="resend-timer-v2">Resend in {resendCooldown}s</span>
                    ) : (
                      <button type="button" className="resend-link-v2" onClick={handleRequestCode}>Resend Code</button>
                    )}
                  </motion.div>
                )}

                {isResetStep && (
                  <>
                    <motion.div variants={itemVariants} className="form-group-v2">
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
                    </motion.div>
                    <motion.div variants={itemVariants} className="form-group-v2">
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
                    </motion.div>
                  </>
                )}

                {!isDoneStep && (
                  <motion.div variants={itemVariants} className="form-actions-v2">
                    <PushButton type="submit" disabled={isLoading} bgColor="#059669" shadowColor="#047857">
                      {isLoading ? <span className="loading-spinner" /> : (
                        isRequestStep ? 'Send Code' : isVerifyStep ? 'Verify Code' : 'Reset Password'
                      )}
                    </PushButton>
                  </motion.div>
                )}

                {isDoneStep && (
                  <motion.div variants={itemVariants} className="form-actions-v2">
                    <PushButton type="button" onClick={() => navigate(ROUTES.LOGIN)} bgColor="#059669" shadowColor="#047857">
                      Back to Login
                    </PushButton>
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="signup-prompt-v2">
                  <Link to={ROUTES.LOGIN}>Return to Login</Link>
                </motion.div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
