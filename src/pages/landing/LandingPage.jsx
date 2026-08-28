import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoEye, IoMic, IoChatbubbleEllipses, IoArrowForward, IoLogoAndroid } from 'react-icons/io5';
import { ROUTES } from '../../utils/constants';
import { getAssetUrl, getSpriteUrl } from '../../utils/assetUtils';
import CardNav from '../../components/common/CardNav';
import ShapeGrid from '../../components/common/ShapeGrid';
import PushButton from '../../components/common/PushButton';
import ScrollReveal from '../../components/common/ScrollReveal';
import ParallaxTextSection from '../../components/common/ParallaxTextSection';
import LegalModal from '../../components/Legal/LegalModal';
import { TERMS_AND_CONDITIONS } from '../../constants/legal/terms';
import { PRIVACY_POLICY } from '../../constants/legal/privacy';
import gradVideo from '../../assets/landing/Grad-Video.mp4';
import './LandingPage.css';

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');
const b01Mascot = getSpriteUrl('Robot/0001.webp');
const crystalBallImage = getSpriteUrl('common/crystal-ball.webp');
const crownImage = getSpriteUrl('common/crown.webp');

export default function LandingPage({ managePageClass = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const featuresSectionRef = useRef(null);
  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '', content: '' });

  function navigateTo(path) {
    navigate(path);
  }

  const showTerms = (e) => {
    if (e?.preventDefault) e.preventDefault();
    setLegalModal({ isOpen: true, title: 'Terms & Conditions', content: TERMS_AND_CONDITIONS });
  };

  const showPrivacy = (e) => {
    if (e?.preventDefault) e.preventDefault();
    setLegalModal({ isOpen: true, title: 'Privacy Policy', content: PRIVACY_POLICY });
  };

  const closeLegal = () => setLegalModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (managePageClass) {
      document.documentElement.classList.add('landing-page-active');
      document.body.classList.add('landing-page-active');
    }

    return () => {
      if (managePageClass) {
        document.documentElement.classList.remove('landing-page-active');
        document.body.classList.remove('landing-page-active');
      }
    };
  }, [managePageClass]);

  useEffect(() => {
    const isHomeRoute = location.pathname === ROUTES.HOME;
    if (!isHomeRoute) return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [location]);

  {/* Pause video when scrolled past hero section or on unmount */}
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(videoEl);

    return () => {
      observer.disconnect();
      if (videoEl) {
        videoEl.pause();
      }
    };
  }, []);

  const cardNavItems = [
    {
      label: 'Explore',
      bgColor: '#059669', // Green
      textColor: '#FFFFFF',
      links: [
        { label: 'How it Works', href: '#how-it-works', ariaLabel: 'How it Works Section' },
        { label: 'Practice Lanes', href: '#features', ariaLabel: 'Practice Lanes Section' },
      ],
    },
    {
      label: 'Account',
      bgColor: '#F18F01', // Orange
      textColor: '#FFFFFF',
      links: [
        { label: 'Login', href: ROUTES.LOGIN, ariaLabel: 'Login to Account', isRoute: true },
        { label: 'Create Account', href: ROUTES.REGISTER, ariaLabel: 'Create Free Account', isRoute: true },
      ],
    },
    {
      label: 'Legal',
      bgColor: '#0B3954', // Navy
      textColor: '#FFFFFF',
      links: [
        { label: 'Terms & Conditions', href: '#terms', ariaLabel: 'Terms & Conditions', isLegal: 'terms' },
        { label: 'Privacy Policy', href: '#privacy', ariaLabel: 'Privacy Policy', isLegal: 'privacy' },
      ],
    },
  ];

  const handleCardNavLinkClick = (e, link) => {
    if (link.isLegal === 'terms') {
      if (e?.preventDefault) e.preventDefault();
      showTerms(e);
    } else if (link.isLegal === 'privacy') {
      if (e?.preventDefault) e.preventDefault();
      showPrivacy(e);
    } else if (link.isRoute) {
      if (e?.preventDefault) e.preventDefault();
      navigate(link.href);
    } else if (link.href && link.href.startsWith('#')) {
      if (e?.preventDefault) e.preventDefault();
      const el = document.querySelector(link.href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const featureCards = [
    {
      icon: IoEye,
      bgColor: '#0B3954', // Matches CardNav Navy
      tag: 'VISUAL LANE',
      title: 'Look steady & intentional',
      text: 'Read posture, eye contact, and facial tension in real time so your delivery feels confident instead of frozen on stage.',
      step: '01 / 03',
      badges: ['Computer Vision', 'Face Mesh', 'Real-time Feed'],
      actionText: 'Try Camera Test',
      actionRoute: ROUTES.REGISTER,
      previewType: 'camera',
    },
    {
      icon: IoMic,
      bgColor: '#F18F01', // Matches CardNav Orange
      tag: 'VOCAL LANE',
      title: 'Sound clear & resonant',
      text: 'Track volume stability, pitch modulation, and speech shakiness so your voice becomes easier to control with every run-through.',
      step: '02 / 03',
      badges: ['Acoustic Biomarker', 'Pitch Tracker', 'Volume Stability'],
      actionText: 'Try Mic Test',
      actionRoute: ROUTES.REGISTER,
      previewType: 'audio',
    },
    {
      icon: IoChatbubbleEllipses,
      bgColor: '#059669', // Matches CardNav Green
      tag: 'VERBAL LANE',
      title: 'Speak naturally & smoothly',
      text: 'Review pronunciation cues and pacing feedback that help listeners follow your speech message without extra effort.',
      step: '03 / 03',
      badges: ['NLP Speech Analysis', 'Pacing Monitor', 'Pronunciation cues'],
      actionText: 'Start Free Practice',
      actionRoute: ROUTES.REGISTER,
      previewType: 'text',
    },
  ];

  return (
    <div className="landing-clean-wrapper">
      <ShapeGrid 
        squareSize={43} 
        borderColor="rgba(0, 0, 0, 0.08)" 
        hoverFillColor="rgba(5, 150, 105, 0.14)" 
        shape="square" 
        hoverTrailAmount={4} 
        className="landing-shapegrid-bg" 
      />

      <CardNav
        logo={bigkasLogo}
        logoAlt="TalkTics"
        items={cardNavItems}
        baseColor="#ffffff"
        menuColor="#0B3954"
        buttonBgColor="#059669"
        buttonTextColor="#ffffff"
        onCtaClick={() => navigateTo(ROUTES.REGISTER)}
        onLoginClick={() => navigateTo(ROUTES.LOGIN)}
        onLogoClick={() => navigateTo(ROUTES.HOME)}
        onLinkClick={handleCardNavLinkClick}
      />

      {/* 100vh Video Hero Section */}
      <section className="hero-video-section">
        <div className="video-background-wrapper">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="hero-video-media"
          >
            <source src={gradVideo} type="video/mp4" />
          </video>
          <div className="hero-video-overlay" />
          <div className="hero-video-bottom-blur" />
        </div>

        <div className="hero-video-content">
          <h1 className="hero-video-title">
            Master the Stage, <span className="title-highlight">Minus the Stage Fright</span>
          </h1>
          <p className="hero-video-subtitle">
            TalkTics provides a private, judgment-free space for Filipino learners to practice speaking through acoustic biomarkers and computer vision.
          </p>
          <div className="hero-video-actions">
            <PushButton
              bgColor="#059669"
              shadowColor="#047857"
              className="hero-btn-custom"
              onClick={() => navigateTo(ROUTES.REGISTER)}
            >
              Start Practicing - It&apos;s Free
            </PushButton>
            <PushButton
              bgColor="#f18f01"
              shadowColor="#d97706"
              className="hero-btn-custom"
              onClick={() => navigateTo(ROUTES.LOGIN)}
            >
              Login to Account
            </PushButton>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="how-it-works-section-container">
          {/* Centered Header with Title Design matching Practice Lanes */}
          <div className="features-centered-header">
            <ScrollReveal as="span" textClassName="features-tag" baseRotation={0} baseOpacity={0.2} blurStrength={0}>
              HOW IT WORKS
            </ScrollReveal>
            <ScrollReveal as="h2" containerClassName="features-title-group" textClassName="features-title-main" baseRotation={2} baseOpacity={0.1} blurStrength={4}>
              Practice moves like a path.
            </ScrollReveal>
            <ScrollReveal as="p" textClassName="features-description" baseRotation={0} baseOpacity={0.1} blurStrength={6}>
              Start with one small practice run, get a clear nudge from B-01, then continue to the next step without guessing what changed.
            </ScrollReveal>
          </div>

          {/* 3 Steps Container */}
          <div className="how-it-works-steps-wrapper">
            <div className="how-it-works-steps-grid">
              {/* Step 01 - Home Page Practice Widget Design */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame hiw-preview-step1">
                  <div className="hiw-home-practice-widget">
                    <div className="hiw-home-practice-head">
                      <span className="hiw-home-practice-kicker">JOURNEY 1</span>
                      <span className="hiw-home-practice-sub">0 / 30 Stages Completed</span>
                    </div>
                    <div className="hiw-home-practice-group">
                      <div className="hiw-home-btn-row hiw-home-btn-row--rand">
                        <div className="hiw-home-btn-visual hiw-visual-rand">
                          <img src={crystalBallImage} alt="Randomizer" className="hiw-home-btn-img" />
                        </div>
                        <div className="hiw-home-btn-meta">
                          <p className="hiw-home-btn-label">Randomizer</p>
                          <p className="hiw-home-btn-hint">Instant prompt to warm up your delivery.</p>
                        </div>
                      </div>
                      <div className="hiw-home-btn-row hiw-home-btn-row--speech">
                        <div className="hiw-home-btn-visual hiw-visual-speech">
                          <img src={crownImage} alt="Free Speech" className="hiw-home-btn-img" />
                        </div>
                        <div className="hiw-home-btn-meta">
                          <p className="hiw-home-btn-label">Free Speech</p>
                          <p className="hiw-home-btn-hint">Open topic mode for confidence building.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hiw-step-details">
                  <span className="hiw-step-number hiw-num-navy">01</span>
                  <ScrollReveal as="h3" textClassName="hiw-step-title" baseRotation={0} baseOpacity={0.2} blurStrength={2}>
                    Pick a mode
                  </ScrollReveal>
                  <ScrollReveal as="p" textClassName="hiw-step-desc" baseRotation={0} baseOpacity={0.2} blurStrength={2}>
                    Open Journey, Randomizer, or Free Speech and choose the next prompt that fits your goal.
                  </ScrollReveal>
                </div>
              </div>

              {/* Step 02 - Home Page Session Recording UI Design */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame hiw-preview-step2">
                  <div className="hiw-home-session-widget">
                    <div className="hiw-session-topic-pill">
                      <span className="hiw-topic-label">Topic:</span> My Favorite Study Spot in Dasma.
                    </div>

                    <div className="hiw-session-video-box">
                      <div className="hiw-camera-guide-corner top-left" />
                      <div className="hiw-camera-guide-corner top-right" />
                      <div className="hiw-camera-guide-corner bottom-left" />
                      <div className="hiw-camera-guide-corner bottom-right" />
                      <div className="hiw-camera-center-banner">
                        CENTER YOURSELF — ENSURE HANDS ARE VISIBLE
                      </div>
                    </div>

                    <div className="hiw-session-soundwave">
                      <div className="hiw-sound-bar b1" />
                      <div className="hiw-sound-bar b2" />
                      <div className="hiw-sound-bar b3" />
                      <div className="hiw-sound-bar b4" />
                      <div className="hiw-sound-bar b5" />
                      <div className="hiw-sound-bar b6" />
                      <div className="hiw-sound-bar b7" />
                      <div className="hiw-sound-bar b8" />
                      <div className="hiw-sound-bar b9" />
                      <div className="hiw-sound-bar b10" />
                      <div className="hiw-sound-bar b11" />
                      <div className="hiw-sound-bar b12" />
                      <div className="hiw-sound-bar b13" />
                      <div className="hiw-sound-bar b14" />
                      <div className="hiw-sound-bar b15" />
                    </div>

                    <div className="hiw-session-controls">
                      <button type="button" className="hiw-ctrl-btn secondary">Pause</button>
                      <button type="button" className="hiw-ctrl-btn primary">Start</button>
                      <button type="button" className="hiw-ctrl-btn secondary">Restart</button>
                    </div>
                  </div>
                </div>

                <div className="hiw-step-details">
                  <span className="hiw-step-number hiw-num-orange">02</span>
                  <ScrollReveal as="h3" textClassName="hiw-step-title" baseRotation={0} baseOpacity={0.2} blurStrength={2}>
                    Speak once
                  </ScrollReveal>
                  <ScrollReveal as="p" textClassName="hiw-step-desc" baseRotation={0} baseOpacity={0.2} blurStrength={2}>
                    Keep the task front and center while you make a short private attempt with B-01 nearby.
                  </ScrollReveal>
                </div>
              </div>

              {/* Step 03 - Results Box Design */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame hiw-preview-step3">
                  <div className="hiw-home-results-widget">
                    <div className="hiw-results-head">
                      <span className="hiw-results-kicker">OVERALL SCORE</span>
                      <span className="hiw-results-badge">PERFORMANCE</span>
                    </div>

                    <div className="hiw-results-score-row">
                      <span className="hiw-results-big-score">92%</span>
                      <span className="hiw-results-score-label">Confidence</span>
                    </div>

                    <div className="hiw-metrics-pills-row">
                      <span className="hiw-metric-pill done">✓ DONE</span>
                      <span className="hiw-metric-pill streak">🔥 5 Streak</span>
                      <span className="hiw-metric-pill verbal">Verbal: Strong</span>
                    </div>
                  </div>
                </div>

                <div className="hiw-step-details">
                  <span className="hiw-step-number hiw-num-green">03</span>
                  <ScrollReveal as="h3" textClassName="hiw-step-title" baseRotation={0} baseOpacity={0.2} blurStrength={2}>
                    Move forward
                  </ScrollReveal>
                  <ScrollReveal as="p" textClassName="hiw-step-desc" baseRotation={0} baseOpacity={0.2} blurStrength={2}>
                    Your score, EXP, streak, and DONE state make the next retake or activity easy to see.
                  </ScrollReveal>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ParallaxTextSection />

      {/* Practice Lanes Section: 100vh Centered Header with 3 Columns 1 Row Grid */}
      <section className="features-grid-section" id="features" ref={featuresSectionRef}>
        <div className="features-section-container">
          {/* Centered Header with 3-Font Title Design */}
          <div className="features-centered-header">
            <ScrollReveal as="span" textClassName="features-tag" baseRotation={0} baseOpacity={0.2} blurStrength={0}>
              FEEDBACK LANES
            </ScrollReveal>
            <ScrollReveal as="h2" containerClassName="features-title-group" textClassName="features-title-main" baseRotation={2} baseOpacity={0.1} blurStrength={4}>
              Practice Lanes
            </ScrollReveal>
            <ScrollReveal as="p" textClassName="features-description" baseRotation={0} baseOpacity={0.1} blurStrength={6}>
              TalkTics keeps feedback focused, readable, and easy to act on after each private practice session using acoustic biomarkers and computer vision.
            </ScrollReveal>
          </div>

          {/* 3 Columns 1 Row Grid */}
          <div className="features-cards-3col-grid">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="feature-grid-card"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <div className="scroll-stack-card-overlay" />
                  
                  <div className="feature-stack-card-content">
                    <div className="feature-card-header">
                      <span className="feature-card-tag">{card.tag}</span>
                      <div className="feature-card-header-right">
                        <span className="feature-card-step">{card.step}</span>
                        <div className="feature-card-icon">
                          <Icon color="#ffffff" size={20} />
                        </div>
                      </div>
                    </div>

                    <div className="feature-card-info-col">
                      <h3 className="feature-card-title">
                        {card.title}
                      </h3>
                      <p className="feature-card-text">
                        {card.text}
                      </p>
                      
                      <div className="feature-card-badges-row">
                        {card.badges.map((badge) => (
                          <span key={badge} className="feature-card-pill">
                            {badge}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => navigate(card.actionRoute)}
                        className="feature-card-action-btn"
                      >
                        {card.actionText}
                        <IoArrowForward size={16} />
                      </button>
                    </div>

                    <div className="feature-card-preview-col">
                      {card.previewType === 'camera' && (
                        <div className="preview-mockup-frame camera-mock">
                          <div className="camera-box-outline">
                            <div className="camera-scan-glow" />
                            <div className="face-grid-simulation">
                              <div className="node n1" />
                              <div className="node n2" />
                              <div className="node n3" />
                              <div className="node n4" />
                              <div className="line l1" />
                              <div className="line l2" />
                            </div>
                          </div>
                        </div>
                      )}

                      {card.previewType === 'audio' && (
                        <div className="preview-mockup-frame audio-mock">
                          <div className="audio-wave-simulation">
                            <div className="bar b1" />
                            <div className="bar b2" />
                            <div className="bar b3" />
                            <div className="bar b4" />
                            <div className="bar b5" />
                            <div className="bar b6" />
                            <div className="bar b7" />
                          </div>
                        </div>
                      )}

                      {card.previewType === 'text' && (
                        <div className="preview-mockup-frame text-mock">
                          <div className="text-bubble-simulation">
                            <div className="text-line t1" />
                            <div className="text-line t2" />
                            <div className="text-line t3" />
                            <div className="text-bubble-glow" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Combined Footer + CTA Section matching zeusbautista.site design */}
      <footer className="footer-cta-section" id="download">
        <div className="footer-cta-container">
          <div className="footer-cta-grid">
            {/* Left Column: CTA Content */}
            <div className="footer-cta-left">
              <span className="footer-cta-tag">GET STARTED</span>
              <h2 className="footer-cta-heading">
                <span className="footer-heading-light">START WITH</span>
                <br />
                <span className="footer-heading-dark">ONE BRAVE TAKE.</span>
              </h2>
              <p className="footer-cta-desc">
                No audience. No pressure. Just a private speaking round, clear feedback, and B-01 keeping the next move easy to see.
              </p>

              <div className="footer-cta-actions">
                <PushButton
                  bgColor="#0B3954"
                  shadowColor="#062436"
                  className="footer-btn-custom"
                  onClick={() => navigateTo(ROUTES.REGISTER)}
                >
                  Start Practicing - It&apos;s Free
                </PushButton>

                <PushButton
                  bgColor="#F18F01"
                  shadowColor="#c2410c"
                  className="footer-btn-custom"
                  onClick={() => window.open('/downloads/TalkTics.apk', '_blank')}
                >
                  <IoLogoAndroid size={20} />
                  Download for Android
                </PushButton>
              </div>
            </div>

            {/* Right Column: Navigation & Connections */}
            <div className="footer-cta-right">
              <span className="footer-cta-tag">NAVIGATION</span>
              <ul className="footer-links-list">
                <li>
                  <a href="#how-it-works" onClick={(e) => handleCardNavLinkClick(e, { href: '#how-it-works' })}>
                    How it Works
                  </a>
                </li>
                <li>
                  <a href="#features" onClick={(e) => handleCardNavLinkClick(e, { href: '#features' })}>
                    Practice Lanes
                  </a>
                </li>
                <li>
                  <a href={ROUTES.LOGIN} onClick={(e) => handleCardNavLinkClick(e, { href: ROUTES.LOGIN, isRoute: true })}>
                    Login
                  </a>
                </li>
                <li>
                  <a href={ROUTES.REGISTER} onClick={(e) => handleCardNavLinkClick(e, { href: ROUTES.REGISTER, isRoute: true })}>
                    Create Account
                  </a>
                </li>
                <li>
                  <button type="button" className="footer-link-btn" onClick={showTerms}>
                    Terms &amp; Conditions
                  </button>
                </li>
                <li>
                  <button type="button" className="footer-link-btn" onClick={showPrivacy}>
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Faint Background Watermark Text */}
          <div className="footer-watermark-text" aria-hidden="true">
            TALKTICS
          </div>

          {/* Bottom Bar: Copyright & Contact */}
          <div className="footer-bottom-bar">
            <span className="footer-copyright">© 2026 TALKTICS. ALL RIGHTS RESERVED.</span>
            <div className="footer-legal-bottom-links">
              <button type="button" className="footer-legal-bar-btn" onClick={showTerms}>
                Terms &amp; Conditions
              </button>
              <span className="footer-legal-bar-dot" aria-hidden="true">•</span>
              <button type="button" className="footer-legal-bar-btn" onClick={showPrivacy}>
                Privacy Policy
              </button>
            </div>
            <a href="mailto:support@talktics.site" className="footer-contact-email">support@talktics.site</a>
          </div>
        </div>
      </footer>

      {/* Terms & Conditions / Privacy Policy Modal */}
      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={closeLegal}
        title={legalModal.title}
        content={legalModal.content}
      />
    </div>
  );
}
