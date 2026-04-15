import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@session/api/authApi';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import PushButton from '../../components/common/PushButton';
import BackButton from '../../components/common/BackButton';
import './VerifyEmailPage.css';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECS = 60;
const PENDING_EMAIL_KEY = 'bigkas_pending_verification_email';

/**
 * Normalise Supabase OTP error messages into user-friendly strings.
 */
function mapOtpError(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('token has expired') || msg.includes('otp expired') || msg.includes('expired')) {
    return 'This code has expired. Please request a new one below.';
  }
  if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('does not match') || msg.includes('token')) {
    return 'Incorrect code. Please double-check and try again.';
  }
  if (msg.includes('rate') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  return error.message || 'Verification failed. Please try again.'; 
}

/**
 * VerifyEmailPage â€” 6-Digit OTP entry after registration.
 *
 * Email resolution priority:
 *  1. React Router navigation state  (navigate(ROUTES.VERIFY_EMAIL, { state: { email } }))
 *  2. localStorage key  bigkas_pending_verification_email  (written by RegisterPage)
 */
function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // â”€â”€ Resolve the email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const resolvedEmail = (
    location.state?.email ||
    window.localStorage.getItem(PENDING_EMAIL_KEY) ||
    ''
  ).trim();

  // â”€â”€ OTP digit state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef([]);

  // â”€â”€ Async / UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('verify-page-active');
    document.body.classList.add('verify-page-active');
    return () => {
      document.documentElement.classList.remove('verify-page-active');
      document.body.classList.remove('verify-page-active');
    };
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const focusBox = (index) => {
    inputRefs.current[index]?.focus();
  };

  const handleChange = (e, index) => {
    const raw = e.target.value;
    // Only accept digits; take the last character typed to handle rapid input
    const digit = raw.replace(/\D/g, '').slice(-1);

    if (!digit) return; // non-digit â€” ignore (keyDown handles backspace)

    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);
    setError('');

    // Advance focus
    if (index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Clear current box content
        const updated = [...digits];
        updated[index] = '';
        setDigits(updated);
      } else if (index > 0) {
        // Move back and clear previous box
        const updated = [...digits];
        updated[index - 1] = '';
        setDigits(updated);
        focusBox(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const updated = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setDigits(updated);
    setError('');
    // Focus the box after the last pasted digit (or last box)
    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleVerify = async () => {
    const token = digits.join('');
    if (token.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.');
      focusBox(digits.findIndex((d) => !d));
      return;
    }
    if (!resolvedEmail) {
      setError('Could not determine your email. Please go back and register again.');
      return;
    }

    setIsVerifying(true);
    setError('');

    const { error: otpError } = await authApi.verifyEmailOtp(resolvedEmail, token);

    setIsVerifying(false);

    if (otpError) {
      setError(mapOtpError(otpError));
      // Clear the boxes so the user can re-enter
      setDigits(Array(OTP_LENGTH).fill(''));
      focusBox(0);
      return;
    }

    // Success â€” clean up localStorage and go to login
    window.localStorage.removeItem(PENDING_EMAIL_KEY);
    navigate(ROUTES.LOGIN, {
      state: { accountVerified: true },
      replace: true,
    });
  };

  // Allow Enter key to submit when all digits are filled
  const handleBoxKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      handleVerify();
      return;
    }
    handleKeyDown(e, index);
  };

  // â”€â”€ Resend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleResend = async () => {
    if (!resolvedEmail || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendMessage('');
    setError('');

    const { error: resendError } = await authApi.resendSignupOtp(resolvedEmail);

    setIsResending(false);

    if (resendError) {
      const msg = (resendError.message || '').toLowerCase();
      if (msg.includes('rate') || msg.includes('too many')) {
        setError('Too many resend requests. Please wait a few minutes.');
      } else {
        setError(resendError.message || 'Failed to resend code. Please try again.');
      }
      return;
    }

    setResendMessage(`A new code was sent to ${resolvedEmail}.`);
    setResendCooldown(RESEND_COOLDOWN_SECS);
    setDigits(Array(OTP_LENGTH).fill(''));
    focusBox(0);
  };

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allFilled = digits.every(Boolean);
  const maskedEmail = resolvedEmail
    ? resolvedEmail.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : 'your email';

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="auth-page">
      <BackButton className="auth-login-back" to={ROUTES.REGISTER} fallbackTo={ROUTES.HOME} />
      <div className="auth-form-panel">
        <div className="auth-form-container floating-card verify-email-card">
          <h2 className="auth-form-title">VERIFY YOUR EMAIL</h2>

          <p className="otp-instructions">
            We sent a 6-digit code to{' '}
            <strong className="otp-email-highlight">{maskedEmail}</strong>.
            Enter it below to activate your account.
          </p>

          {/* â”€â”€ Split-box OTP input â”€â”€ */}
          <div
            className="otp-boxes"
            onPaste={handlePaste}
            role="group"
            aria-label="One-time password input"
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                className={`otp-box${error ? ' otp-box-error' : ''}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleBoxKeyDown(e, i)}
              />
            ))}
          </div>

          {/* â”€â”€ Error banner â”€â”€ */}
          {error && (
            <p className="auth-error-banner otp-error-banner" role="alert">
              {error}
            </p>
          )}

          {/* â”€â”€ Success resend banner â”€â”€ */}
          {resendMessage && !error && (
            <p className="auth-success-banner otp-resend-success" role="status">
              {resendMessage}
            </p>
          )}

          {/* â”€â”€ Verify button â”€â”€ */}
          <PushButton
            type="button"
            className="verify-submit-btn"
            onClick={handleVerify}
            disabled={isVerifying || !allFilled}
            bgColor="#5A7863"
            shadowColor="#3E5646"
            textColor="#ffffff"
          >
            {isVerifying ? <span className="btn-loader"></span> : 'VERIFY EMAIL'}
          </PushButton>

          {/* ── Resend section ── */}
          <div className="otp-resend-row">
            <span className="otp-resend-label">Didn&rsquo;t receive a code?</span>
            <Button
              type="button"
              variant="ghost"
              className="otp-resend-btn"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending || !resolvedEmail}
              isLoading={isResending}
            >
              {resendCooldown > 0
                ? `Resend Code in ${resendCooldown}s`
                : 'Resend Code'}
            </Button>
          </div>

          {/* ── Back to register link ── */}
          <div className="otp-back-row">
            <Button
              type="button"
              variant="ghost"
              className="auth-forgot-link"
              onClick={() => navigate(ROUTES.REGISTER)}
            >
              Wrong email? Go back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
