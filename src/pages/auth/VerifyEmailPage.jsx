import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, PENDING_SIGNUP_PASSWORD_KEY } from '@session/api/authApi';
import { ROUTES } from '../../utils/constants';
import VerifyEmailPageMobile from './VerifyEmailPageMobile';
import './VerifyEmailPage.css';

const VerifyEmailPageDesktop = lazy(() => import('./VerifyEmailPageDesktop'));

const bigkasLogoUrl = "https://assets.bigkas.site/Images/Bigkas-Logo.webp";
const robotImgUrl = "https://assets.bigkas.site/Sprites/Robot/0001.webp";

// Module-level preloading for LCP optimization
if (typeof window !== 'undefined') {
  const p1 = new Image(); p1.src = bigkasLogoUrl;
  // Only preload robot on desktop to save bandwidth on mobile
  if (window.innerWidth >= 1024) {
    const p2 = new Image(); p2.src = robotImgUrl;
  }
}

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
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobileOrTablet(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
    document.documentElement.classList.add('login-page-active');
    document.body.classList.add('login-page-active');
    return () => {
      document.documentElement.classList.remove('login-page-active');
      document.body.classList.remove('login-page-active');
    };
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
    window.sessionStorage.removeItem(PENDING_SIGNUP_PASSWORD_KEY);
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

  const handleWrongEmail = async () => {
    window.localStorage.removeItem(PENDING_EMAIL_KEY);
    window.sessionStorage.removeItem(PENDING_SIGNUP_PASSWORD_KEY);
    await authApi.logout().catch(() => {});
    navigate(ROUTES.REGISTER, { replace: true });
  };

  const maskedEmail = resolvedEmail.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 8)) + c);

  const commonProps = {
    maskedEmail, digits, inputRefs, isVerifying, isResending, error,
    resendMessage, resendCooldown, handleChange, handleKeyDown,
    handleVerify, handleResend, handleWrongEmail, bigkasLogo: bigkasLogoUrl, robotImgUrl
  };

  return isMobileOrTablet ? (
    <VerifyEmailPageMobile {...commonProps} />
  ) : (
    <Suspense fallback={null}>
      <VerifyEmailPageDesktop {...commonProps} />
    </Suspense>
  );
}
