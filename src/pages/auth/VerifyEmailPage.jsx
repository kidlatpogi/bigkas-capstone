import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '@session/api/authApi';
import { ROUTES } from '../../utils/constants';
import PushButton from '../../components/common/PushButton';
import bigkasLogo from '../../assets/logos/0015.png';
import { getSpriteUrl } from '../../utils/assetUtils';
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
  const layoutRef = useRef(null);
  const resolvedEmail = (location.state?.email || window.localStorage.getItem(PENDING_EMAIL_KEY) || '').trim();
  
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [layoutMode, setLayoutMode] = useState('split');

  useEffect(() => {
    inputRefs.current[0]?.focus();
    document.documentElement.classList.add('login-page-active');
    document.body.classList.add('login-page-active');
    return () => {
      document.documentElement.classList.remove('login-page-active');
      document.body.classList.remove('login-page-active');
    };
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

  return (
    <div ref={layoutRef} className="auth-page-v2" data-layout={layoutMode}>
      <div className="auth-container">
        <motion.div 
          className="auth-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Side: Branding & Visuals (1:1 with Login) */}
          <div className="auth-visual-side">
            <motion.div variants={itemVariants} className="auth-brand-logo">
              <img src={bigkasLogo} alt="Bigkas" className="auth-logo-img" />
              <span>Bigkas</span>
            </motion.div>
            
            <div className="auth-visual-content">
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
                Your AI-powered journey to public speaking excellence starts here.
              </motion.p>
            </div>
            
            <div className="auth-visual-waves">
              {[...Array(24)].map((_, i) => (
                <div key={i} className={`auth-visual-wave auth-visual-wave-${(i % 6) + 1}`} />
              ))}
            </div>
          </div>

          {/* Right Side: Verification Form */}
          <div className="auth-form-side">
            <div className="auth-form-inner">
              <motion.h3 variants={itemVariants} className="auth-form-headline">Verify Your Email</motion.h3>
              <motion.p variants={itemVariants} className="auth-form-subline">
                We sent a code to <span className="verify-email-accent">{maskedEmail}</span>. Enter it below to activate your account.
              </motion.p>

              <div className="auth-form">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      className="auth-status-banner is-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}
                  {resendMessage && (
                    <motion.div 
                      className="auth-status-banner is-success"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {resendMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={itemVariants} className="otp-inputs-v2">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      className={`otp-digit-v2 ${error ? 'is-invalid' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(e, i)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      disabled={isVerifying}
                    />
                  ))}
                </motion.div>

                <motion.div variants={itemVariants} className="form-actions-v2">
                  <PushButton
                    className="verify-submit-btn"
                    onClick={handleVerify}
                    disabled={isVerifying || !digits.every(Boolean)}
                    bgColor="#059669"
                    shadowColor="#047857"
                  >
                    {isVerifying ? <span className="loading-spinner" /> : 'Verify Account'}
                  </PushButton>
                </motion.div>

                <motion.div variants={itemVariants} className="verify-footer-v2">
                  <p>Didn&apos;t receive a code?</p>
                  <button 
                    className="resend-btn-v2"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isResending}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </motion.div>

                <motion.div variants={itemVariants} className="signup-prompt-v2">
                  <button className="back-btn-v2" onClick={() => navigate(ROUTES.REGISTER)}>
                    Wrong email? Go back
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
