import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { isValidEmail, validatePassword } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import kamayImage from '../../assets/backgrounds/Login/Kamay.png';
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
    document.documentElement.classList.add('forgot-page-active');
    document.body.classList.add('forgot-page-active');
    return () => {
      document.documentElement.classList.remove('forgot-page-active');
      document.body.classList.remove('forgot-page-active');
    };
  }, []);

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

        <h1 className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-pre-line text-center font-fredoka text-[60px] font-semibold leading-[0.95] text-white">
          Master{'\n'}Speaking
        </h1>
      </section>

      <section className="relative flex min-h-dvh w-full items-center justify-center px-4 py-6 lg:w-1/2 lg:justify-end lg:px-0 lg:py-0">
        <div className="relative w-full max-w-[540px] overflow-hidden rounded-3xl bg-[#FDFDF9] p-7 sm:p-10 lg:h-dvh lg:max-w-[560px] lg:rounded-none lg:rounded-l-[24px] lg:pl-7 lg:pr-10">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[rgba(52,211,153,0.18)] to-transparent" />

          <h1 className="relative z-10 font-fredoka text-[28px] font-semibold leading-none text-[#059669]">
            Bigkas
          </h1>

          <div className="relative z-10 flex min-h-[76dvh] items-center justify-center lg:min-h-[calc(100dvh-90px)]">
            <div className="w-full max-w-[360px]">
              <h2 className="mb-10 text-center font-fredoka text-[32px] font-semibold text-[#1E293B]">
                {isRequestStep && 'Forgot Password'}
                {isVerifyStep && 'Verify Code'}
                {isResetStep && 'Set New Password'}
                {isDoneStep && 'Password Updated'}
              </h2>

              <form className="font-nunito" onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
                )}
                {!error && infoMessage && (
                  <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{infoMessage}</div>
                )}

                {isRequestStep && (
                  <div className="mb-5">
                    <label htmlFor="reset-email" className="mb-1.5 block text-[20px] font-semibold text-[#1E293B]">Email</label>
                    <input
                      type="email"
                      id="reset-email"
                      name="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="name@gmail.com"
                      disabled={isLoading}
                      autoFocus
                      className="h-[54px] w-full rounded-full border border-[#1E293B] bg-white px-6 text-[20px] text-[#1E293B] outline-none"
                    />
                  </div>
                )}

                {isVerifyStep && (
                  <div className="mb-5">
                    <label className="mb-2 block text-[20px] font-semibold text-[#1E293B]">Code</label>
                    <div className="flex justify-between gap-2" onPaste={handlePaste} role="group" aria-label="One-time password input">
                      {digits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { inputRefs.current[i] = el; }}
                          className="h-12 w-12 rounded-xl border border-[#1E293B] text-center text-xl"
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
                    <div className="mb-4">
                      <label htmlFor="new-password" className="mb-1.5 block text-[20px] font-semibold text-[#1E293B]">New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                        placeholder="••••••••"
                        disabled={isLoading}
                        autoComplete="new-password"
                        className="h-[54px] w-full rounded-full border border-[#1E293B] bg-white px-6 text-[20px] text-[#1E293B] outline-none"
                      />
                    </div>
                    <div className="mb-5">
                      <label htmlFor="confirm-password" className="mb-1.5 block text-[20px] font-semibold text-[#1E293B]">Confirm Password</label>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        placeholder="••••••••"
                        disabled={isLoading}
                        autoComplete="new-password"
                        className="h-[54px] w-full rounded-full border border-[#1E293B] bg-white px-6 text-[20px] text-[#1E293B] outline-none"
                      />
                    </div>
                  </>
                )}

                {isDoneStep ? (
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="h-[60px] w-full rounded-full border border-[#7C2D12] bg-[#FF721F] font-fredoka text-[28px] font-medium text-white shadow-[0_4px_0_0_#7C2D12]"
                  >
                    Back to Login
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || (isVerifyStep && digits.some((d) => !d))}
                    className="h-[60px] w-full rounded-full border border-[#7C2D12] bg-[#FF721F] font-fredoka text-[28px] font-medium text-white shadow-[0_4px_0_0_#7C2D12] disabled:opacity-70"
                  >
                    {isRequestStep && 'Send Code'}
                    {isVerifyStep && (isLoading ? 'Verifying...' : 'Verify Code')}
                    {isResetStep && (isLoading ? 'Resetting...' : 'Reset Password')}
                  </button>
                )}
              </form>

              {isVerifyStep && (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading || resendCooldown > 0}
                  className="mt-4 w-full text-center font-nunito text-base font-semibold text-[#1E293B] underline disabled:no-underline disabled:opacity-60"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              )}

              <p className="mt-7 text-center font-nunito text-[28px] text-[#1E293B]">
                Remember your password?{' '}
                <Link to={ROUTES.LOGIN} onClick={handleBackToLogin} className="font-extrabold underline">
                  Back to Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;
