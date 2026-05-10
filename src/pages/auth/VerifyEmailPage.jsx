import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '@session/api/authApi';
import { ROUTES } from '../../utils/constants';
import PushButton from '../../components/common/PushButton';
import bigkasLogo from '../../assets/logos/0015.png';
import './VerifyEmailPage.css';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECS = 60;
const PENDING_EMAIL_KEY = 'bigkas_pending_verification_email';

function mapOtpError(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('expired')) return 'This code has expired. Please request a new one.';
  if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('token')) return 'Incorrect code. Please check and try again.';
  if (msg.includes('rate') || msg.includes('too many')) return 'Too many attempts. Please wait a moment.';
  return error.message || 'Verification failed. Please try again.';
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedEmail = (location.state?.email || window.localStorage.getItem(PENDING_EMAIL_KEY) || '').trim();
  
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    document.documentElement.classList.add('verify-page-active');
    return () => document.documentElement.classList.remove('verify-page-active');
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleChange = (e, index) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);
    setError('');
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const updated = [...digits];
      if (digits[index]) {
        updated[index] = '';
      } else if (index > 0) {
        updated[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      }
      setDigits(updated);
    } else if (e.key === 'Enter' && digits.every(Boolean)) {
      handleVerify();
    }
  };

  const handleVerify = async () => {
    const token = digits.join('');
    if (token.length < OTP_LENGTH || !resolvedEmail) return;
    setIsVerifying(true);
    setError('');
    const { error: otpError } = await authApi.verifyEmailOtp(resolvedEmail, token);
    
    if (otpError) {
      setIsVerifying(false);
      setError(mapOtpError(otpError));
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      return;
    }

    // Success — Sign out immediately to prevent auto-login/redirect to profiling
    // We want the user to manually log in after verification.
    await authApi.logout();
    
    setIsVerifying(false);
    window.localStorage.removeItem(PENDING_EMAIL_KEY);
    navigate(ROUTES.LOGIN, { state: { accountVerified: true }, replace: true });
  };

  const handleResend = async () => {
    if (!resolvedEmail || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    const { error: resendError } = await authApi.resendSignupOtp(resolvedEmail);
    setIsResending(false);
    if (resendError) {
      setError(resendError.message || 'Failed to resend code.');
      return;
    }
    setResendMessage('A new code was sent!');
    setResendCooldown(RESEND_COOLDOWN_SECS);
    setTimeout(() => setResendMessage(''), 5000);
  };

  const maskedEmail = resolvedEmail.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 8)) + c);

  return (
    <div className="verify-page-wrapper">
      <div className="verify-bg-blob blob-1" />
      <div className="verify-bg-blob blob-2" />
      
      <motion.div 
        className="verify-card-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="verify-glass-card">
          <div className="verify-header">
            <div className="verify-logo-wrap">
              <img src={bigkasLogo} alt="Bigkas" className="verify-logo-img" />
              <span className="verify-brand-name">Bigkas</span>
            </div>
            <h1 className="verify-title">Verify Your Email</h1>
            <p className="verify-subtitle">
              We sent a code to <span className="verify-email-highlight">{maskedEmail}</span>.
              Enter it below to activate your account.
            </p>
          </div>

          <div className="otp-inputs-grid">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                className={`otp-digit-input ${error ? 'has-error' : ''}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                disabled={isVerifying}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                className="verify-status-msg status-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.div>
            )}
            {resendMessage && (
              <motion.div 
                className="verify-status-msg status-success"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {resendMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <PushButton
            className="verify-action-btn"
            onClick={handleVerify}
            disabled={isVerifying || !digits.every(Boolean)}
            bgColor="#10b981"
            shadowColor="#065f46"
          >
            {isVerifying ? <span className="verify-loader" /> : 'Verify Account'}
          </PushButton>

          <div className="verify-footer-links">
            <div className="footer-link-item">
              Didn&apos;t receive a code?
              <button 
                className="footer-link-action"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
            <button 
              className="back-to-reg" 
              onClick={() => navigate(ROUTES.REGISTER)}
            >
              Wrong email? Go back
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

