import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { scroller } from 'react-scroll';
import { ROUTES } from '../../utils/constants';
import './LandingPage.css';
import './sections/LandingSections.css';
import { getAssetUrl } from '../../utils/assetUtils';
import CardNav from '../../components/common/CardNav';
import LandingHeroSection from './sections/LandingHeroSection';

const LandingFeaturesSection = lazy(() => import('./sections/LandingFeaturesSection'));
const LandingSectionFive = lazy(() => import('./sections/LandingSectionFive'));
const LandingFooterSection = lazy(() => import('./sections/LandingFooterSection'));

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');

const FEATURE_CARD_COUNT = 3;

function scrollToSectionById(sectionId) {
  scroller.scrollTo(sectionId, {
    duration: 800,
    delay: 0,
    smooth: 'easeInOutQuart',
    offset: 0,
  });
}

export default function LandingPage({ managePageClass = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);
  const [featureCardIndex, setFeatureCardIndex] = useState(0);
  const heroSectionRef = useRef(null);
  const featuresGridRef = useRef(null);

  function navigateTo(path) {
    navigate(path);
  }

  function goToPreviousFeatureCard() {
    setFeatureCardIndex((current) => (current - 1 + FEATURE_CARD_COUNT) % FEATURE_CARD_COUNT);
  }

  function goToNextFeatureCard() {
    setFeatureCardIndex((current) => (current + 1) % FEATURE_CARD_COUNT);
  }

  function goToFeatureCard(index) {
    setFeatureCardIndex(index);
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
      setHeroScrollProgress(0);
    });
  }, [location]);

  useEffect(() => {
    if (!featuresGridRef.current) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          featuresGridRef.current?.classList.add('is-active');
        } else {
          featuresGridRef.current?.classList.remove('is-active');
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(featuresGridRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateHeroProgress = () => {
      if (!heroSectionRef.current) return;
      const rect = heroSectionRef.current.getBoundingClientRect();
      const quickFillDistance = 16;
      const progress = Math.min(1, Math.max(0, -rect.top / quickFillDistance));
      setHeroScrollProgress(progress);
    };

    updateHeroProgress();
    window.addEventListener('scroll', updateHeroProgress, { passive: true });
    window.addEventListener('resize', updateHeroProgress);

    return () => {
      window.removeEventListener('scroll', updateHeroProgress);
      window.removeEventListener('resize', updateHeroProgress);
    };
  }, []);

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
        { label: 'Login', href: ROUTES.LOGIN, ariaLabel: 'Login to TalkTics', isRoute: true },
        { label: 'Register', href: ROUTES.REGISTER, ariaLabel: 'Register for TalkTics', isRoute: true },
      ],
    },
    {
      label: 'Practice',
      bgColor: '#059669',
      textColor: '#FFFFFF',
      links: [
        { label: 'Start Free Practice', href: ROUTES.REGISTER, ariaLabel: 'Start Free Practice', isRoute: true },
        { label: 'Explore Features', href: '#features', ariaLabel: 'Explore Features Section' },
      ],
    },
  ];

  const handleCardNavLinkClick = (e, link) => {
    if (link.isRoute) {
      e.preventDefault();
      navigate(link.href);
    } else if (link.href && link.href.startsWith('#')) {
      e.preventDefault();
      const sectionId = link.href.replace('#', '');
      scrollToSectionById(sectionId);
    }
  };

  return (
    <div className="figma-landing">
      <CardNav
        logo={bigkasLogo}
        logoAlt="TalkTics"
        items={cardNavItems}
        baseColor="#ffffff"
        menuColor="#0B3954"
        buttonBgColor="#059669"
        buttonTextColor="#ffffff"
        onCtaClick={() => navigateTo(ROUTES.REGISTER)}
        onLogoClick={() => scrollToSectionById('hero')}
        onLinkClick={handleCardNavLinkClick}
      />

      <LandingHeroSection
        heroSectionRef={heroSectionRef}
        heroScrollProgress={heroScrollProgress}
        navigateTo={navigateTo}
        onSeeHowItWorks={() => scrollToSectionById('features')}
      />

      <Suspense fallback={<div className="landing-section-loading features-loading" />}>
        <LandingFeaturesSection
          featuresGridRef={featuresGridRef}
          featureCardIndex={featureCardIndex}
          goToPreviousFeatureCard={goToPreviousFeatureCard}
          goToNextFeatureCard={goToNextFeatureCard}
          goToFeatureCard={goToFeatureCard}
        />
      </Suspense>

      <Suspense fallback={<div className="landing-section-loading s5-loading" />}>
        <LandingSectionFive navigateTo={navigateTo} onSeeHowItWorks={() => scrollToSectionById('features')} />
      </Suspense>

      <Suspense fallback={<div className="landing-section-loading footer-loading" />}>
        <LandingFooterSection
          navigateTo={navigateTo}
          onScrollToSection={(sectionId) => scrollToSectionById(sectionId)}
        />
      </Suspense>
    </div>
  );
}
