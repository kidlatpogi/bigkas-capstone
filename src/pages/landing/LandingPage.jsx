import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  IoEye, 
  IoMic, 
  IoChatbubbleEllipses, 
  IoArrowForward, 
  IoLogoAndroid,
  IoGlobeOutline,
  IoChevronDownOutline
} from 'react-icons/io5';
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
const crystalBallImage = getSpriteUrl('common/crystal-ball.webp');
const crownImage = getSpriteUrl('common/crown.webp');

export default function LandingPage({ managePageClass = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '', content: '' });
  const [activeFaq, setActiveFaq] = useState(null);

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

  const toggleFaq = (index) => {
    setActiveFaq((prev) => (prev === index ? null : index));
  };

  // Enable scroll on body/root when landing page is active
  useEffect(() => {
    if (!managePageClass) return;
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');

    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, [managePageClass]);

  // Handle hash scrolling on initial load / location change
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);

  // Pause video when scrolled past hero section to save battery & GPU
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
        { label: 'Platforms', href: '#platforms', ariaLabel: 'Platforms Section' },
        { label: 'FAQ', href: '#faq', ariaLabel: 'FAQ Section' },
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
      bgColor: '#0B3954',
      tag: 'VISUAL LANE',
      title: 'Look steady & intentional',
      text: 'Read posture, eye contact, and facial tension in real time so your delivery feels confident instead of frozen on stage.',
      step: '01 / 03',
      badges: ['MediaPipe Vision', '468 Face Mesh', 'Gaze Tracking'],
      actionText: 'Try Camera Test',
      actionRoute: ROUTES.REGISTER,
      previewType: 'camera',
    },
    {
      icon: IoMic,
      bgColor: '#F18F01',
      tag: 'VOCAL LANE',
      title: 'Sound clear & resonant',
      text: 'Track volume stability, pitch modulation, and speech shakiness so your voice becomes easier to control with every run-through.',
      step: '02 / 03',
      badges: ['Librosa Biomarkers', 'F0 Pitch Tracker', 'Tremor/Jitter DSP'],
      actionText: 'Try Mic Test',
      actionRoute: ROUTES.REGISTER,
      previewType: 'audio',
    },
    {
      icon: IoChatbubbleEllipses,
      bgColor: '#059669',
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

  const faqItems = [
    {
      q: 'Does TalkTics record or store my webcam and microphone feeds?',
      a: 'No. All computer vision (Google MediaPipe) and acoustic analysis run locally directly on your device. Only calculated numerical scores (such as overall confidence percentage, streak, and EXP) are synced to your account—your raw camera and voice recordings never leave your device.',
    },
    {
      q: 'How does TalkTics measure nervousness and stage fright?',
      a: 'TalkTics combines acoustic biomarkers with visual cues: Librosa and Web Audio algorithms measure vocal jitter (micro-tremors in pitch) and speech-to-pause ratios, while MediaPipe measures eye gaze stability, head orientation, and facial tension.',
    },
    {
      q: 'Can I practice on my Android phone or tablet?',
      a: 'Yes! You can use TalkTics directly in modern mobile browsers or download the standalone Android APK from the Platforms section for an optimized, low-latency mobile experience.',
    },
    {
      q: 'Is TalkTics suitable for thesis defense and job interview preparation?',
      a: 'TalkTics includes targeted prompt modes like Randomizer and Free Speech designed specifically for extemporaneous thinking, interview practice, and academic presentation defense.',
    },
    {
      q: 'Do I need special hardware or external microphones to use TalkTics?',
      a: 'No. Any standard built-in laptop or smartphone webcam and microphone work seamlessly. TalkTics automatically calibrates input levels for reliable feedback.',
    },
  ];

  return (
    <div className="landing-clean-wrapper">
      <ShapeGrid 
        squareSize={43} 
        borderColor="rgba(0, 0, 0, 0.06)" 
        hoverFillColor="rgba(5, 150, 105, 0.12)" 
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
        </div>

        <div className="hero-video-content">
          <h1 className="hero-video-title">
            Master the Stage,
            <span className="title-highlight">Minus the Stage Fright</span>
          </h1>

          <p className="hero-video-subtitle">
            TalkTics gives Filipino learners a private, judgment-free space to practice speaking with real-time feedback on gaze, pitch, and posture.
          </p>

          <div className="hero-video-actions">
            <PushButton
              bgColor="#059669"
              shadowColor="#047857"
              className="hero-btn-custom"
              onClick={() => navigateTo(ROUTES.REGISTER)}
            >
              Start Practicing - It's Free
            </PushButton>

            <PushButton
              bgColor="#F18F01"
              shadowColor="#c2410c"
              className="hero-btn-custom"
              onClick={() => navigateTo(ROUTES.LOGIN)}
            >
              Login to Account
            </PushButton>
          </div>
        </div>

        {/* Hero Scroll Indicator */}
        <a 
          href="#how-it-works" 
          className="hero-scroll-indicator"
          onClick={(e) => handleCardNavLinkClick(e, { href: '#how-it-works' })}
          aria-label="Scroll to How It Works"
        >
          <span className="hero-scroll-text">SCROLL</span>
          <div className="hero-scroll-mouse">
            <div className="hero-scroll-wheel" />
          </div>
        </a>
      </section>

      {/* How it Works Section (100vh) */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="how-it-works-section-container">
          <div className="features-centered-header">
            <ScrollReveal as="span" textClassName="features-tag" baseRotation={0} baseOpacity={0.6} blurStrength={0}>
              HOW IT WORKS
            </ScrollReveal>
            <ScrollReveal as="h2" containerClassName="features-title-group" textClassName="features-title-main" baseRotation={2} baseOpacity={0.6} blurStrength={2}>
              Practice moves like a path.
            </ScrollReveal>
            <ScrollReveal as="p" textClassName="features-description" baseRotation={0} baseOpacity={0.6} blurStrength={2}>
              From quick prompts to deep acoustic breakdowns, every stage gives you concrete cues you can apply in seconds.
            </ScrollReveal>
          </div>

          <div className="how-it-works-steps-wrapper">
            <div className="how-it-works-steps-grid">
              {/* Step 1: Pick a Mode */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame">
                  <div className="hiw-home-practice-widget">
                    <div className="hiw-home-practice-head">
                      <span className="hiw-home-practice-kicker">PRACTICE MODES</span>
                      <span className="hiw-home-practice-sub">Choose your training pace</span>
                    </div>
                    <div className="hiw-home-practice-group">
                      <div className="hiw-home-btn-row">
                        <div className="hiw-home-btn-visual hiw-visual-rand">
                          <img src={crystalBallImage} alt="Randomizer" className="hiw-home-btn-img" />
                        </div>
                        <div className="hiw-home-btn-meta">
                          <span className="hiw-home-btn-label">Randomizer</span>
                          <span className="hiw-home-btn-hint">Surprise topic prompts</span>
                        </div>
                      </div>
                      <div className="hiw-home-btn-row">
                        <div className="hiw-home-btn-visual hiw-visual-speech">
                          <img src={crownImage} alt="Free Speech" className="hiw-home-btn-img" />
                        </div>
                        <div className="hiw-home-btn-meta">
                          <span className="hiw-home-btn-label">Free Speech</span>
                          <span className="hiw-home-btn-hint">Custom delivery practice</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hiw-step-details">
                  <span className="hiw-step-number">01</span>
                  <h3 className="hiw-step-title">Choose your stage</h3>
                  <p className="hiw-step-desc">Pick random speech prompts or open delivery to warm up your flow.</p>
                </div>
              </div>

              {/* Step 2: Speak Naturally */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame">
                  <div className="hiw-home-session-widget">
                    <div className="hiw-session-topic-pill">
                      <span className="hiw-topic-label">Prompt:</span> Describe your favorite book
                    </div>
                    <div className="hiw-session-video-box">
                      <div className="hiw-camera-guide-corner top-left" />
                      <div className="hiw-camera-guide-corner top-right" />
                      <div className="hiw-camera-guide-corner bottom-left" />
                      <div className="hiw-camera-guide-corner bottom-right" />
                      <span className="hiw-camera-center-banner">CENTER YOURSELF</span>
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
                      <button type="button" className="hiw-ctrl-btn primary">Stop</button>
                      <button type="button" className="hiw-ctrl-btn secondary">Restart</button>
                    </div>
                  </div>
                </div>
                <div className="hiw-step-details">
                  <span className="hiw-step-number">02</span>
                  <h3 className="hiw-step-title">Speak &amp; get live signals</h3>
                  <p className="hiw-step-desc">MediaPipe tracks eye contact and facial tension while audio DSP monitors pitch stability.</p>
                </div>
              </div>

              {/* Step 3: Get Insights */}
              <div className="how-it-works-step-card">
                <div className="hiw-preview-frame">
                  <div className="hiw-home-results-widget">
                    <div className="hiw-results-head">
                      <span className="hiw-results-kicker">SESSION SCORE</span>
                      <span className="hiw-results-badge">STAGE 10 PASSED</span>
                    </div>
                    <div className="hiw-results-score-row">
                      <span className="hiw-results-big-score">92%</span>
                      <span className="hiw-results-score-label">Overall Confidence</span>
                    </div>
                    <div className="hiw-metrics-pills-row">
                      <span className="hiw-metric-pill done">+240 EXP</span>
                      <span className="hiw-metric-pill streak">🔥 5-Day Streak</span>
                      <span className="hiw-metric-pill verbal">Clear Cadence</span>
                    </div>
                  </div>
                </div>
                <div className="hiw-step-details">
                  <span className="hiw-step-number">03</span>
                  <h3 className="hiw-step-title">Review &amp; level up</h3>
                  <p className="hiw-step-desc">Get actionable suggestions from Coach B-01, track progress curves, and unlock badges.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parallax Typography Marquee Transition */}
      <ParallaxTextSection />

      {/* Practice Lanes Section (100vh) */}
      <section className="features-grid-section" id="features">
        <div className="features-section-container">
          <div className="features-centered-header">
            <ScrollReveal as="span" textClassName="features-tag" baseRotation={0} baseOpacity={0.6} blurStrength={0}>
              FEEDBACK LANES
            </ScrollReveal>
            <ScrollReveal as="h2" containerClassName="features-title-group" textClassName="features-title-main" baseRotation={2} baseOpacity={0.6} blurStrength={2}>
              Practice Lanes
            </ScrollReveal>
            <ScrollReveal as="p" textClassName="features-description" baseRotation={0} baseOpacity={0.6} blurStrength={2}>
              Every practice session delivers multi-modal feedback across visual presence, vocal confidence, and verbal delivery.
            </ScrollReveal>
          </div>

          <div className="features-cards-3col-grid">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.tag}
                  className="feature-grid-card"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <div className="scroll-stack-card-overlay" />

                  <div className="feature-stack-card-content">
                    <div className="feature-card-header">
                      <div className="feature-card-icon">
                        <Icon size={22} color="#ffffff" />
                      </div>
                      <div className="feature-card-header-right">
                        <span className="feature-card-step">{card.step}</span>
                        <span className="feature-card-tag">{card.tag}</span>
                      </div>
                    </div>

                    <div className="feature-card-info-col">
                      <h3 className="feature-card-title">{card.title}</h3>
                      <p className="feature-card-text">{card.text}</p>
                      
                      <div className="feature-card-badges-row">
                        {card.badges.map((b) => (
                          <span key={b} className="feature-card-pill">{b}</span>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="feature-card-action-btn"
                        onClick={() => navigateTo(card.actionRoute)}
                      >
                        <span>{card.actionText}</span>
                        <IoArrowForward size={14} />
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

      {/* Works With / Platforms Section (100vh) */}
      <section className="platforms-section" id="platforms">
        <div className="platforms-container">
          <div className="features-centered-header">
            <ScrollReveal as="span" textClassName="features-tag" baseRotation={0} baseOpacity={0.6} blurStrength={0}>
              WORKS WITH
            </ScrollReveal>
            <ScrollReveal as="h2" containerClassName="features-title-group" textClassName="features-title-main" baseRotation={2} baseOpacity={0.6} blurStrength={2}>
              Available on Web &amp; Android
            </ScrollReveal>
            <ScrollReveal as="p" textClassName="features-description" baseRotation={0} baseOpacity={0.6} blurStrength={2}>
              Practice seamlessly across devices. TalkTics is designed to run directly in modern web browsers or as a native Android APK.
            </ScrollReveal>
          </div>

          <div className="platforms-cards-grid">
            {/* Web Platform Card */}
            <div className="platform-card platform-card--web">
              <div className="platform-card-header">
                <div className="platform-icon-wrap web-icon">
                  <IoGlobeOutline size={28} />
                </div>
                <span className="platform-badge web-badge">Instant Access</span>
              </div>
              <div className="platform-card-body">
                <h3 className="platform-card-title">Web Application</h3>
                <p className="platform-card-desc">
                  Open TalkTics on Chrome, Edge, Brave, or Safari. Practice speech delivery with full computer vision and audio tracking right in your browser.
                </p>
                <div className="platform-meta-tags">
                  <span className="platform-meta-tag">Chrome / Edge / Safari</span>
                  <span className="platform-meta-tag">Zero Installation</span>
                  <span className="platform-meta-tag">Cloud Synced</span>
                </div>
              </div>
              <div className="platform-card-action">
                <PushButton
                  bgColor="#059669"
                  shadowColor="#047857"
                  className="platform-btn-custom"
                  onClick={() => navigateTo(ROUTES.REGISTER)}
                >
                  Launch Web App
                </PushButton>
              </div>
            </div>

            {/* Android Platform Card */}
            <div className="platform-card platform-card--android">
              <div className="platform-card-header">
                <div className="platform-icon-wrap android-icon">
                  <IoLogoAndroid size={28} />
                </div>
                <span className="platform-badge android-badge">Mobile APK</span>
              </div>
              <div className="platform-card-body">
                <h3 className="platform-card-title">Android Application</h3>
                <p className="platform-card-desc">
                  Download our standalone Android APK for on-the-go practice sessions with offline caching, camera calibration, and rapid mobile feedback.
                </p>
                <div className="platform-meta-tags">
                  <span className="platform-meta-tag">Android 8.0+</span>
                  <span className="platform-meta-tag">Low Latency</span>
                  <span className="platform-meta-tag">Direct APK</span>
                </div>
              </div>
              <div className="platform-card-action">
                <PushButton
                  bgColor="#F18F01"
                  shadowColor="#c2410c"
                  className="platform-btn-custom"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/talktics-release.apk';
                    link.download = 'TalkTics-Android.apk';
                    link.click();
                  }}
                >
                  Download for Android
                </PushButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section" id="faq">
        <div className="faq-container">
          <div className="features-centered-header">
            <ScrollReveal as="span" textClassName="features-tag" baseRotation={0} baseOpacity={0.6} blurStrength={0}>
              FAQ
            </ScrollReveal>
            <ScrollReveal as="h2" containerClassName="features-title-group" textClassName="features-title-main" baseRotation={2} baseOpacity={0.6} blurStrength={2}>
              Frequently Asked Questions
            </ScrollReveal>
            <ScrollReveal as="p" textClassName="features-description" baseRotation={0} baseOpacity={0.6} blurStrength={2}>
              Got questions about AI processing, microphone security, or device compatibility? We have answers.
            </ScrollReveal>
          </div>

          <div className="faq-accordion-wrapper">
            {faqItems.map((item, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={item.q} 
                  className={`faq-item-card ${isOpen ? 'faq-item-card--open' : ''}`}
                >
                  <button 
                    type="button" 
                    className="faq-question-btn"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-question-text">{item.q}</span>
                    <span className="faq-chevron-wrap">
                      <IoChevronDownOutline size={20} className={`faq-chevron ${isOpen ? 'rotated' : ''}`} />
                    </span>
                  </button>

                  <div className={`faq-answer-collapse ${isOpen ? 'faq-answer-collapse--open' : ''}`}>
                    <div className="faq-answer-inner">
                      <p className="faq-answer-text">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Combined Footer + CTA Section (100vh) */}
      <footer className="footer-cta-section" id="download">
        <div className="footer-cta-container">
          <div className="footer-cta-grid">
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
            </div>

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
                  <a href="#platforms" onClick={(e) => handleCardNavLinkClick(e, { href: '#platforms' })}>
                    Works With
                  </a>
                </li>
                <li>
                  <a href="#faq" onClick={(e) => handleCardNavLinkClick(e, { href: '#faq' })}>
                    FAQ
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

          <div className="footer-watermark-text">TALKTICS</div>

          <div className="footer-bottom-bar">
            <div className="footer-bottom-left">
              <span>© {new Date().getFullYear()} TalkTics. All rights reserved.</span>
              <div className="footer-legal-bottom-links">
                <button type="button" className="footer-legal-bar-btn" onClick={showTerms}>
                  Terms of Service
                </button>
                <span className="footer-legal-bar-dot">•</span>
                <button type="button" className="footer-legal-bar-btn" onClick={showPrivacy}>
                  Privacy Policy
                </button>
              </div>
            </div>
            <div className="footer-bottom-right">
              <a href="mailto:support@talktics.app" className="footer-contact-email">
                support@talktics.app
              </a>
            </div>
          </div>
        </div>
      </footer>

      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={closeLegal}
        title={legalModal.title}
        content={legalModal.content}
      />
    </div>
  );
}
