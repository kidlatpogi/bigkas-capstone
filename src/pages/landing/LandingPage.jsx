import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { getAssetUrl } from '../../utils/assetUtils';
import CardNav from '../../components/common/CardNav';
import ShapeGrid from '../../components/common/ShapeGrid';
import PushButton from '../../components/common/PushButton';
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
      label: 'Platform',
      bgColor: 'rgba(11, 57, 84, 0.85)',
      textColor: '#FFFFFF',
      links: [
        { label: 'Login', href: ROUTES.LOGIN, ariaLabel: 'Login to TalkTics', isRoute: true },
        { label: 'Register', href: ROUTES.REGISTER, ariaLabel: 'Register for TalkTics', isRoute: true },
      ],
    },
    {
      label: 'Account',
      bgColor: 'rgba(241, 143, 1, 0.85)',
      textColor: '#FFFFFF',
      links: [
        { label: 'Sign In', href: ROUTES.LOGIN, ariaLabel: 'Sign In', isRoute: true },
        { label: 'Create Account', href: ROUTES.REGISTER, ariaLabel: 'Create Free Account', isRoute: true },
      ],
    },
    {
      label: 'Get Started',
      bgColor: 'rgba(5, 150, 105, 0.85)',
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
    }
  };

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
        baseColor="rgba(255, 255, 255, 0.65)"
        menuColor="#0B3954"
        buttonBgColor="#059669"
        buttonTextColor="#ffffff"
        onCtaClick={() => navigateTo(ROUTES.REGISTER)}
        onLoginClick={() => navigateTo(ROUTES.LOGIN)}
        onLogoClick={() => navigateTo(ROUTES.HOME)}
        onLinkClick={handleCardNavLinkClick}
      />

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
              className="hero-btn-primary"
              onClick={() => navigateTo(ROUTES.REGISTER)}
            >
              Start Practicing - It&apos;s Free
            </PushButton>
            <PushButton
              bgColor="#f18f01"
              shadowColor="#d97706"
              className="hero-btn-secondary"
              onClick={() => navigateTo(ROUTES.LOGIN)}
            >
              Login to Account
            </PushButton>
          </div>
        </div>
      </section>
    </div>
  );
}
