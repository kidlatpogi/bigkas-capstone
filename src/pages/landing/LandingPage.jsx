import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoEye, IoMic, IoChatbubbleEllipses } from 'react-icons/io5';
import { ROUTES } from '../../utils/constants';
import { getAssetUrl } from '../../utils/assetUtils';
import CardNav from '../../components/common/CardNav';
import ShapeGrid from '../../components/common/ShapeGrid';
import PushButton from '../../components/common/PushButton';
import ScrollStack, { ScrollStackItem } from '../../components/common/ScrollStack';
import gradVideo from '../../assets/landing/Grad-Video.mp4';
import './LandingPage.css';

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');

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
      accentColor: '#059669',
      tag: 'VISUAL LANE',
      title: 'Look steady & intentional',
      text: 'Read posture, eye contact, and facial tension in real time so your delivery feels confident instead of frozen on stage.',
    },
    {
      icon: IoMic,
      accentColor: '#F18F01',
      tag: 'VOCAL LANE',
      title: 'Sound clear & resonant',
      text: 'Track volume stability, pitch modulation, and speech shakiness so your voice becomes easier to control with every run-through.',
    },
    {
      icon: IoChatbubbleEllipses,
      accentColor: '#0B3954',
      tag: 'VERBAL LANE',
      title: 'Speak naturally & smoothly',
      text: 'Review pronunciation cues and pacing feedback that help listeners follow your speech message without extra effort.',
    },
  ];

  return (
    <div className="landing-clean-wrapper">
      <ShapeGrid 
        squareSize={42} 
        borderColor="rgba(0, 0, 0, 0.07)" 
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

      {/* Features Section using ScrollStack */}
      <section className="features-scroll-section" id="features">
        <div className="features-section-header">
          <h2 className="features-section-title">Three feedback lanes, one speaking goal.</h2>
          <p className="features-section-subtitle">
            TalkTics keeps feedback focused, readable, and easy to act on after each private practice session.
          </p>
        </div>

        <ScrollStack 
          useWindowScroll={true} 
          itemDistance={70} 
          itemStackDistance={30} 
          stackPosition="25%" 
          baseScale={0.88}
        >
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <ScrollStackItem key={card.title}>
                <div className="feature-stack-card-content">
                  <div className="feature-card-header">
                    <span className="feature-card-tag" style={{ color: card.accentColor, borderColor: card.accentColor }}>
                      {card.tag}
                    </span>
                    <div className="feature-card-icon" style={{ backgroundColor: card.accentColor }}>
                      <Icon color="#ffffff" size={24} />
                    </div>
                  </div>
                  <h3 className="feature-card-title">{card.title}</h3>
                  <p className="feature-card-text">{card.text}</p>
                </div>
              </ScrollStackItem>
            );
          })}
        </ScrollStack>
      </section>
    </div>
  );
}
