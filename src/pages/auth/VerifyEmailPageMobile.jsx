import { ROUTES } from '../../utils/constants';
import PushButton from '../../components/common/PushButton';
import './VerifyEmailPageMobile.css';

const INSIGHT_WORDS = [
  { text: 'Visual', size: '0.85rem', opacity: 0.6, top: '15%', left: '12%', delay: 0 },
  { text: 'Vocal', size: '0.8rem', opacity: 0.5, top: '22%', left: '80%', delay: 1 },
  { text: 'Verbal', size: '0.75rem', opacity: 0.4, top: '68%', left: '8%', delay: 0.5 },
  { text: 'Presence', size: '0.9rem', opacity: 0.7, top: '18%', left: '42%', delay: 1.2 },
];

function VerifyEmailPageMobile({
  maskedEmail,
  digits,
  inputRefs,
  isVerifying,
  isResending,
  error,
  resendMessage,
  resendCooldown,
  handleChange,
  handleKeyDown,
  handleVerify,
  handleResend,
  bigkasLogo,
  navigate
}) {
  return (
    <div className="auth-mobile-page">
      {/* Document Metadata (SEO) */}
      <title>Verify Email | Bigkas</title>
      <meta name="description" content="Verify your email address to activate your Bigkas account." />

        {/* 1. Background Visuals Layer */}
        <div className="auth-mobile-visual-bg">
          <div className="auth-mobile-header-accent" />
          
        <div className="auth-mobile-visual-content">
          <div className="auth-mobile-hero-text fade-in-up">
            <h2>Master <span>Public Speaking</span></h2>
            <p>Verify your account to join our global community.</p>
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

        <div className="auth-brand-logo-mobile">
          <div className="auth-logo-icon-mobile" aria-label="Bigkas Logo" />
          <span>Bigkas</span>
        </div>

        {/* 3. Main Form Content */}
        <div className="auth-mobile-form-container">
          <div className="auth-mobile-form-card">
            <div className="auth-form-header-mobile">
              <h1>Verify Your Email</h1>
              <p>We sent a code to <span className="verify-email-accent-mobile">{maskedEmail}</span></p>
            </div>

          <div className="auth-form">
            {(error || resendMessage) && (
              <div 
                className={`auth-status-banner-mobile ${error ? 'is-error' : 'is-success'} fade-in`}
              >
                {error || resendMessage}
              </div>
            )}

              <div className="form-group-mobile">
                <label>6-Digit Code</label>
                <div className="otp-container-mobile">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      className={`otp-box-mobile ${error ? 'is-invalid' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(e, i)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      disabled={isVerifying}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="mobile-action-btn">
                <PushButton
                  onClick={handleVerify}
                  disabled={isVerifying || !digits.every(Boolean)}
                  bgColor="#047857"
                  shadowColor="#065f46"
                >
                  {isVerifying ? '...' : 'VERIFY ACCOUNT'}
                </PushButton>
              </div>

              <div className="mobile-divider">
                <span>OR</span>
              </div>

              <div className="verify-resend-mobile">
                <p>Didn't receive a code?</p>
                <button 
                  type="button" 
                  className="resend-link-mobile" 
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <div className="back-to-signup-mobile">
                <button type="button" onClick={() => navigate(ROUTES.REGISTER)}>
                  Wrong email? Go back
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

export default VerifyEmailPageMobile;
