import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { isValidEmail, validatePassword } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import BackButton from '../../components/common/BackButton';
import Button from '../../components/common/Button';
import PasswordToggle from '../../components/common/PasswordToggle';
import Grainient from './Grainient';
import './ForgotPasswordPage.css';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECS = 60;

function mapOtpError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const msg = String(error.message || '').toLowerCase();

  if (msg.includes('expired')) {
    return 'This code has expired. Request a new code and try again.';
  }
  if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('token')) {
    return 'Incorrect code. Please check and try again.';
  }
  if (msg.includes('rate') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }

  return error.message || 'Verification failed. Please try again.';
}

function ForgotPasswordPage() {
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

  const isRequestStep = step === 'request';
  const isVerifyStep = step === 'verify';
  const isResetStep = step === 'reset';
  const isDoneStep = step === 'done';

  // Set page class on mount, remove on unmount
  useEffect(() => {
    document.body.classList.add('forgot-page-active');
    return () => {
      document.body.classList.remove('forgot-page-active');
    };
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

  useEffect(() => {
    if (!isVerifyStep) return;
    inputRefs.current[0]?.focus();
  }, [isVerifyStep]);

  const focusBox = (index) => {
    inputRefs.current[index]?.focus();
  };

  const handleChange = (e, index) => {
    const raw = e.target.value;
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;

    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);
    setError('');

    if (index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
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
    for (let i = 0; i < pasted.length; i += 1) {
      updated[i] = pasted[i];
    }
    setDigits(updated);
    setError('');
    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleBoxKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      handleVerifyCode();
      return;
    }
    handleKeyDown(e, index);
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
    setInfoMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    setIsLoading(false);

    if (otpError) {
      setError(otpError.message || 'Failed to send reset code.');
      return;
    }

    setStep('verify');
    setDigits(Array(OTP_LENGTH).fill(''));
    setInfoMessage(`We sent a 6-digit reset code to ${trimmedEmail}.`);
    startResendCooldown();
  };

  const handleVerifyCode = async () => {
    setError(null);
    setInfoMessage('');

    const trimmedEmail = email.trim();
    const token = digits.join('');
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email first.');
      setStep('request');
      return;
    }
    if (token.length !== OTP_LENGTH) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setIsLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token,
      type: 'email',
    });

    setIsLoading(false);

    if (verifyError) {
      setError(mapOtpError(verifyError));
      setDigits(Array(OTP_LENGTH).fill(''));
      focusBox(0);
      return;
    }

    setStep('reset');
    setDigits(Array(OTP_LENGTH).fill(''));
    setInfoMessage('Code verified. Create your new password.');
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setError(null);
    setInfoMessage('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email.');
      setStep('request');
      return;
    }

    setIsLoading(true);
    const { error: resendError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false,
      },
    });
    setIsLoading(false);

    if (resendError) {
      setError(resendError.message || 'Failed to resend code.');
      return;
    }

    setInfoMessage(`A new reset code was sent to ${trimmedEmail}.`);
    startResendCooldown();
  };

  const handleSetNewPassword = async () => {
    setError(null);
    setInfoMessage('');

    if (!newPassword.trim()) {
      setError('New password is required');
      return;
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
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
      setError(updateError.message || 'Failed to update password.');
      return;
    }

    await supabase.auth.signOut();
    setIsLoading(false);
    setStep('done');
    setNewPassword('');
    setConfirmPassword('');
    setInfoMessage('Your password has been reset successfully.');
  };

  const handleBackToLogin = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    await supabase.auth.signOut();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRequestStep) {
      await handleRequestCode();
      return;
    }
    if (isVerifyStep) {
      await handleVerifyCode();
      return;
    }
    if (isResetStep) {
      await handleSetNewPassword();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-grainient-bg" aria-hidden="true">
        <Grainient
          color1="#5a7863"
          color2="#0b3954"
          color3="#3c4952"
          timeSpeed={0.25}
          colorBalance={0.05}
          warpStrength={1}
          warpFrequency={2}
          warpSpeed={2.5}
          warpAmplitude={50}
          blendAngle={-25}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>
      {/* ── Left branding panel ── */}
      <div className="auth-brand-panel">
        <BackButton className="auth-mobile-back" onClick={() => navigate(ROUTES.HOME, { state: { skipLoader: true } })} />

        <div className="auth-brand-content">
          <h1 className="auth-brand-name">BIGKAS</h1>
          <p className="auth-brand-tagline">PUBLIC SPEAKING COACH</p>
          <div className="auth-brand-line" />

          <ul className="auth-brand-features">
            <li>
              <span className="feature-num">01</span>
              <span className="feature-text">SPEECH ANALYSIS</span>
            </li>
            <li>
              <span className="feature-num">02</span>
              <span className="feature-text">CONFIDENCE SCORING</span>
            </li>
            <li>
              <span className="feature-num">03</span>
              <span className="feature-text">RHETORIC DESIGN</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <h2 className="auth-form-title forgot-password-title">FORGOT PASSWORD</h2>

          {isDoneStep ? (
            <div className="forgot-success">
              <div className="forgot-success-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="23" stroke="#FCBA04" strokeWidth="2" />
                  <path d="M14 24l7 7 13-13" stroke="#FCBA04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="forgot-success-title">PASSWORD UPDATED</h3>
              <p className="forgot-success-text">
                Your password was changed successfully for{' '}
                <strong>{email.trim()}</strong>.
              </p>
              <p className="forgot-success-note">You can now log in using your new password.</p>

              <Button
                type="button"
                className="auth-submit-btn"
                onClick={handleBackToLogin}
              >
                BACK TO LOG IN
              </Button>
            </div>
          ) : (
            <>
              <p className="forgot-description">
                {isRequestStep && 'Enter your account email and we\'ll send a 6-digit reset code.'}
                {isVerifyStep && 'Enter the 6-digit reset code from your email.'}
                {isResetStep && 'Create your new password after successful code verification.'}
              </p>

              <form className="auth-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="auth-error-banner">{error}</div>
                )}

                {!error && infoMessage && (
                  <div className="auth-success-banner">{infoMessage}</div>
                )}

                {isRequestStep && (
                  <div className="form-group">
                    <label htmlFor="reset-email" className="form-label">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      id="reset-email"
                      name="email"
                      className={`form-input ${error ? 'form-input-error' : ''}`}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="name@gmail.com"
                      disabled={isLoading || isResetStep}
                      autoFocus
                    />
                  </div>
                )}

                {isVerifyStep && (
                  <div className="form-group">
                    <label className="form-label">6-DIGIT CODE</label>
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
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {isResetStep && (
                  <>
                    <div className="form-group">
                      <label htmlFor="new-password" className="form-label">NEW PASSWORD</label>
                      <div className="pw-input-wrap">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="new-password"
                          name="new-password"
                          className={`form-input ${error ? 'form-input-error' : ''}`}
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                          placeholder="••••••••"
                          disabled={isLoading}
                          autoComplete="new-password"
                        />
                        <PasswordToggle
                          isVisible={showPassword}
                          onToggle={() => setShowPassword((v) => !v)}
                          disabled={isLoading}
                        />
                      </div>
                      {newPassword && (
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
                      <span className="pw-hint">Min. 8 characters with letters and numbers</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirm-password" className="form-label">CONFIRM PASSWORD</label>
                      <div className="pw-input-wrap">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          id="confirm-password"
                          name="confirm-password"
                          className={`form-input ${error ? 'form-input-error' : ''}`}
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                          placeholder="••••••••"
                          disabled={isLoading}
                          autoComplete="new-password"
                        />
                        <PasswordToggle
                          isVisible={showConfirm}
                          onToggle={() => setShowConfirm((v) => !v)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className={`auth-submit-btn${isVerifyStep || isResetStep ? ' auth-submit-btn--verify' : ''}`}
                  disabled={isLoading || (isVerifyStep && digits.some((d) => !d))}
                  isLoading={isLoading}
                >
                  {isRequestStep && 'SEND CODE'}
                  {isVerifyStep && 'VERIFY CODE'}
                  {isResetStep && 'RESET PASSWORD'}
                </Button>
              </form>

              {isVerifyStep && (
                <div className="resend-section">
                  <p className="resend-text">Didn't receive the code?</p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="resend-btn"
                    onClick={handleResendCode}
                    disabled={isLoading || resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'RESEND CODE'}
                  </Button>
                </div>
              )}

              <div className="auth-footer" style={{ marginTop: 24 }}>
                <p className="auth-footer-label">REMEMBER YOUR PASSWORD?</p>
                <Link to={ROUTES.LOGIN} className="auth-link" onClick={handleBackToLogin}>BACK TO LOG IN</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
