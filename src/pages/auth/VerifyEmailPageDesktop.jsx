import { m, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';
import PushButton from '../../components/common/PushButton';

function VerifyEmailPageDesktop(props) {
  const { 
    maskedEmail, digits, inputRefs, isVerifying, error, resendMessage,
    resendCooldown, handleChange, handleKeyDown, handleVerify, handleResend,
    handleWrongEmail, bigkasLogo, robotImgUrl
  } = props;

  const insightWords = [
    { text: 'Visual', size: '1rem', opacity: 0.8, top: '15%', left: '12%', delay: 0 },
    { text: 'Vocal', size: '0.95rem', opacity: 0.7, top: '22%', left: '80%', delay: 1 },
    { text: 'Verbal', size: '0.9rem', opacity: 0.6, top: '68%', left: '8%', delay: 0.5 },
    { text: 'Confidence', size: '1.15rem', opacity: 0.95, top: '50%', left: '10%', delay: 0 },
    { text: 'Presence', size: '1.1rem', opacity: 0.85, top: '18%', left: '42%', delay: 1.2 },
  ];

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="auth-page-v2">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-visual-side">
              <div className="auth-brand-logo">
                <img src={bigkasLogo} alt="Bigkas" className="auth-logo-img" fetchpriority="high" />
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
                <h2 className="auth-hero-tagline">Master <span>Public Speaking</span></h2>
                <p className="auth-hero-desc">Your AI-powered journey to public speaking excellence starts here.</p>
              </div>
            </div>

            <div className="auth-form-side">
              <div className="auth-form-inner">
                <m.h3 variants={itemVariants} className="auth-form-headline">Verify Your Email</m.h3>
                <m.p variants={itemVariants} className="auth-form-subline">
                  We sent a code to <span className="verify-email-accent">{maskedEmail}</span>. Enter it below to activate your account.
                </m.p>

                <div className="auth-form">
                  <AnimatePresence mode="wait">
                    {(error || resendMessage) && (
                      <m.div 
                        key={error ? 'err' : 'info'}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`auth-status-banner ${error ? 'is-error' : 'is-success'}`}
                      >
                        {error || resendMessage}
                      </m.div>
                    )}
                  </AnimatePresence>

                  <m.div variants={itemVariants} className="otp-inputs-v2">
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
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </m.div>

                  <m.div variants={itemVariants} className="form-actions-v2">
                    <PushButton
                      className="verify-submit-btn"
                      onClick={handleVerify}
                      disabled={isVerifying || !digits.every(Boolean)}
                      bgColor="#059669"
                      shadowColor="#047857"
                    >
                      {isVerifying ? '...' : 'Verify Account'}
                    </PushButton>
                  </m.div>

                  <m.div variants={itemVariants} className="verify-footer-v2">
                    <p>Didn&apos;t receive a code?</p>
                    <button className="resend-btn-v2" onClick={handleResend} disabled={resendCooldown > 0}>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </m.div>

                  <m.div variants={itemVariants} className="signup-prompt-v2">
                    <button className="back-btn-v2" onClick={handleWrongEmail}>
                      Wrong email? Go back
                    </button>
                  </m.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}

export default VerifyEmailPageDesktop;
