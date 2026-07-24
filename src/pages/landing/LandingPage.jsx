import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoEye, IoMic, IoChatbubbleEllipses, IoArrowForward } from 'react-icons/io5';
import { ROUTES } from '../../utils/constants';
import { getAssetUrl, getSpriteUrl } from '../../utils/assetUtils';
import CardNav from '../../components/common/CardNav';
import ShapeGrid from '../../components/common/ShapeGrid';
import PushButton from '../../components/common/PushButton';
import ScrollReveal from '../../components/common/ScrollReveal';
import gradVideo from '../../assets/landing/Grad-Video.mp4';
import './LandingPage.css';

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');
const b01Mascot = getSpriteUrl('Robot/0001.webp');

export default function LandingPage({ managePageClass = true }) {
  const location = useLocation();
  const navigate = useNavigate();

  function navigateTo(path) {
    navigate(path);
  }

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

  const cardNavItems = [
    {
      label: 'Features',
      bgColor: '#0B3954',
      textColor: '#FFFFFF',
      links: [
        { label: 'How it Works', href: '#how-it-works', ariaLabel: 'How it Works Section' },
        { label: 'Feedback Lanes', href: '#features', ariaLabel: 'Feedback Lanes Section' },
        { label: 'Visual, Vocal & Verbal', href: '#features', ariaLabel: 'Visual, Vocal and Verbal Features' },
      ],
    },
    {
      label: 'Account',
      bgColor: '#F18F01',
      textColor: '#FFFFFF',
      links: [
        { label: 'Sign In', href: ROUTES.LOGIN, ariaLabel: 'Sign In', isRoute: true },
        { label: 'Create Account', href: ROUTES.REGISTER, ariaLabel: 'Create Free Account', isRoute: true },
      ],
    },
    {
      label: 'Get Started',
      bgColor: '#059669',
      textColor: '#FFFFFF',
      links: [
        { label: 'Start Free Practice', href: ROUTES.REGISTER, ariaLabel: 'Start Free Practice', isRoute: true },
        { label: 'Login to Dashboard', href: ROUTES.LOGIN, ariaLabel: 'Login to Dashboard', isRoute: true },
      ],
    },
  ];

  const handleCardNavLinkClick = (e, link) => {
    if (link.isRoute) {
      e.preventDefault();
      navigate(link.href);
    } else if (link.href && link.href.startsWith('#')) {
      e.preventDefault();
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
            {/* SVG Dotted Curved Lines with Arrow Markers */}
            <svg className="how-it-works-curved-svg" viewBox="0 0 1200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker
                  id="hiw-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#059669" />
                </marker>
              </defs>

              {/* Dramatic Curved Path from Step 1 to Step 2 */}
              <path
                d="M 350,60 C 400,160 420,160 460,60"
                stroke="#059669"
                strokeWidth="4"
                strokeDasharray="10 8"
                strokeLinecap="round"
                fill="none"
                markerEnd="url(#hiw-arrow)"
              />

              {/* Dramatic Curved Path from Step 2 to Step 3 */}
              <path
                d="M 740,60 C 780,-20 800,-20 840,60"
                stroke="#059669"
                strokeWidth="4"
                strokeDasharray="10 8"
                strokeLinecap="round"
                fill="none"
                markerEnd="url(#hiw-arrow)"
              />
            </svg>

            <div className="how-it-works-steps-grid">
              {/* Step 01 */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame hiw-preview-step1">
                  <div className="hiw-mock-modes-stack">
                    <div className="hiw-mode-pill active">
                      <span className="hiw-mode-dot" />
                      <span className="hiw-mode-name">Journey</span>
                      <span className="hiw-mode-check">✓</span>
                    </div>
                    <div className="hiw-mode-pill">
                      <span className="hiw-mode-name">Randomizer</span>
                    </div>
                    <div className="hiw-mode-pill">
                      <span className="hiw-mode-name">Free Speech</span>
                    </div>
                  </div>
                </div>

                <div className="hiw-step-details">
                  <span className="hiw-step-number hiw-num-navy">01</span>
                  <ScrollReveal as="h3" textClassName="hiw-step-title" baseRotation={0} baseOpacity={0.15} blurStrength={2}>
                    Pick a mode
                  </ScrollReveal>
                  <ScrollReveal as="p" textClassName="hiw-step-desc" baseRotation={0} baseOpacity={0.1} blurStrength={4}>
                    Open Journey, Randomizer, or Free Speech and choose the next prompt that fits your goal.
                  </ScrollReveal>
                </div>
              </div>

              {/* Step 02 */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame hiw-preview-step2">
                  <div className="hiw-mock-speech-box">
                    <div className="hiw-b01-nudge-badge">
                      <img src={bigkasLogo} alt="B-01" className="hiw-b01-avatar-img" />
                      <span className="hiw-b01-text">B-01 nearby</span>
                    </div>
                    <div className="hiw-waveform-anim">
                      <div className="hiw-wave-bar b1" />
                      <div className="hiw-wave-bar b2" />
                      <div className="hiw-wave-bar b3" />
                      <div className="hiw-wave-bar b4" />
                      <div className="hiw-wave-bar b5" />
                    </div>
                    <div className="hiw-rec-status">
                      <span className="hiw-rec-dot" />
                      <span>Short private attempt</span>
                    </div>
                  </div>
                </div>

                <div className="hiw-step-details">
                  <span className="hiw-step-number hiw-num-orange">02</span>
                  <ScrollReveal as="h3" textClassName="hiw-step-title" baseRotation={0} baseOpacity={0.15} blurStrength={2}>
                    Speak once
                  </ScrollReveal>
                  <ScrollReveal as="p" textClassName="hiw-step-desc" baseRotation={0} baseOpacity={0.1} blurStrength={4}>
                    Keep the task front and center while you make a short private attempt with B-01 nearby.
                  </ScrollReveal>
                </div>
              </div>

              {/* Step 03 */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame hiw-preview-step3">
                  <div className="hiw-mock-results-box">
                    <div className="hiw-done-badge">
                      <span className="hiw-done-check">✓</span>
                      <span className="hiw-done-label">DONE</span>
                    </div>
                    <div className="hiw-metrics-pills-row">
                      <span className="hiw-metric-pill score">Score: 92%</span>
                      <span className="hiw-metric-pill streak">🔥 5 Streak</span>
                    </div>
                  </div>
                </div>

                <div className="hiw-step-details">
                  <span className="hiw-step-number hiw-num-green">03</span>
                  <ScrollReveal as="h3" textClassName="hiw-step-title" baseRotation={0} baseOpacity={0.15} blurStrength={2}>
                    Move forward
                  </ScrollReveal>
                  <ScrollReveal as="p" textClassName="hiw-step-desc" baseRotation={0} baseOpacity={0.1} blurStrength={4}>
                    Your score, EXP, streak, and DONE state make the next retake or activity easy to see.
                  </ScrollReveal>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Lanes Section: 100vh Centered Header with 3 Columns 1 Row Grid */}
      <section className="features-grid-section" id="features">
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
                <div key={card.title} className="feature-grid-card" style={{ backgroundColor: card.bgColor }}>
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
                      <ScrollReveal as="h3" textClassName="feature-card-title" baseRotation={0} baseOpacity={0.15}>
                        {card.title}
                      </ScrollReveal>
                      <ScrollReveal as="p" textClassName="feature-card-text" baseRotation={0} baseOpacity={0.1}>
                        {card.text}
                      </ScrollReveal>
                      
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
    </div>
  );
}
