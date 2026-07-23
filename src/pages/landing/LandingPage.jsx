import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { getAssetUrl } from '../../utils/assetUtils';
import CardNav from '../../components/common/CardNav';
import ShapeGrid from '../../components/common/ShapeGrid';
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
        borderColor="rgba(11, 57, 84, 0.08)" 
        hoverFillColor="rgba(5, 150, 105, 0.18)" 
        shape="square" 
        hoverTrailAmount={4} 
        className="landing-shapegrid-bg" 
      />

      <CardNav
        logo={bigkasLogo}
        logoAlt="TalkTics"
        items={cardNavItems}
        baseColor="rgba(255, 255, 255, 0.55)"
        menuColor="#0B3954"
        buttonBgColor="#059669"
        buttonTextColor="#ffffff"
        onCtaClick={() => navigateTo(ROUTES.REGISTER)}
        onLoginClick={() => navigateTo(ROUTES.LOGIN)}
        onLogoClick={() => navigateTo(ROUTES.HOME)}
        onLinkClick={handleCardNavLinkClick}
      />
    </div>
  );
}
