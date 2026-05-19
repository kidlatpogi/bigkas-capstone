import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, motion as Motion, AnimatePresence } from 'framer-motion';
import { ROUTES } from '../../utils/constants';
import './ForgotPasswordPageMobile.css';

// Lazy load components for mobile
import PushButton from '../../components/common/PushButton';
import PasswordToggle from '../../components/common/PasswordToggle';

const INSIGHT_WORDS = [
  { text: 'Visual', size: '0.85rem', opacity: 0.6, top: '15%', left: '12%', delay: 0 },
  { text: 'Vocal', size: '0.8rem', opacity: 0.5, top: '22%', left: '80%', delay: 1 },
  { text: 'Verbal', size: '0.75rem', opacity: 0.4, top: '68%', left: '8%', delay: 0.5 },
  { text: 'Presence', size: '0.9rem', opacity: 0.7, top: '18%', left: '42%', delay: 1.2 },
];

function ForgotPasswordPageMobile({
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
  bigkasLogo,
  navigate
}) {
  const isRequestStep = step === 'request';
  const isVerifyStep = step === 'verify';
  const isResetStep = step === 'reset';
  const isDoneStep = step === 'done';

  return (
    <LazyMotion features={domAnimation}>
      <div className="auth-mobile-page">
        {/* Document Metadata (SEO) */}
        <title>Forgot Password | Bigkas</title>
        <meta name="description" content="Recover your Bigkas account password securely via mobile." />

        {/* 1. Background Visuals Layer */}
        <div className="auth-mobile-visual-bg">
          <div className="auth-mobile-header-accent" />

          <div className="auth-mobile-visual-content">
            <div className="auth-mobile-hero-text">
              <h2>Account <span>Recovery</span></h2>
              <p>Securely reset your credentials to get back in.</p>
            </div>
          </div>

          {/* Floating Insight Words in BG */}
          {INSIGHT_WORDS.map((word, i) => (
            <div
              key={i}
              className="insight-chip-bg"
              style={{
                top: word.top,
                left: word.left,
                fontSize: word.size,
                opacity: word.opacity,
                animationDelay: `${word.delay}s`
              }}
            >
              {word.text}
            </div>
          ))}
        </div>

        {/* 2. Upper Left Brand Logo */}
        <div className="auth-brand-logo-mobile">
          <img
            src={bigkasLogo}
            alt="Bigkas Logo"
            width="32"
            height="32"
            fetchPriority="high"
            loading="eager"
          />
          <span>Bigkas</span>
        </div>

        {/* 3. Main Form Content */}
        <div className="auth-mobile-form-container">
          <div className="auth-mobile-form-card">
            <div className="auth-form-header-mobile">
              <h1>{isDoneStep ? 'Success!' : 'Forgot Password'}</h1>
              <p>
                {isRequestStep && 'Enter your email to receive a reset code.'}
                {isVerifyStep && 'We sent a 6-digit code to your email.'}
                {isResetStep && 'Create a strong new password.'}
                {isDoneStep && 'Your password has been updated.'}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {(error || infoMessage) && !isDoneStep && (
                  <Motion.div
                    key={error ? 'err' : 'info'}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`auth-status-banner-mobile ${error ? 'is-error' : 'is-success'}`}
                  >
                    {error || infoMessage}
                  </Motion.div>
                )}
              </AnimatePresence>

              {isRequestStep && (
                <div className="form-group-mobile">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={isLoading}
                    autoFocus
                    aria-label="Email Address"
                  />
                </div>
              )}

              {isVerifyStep && (
                <div className="form-group-mobile">
                  <label>6-Digit Code</label>
                  <div className="otp-container-mobile">
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (inputRefs.current[i] = el)}
                        className="otp-box-mobile"
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(e, i)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className="resend-row-mobile">
                    {resendCooldown > 0 ? (
                      <span className="resend-timer-mobile">Resend in {resendCooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        className="resend-link-mobile"
                        onClick={handleRequestCode}
                        aria-label="Resend verification code"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isResetStep && (
                <>
                  <div className="form-group-mobile">
                    <label htmlFor="newPassword">New Password</label>
                    <div className="input-with-toggle-mobile">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        aria-label="New Password"
                      />
                      <PasswordToggle isVisible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                    </div>
                    {newPassword && (
                      <div className="pw-strength-mobile">
                        <div className="pw-strength-track-mobile">
                          <div className="pw-strength-fill-mobile" style={{ width: `${(passwordStrength / 4) * 100}%`, background: strengthColor }} />
                        </div>
                        <span className="pw-strength-label-mobile" style={{ color: strengthColor }}>{strengthLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-group-mobile">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="input-with-toggle-mobile">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        aria-label="Confirm Password"
                      />
                      <PasswordToggle isVisible={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
                    </div>
                  </div>
                </>
              )}

              {!isDoneStep && (
                <div className="mobile-action-btn">
                  <PushButton type="submit" disabled={isLoading} bgColor="#047857" shadowColor="#065f46">
                    {isLoading ? '...' : (
                      isRequestStep ? 'SEND CODE' : isVerifyStep ? 'VERIFY CODE' : 'RESET PASSWORD'
                    )}
                  </PushButton>
                </div>
              )}

              {isDoneStep && (
                <div className="mobile-action-btn">
                  <PushButton
                    type="button"
                    onClick={() => navigate(ROUTES.LOGIN, { state: { passwordResetEmail: email } })}
                    bgColor="#047857"
                    shadowColor="#065f46"
                  >
                    BACK TO LOGIN
                  </PushButton>
                </div>
              )}

              <div className="back-to-login-mobile">
                <Link to={ROUTES.LOGIN}>Return to Login</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}

export default ForgotPasswordPageMobile;
