import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { scroller } from 'react-scroll';
import { ROUTES } from '../../utils/constants';
import './LandingPage.css';
import './sections/LandingSections.css';
import { getAssetUrl } from '../../utils/assetUtils';
import Button from '../../components/common/Button';
import StaggeredMenu from '../../components/common/StaggeredMenu';

const bigkasLogo = getAssetUrl('Images/Bigkas-Logo.webp');
import LandingHeroSection from './sections/LandingHeroSection';

const LandingHowItWorksSection = lazy(() => import('./sections/LandingHowItWorksSection'));
const LandingFeaturesSection = lazy(() => import('./sections/LandingFeaturesSection'));
const LandingScienceSection = lazy(() => import('./sections/LandingScienceSection'));
const LandingSectionFive = lazy(() => import('./sections/LandingSectionFive'));
const LandingFooterSection = lazy(() => import('./sections/LandingFooterSection'));

const SCROLL_OFFSET = 0;

const FEATURE_CARD_COUNT = 3;

function scrollToSectionById(sectionId, setMenuOpen) {
  scroller.scrollTo(sectionId, {
    duration: 800,
    delay: 0,
    smooth: 'easeInOutQuart',
    offset: SCROLL_OFFSET,
  });
  setMenuOpen?.(false);
}

export default function LandingPage({ managePageClass = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('light');
  const [activeSection, setActiveSection] = useState('hero');
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [featureCardIndex, setFeatureCardIndex] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const heroSectionRef = useRef(null);
  const featuresGridRef = useRef(null);
  const howSectionRef = useRef(null);
  const revealStepRef = useRef(0);
  const instantSectionLocksRef = useRef({
    features: false,
    science: false,
  });

  function navigateTo(path) {
    navigate(path);
  }

  function goToNextFeatureCard() {
    setFeatureCardIndex((current) => (current + 1) % FEATURE_CARD_COUNT);
  }

  function goToPreviousFeatureCard() {
    setFeatureCardIndex((current) => (current - 1 + FEATURE_CARD_COUNT) % FEATURE_CARD_COUNT);
  }

  function goToFeatureCard(index) {
    setFeatureCardIndex(index);
  }

  useEffect(() => {
    if (managePageClass) {
      document.documentElement.classList.add('landing-page-active');
      document.body.classList.add('landing-page-active');
    }

    const sections = ['hero', 'how-it-works', 'features', 'science', 'section-5'];
    const updateActiveSectionFromScroll = () => {
      const probeY = window.innerHeight * 0.35;
      const currentSectionId = sections.find((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top <= probeY && rect.bottom > probeY;
      });

      if (currentSectionId) {
        setActiveSection(currentSectionId);
        setActiveTheme(currentSectionId === 'hero' ? 'light' : 'dark');
      }
    };

    updateActiveSectionFromScroll();
    window.addEventListener('scroll', updateActiveSectionFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveSectionFromScroll);

    return () => {
      if (managePageClass) {
        document.documentElement.classList.remove('landing-page-active');
        document.body.classList.remove('landing-page-active');
      }
      window.removeEventListener('scroll', updateActiveSectionFromScroll);
      window.removeEventListener('resize', updateActiveSectionFromScroll);
    };
  }, [managePageClass]);

  useEffect(() => {
    const isHomeRoute = location.pathname === ROUTES.HOME;

    if (!isHomeRoute) {
      const closeMenuTimer = window.setTimeout(() => {
        setMenuOpen(false);
      }, 0);

      return () => {
        window.clearTimeout(closeMenuTimer);
      };
    }

    // Force the landing page to start from the hero on reload.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      setHeroScrollProgress(0);
      setActiveSection('hero');
    });

    const resetVisibilityTimer = window.setTimeout(() => {
      setIsNavVisible(false);
    }, 0);

    const showVisibilityTimer = window.setTimeout(() => {
      setIsNavVisible(true);
    }, 500);

    return () => {
      window.clearTimeout(resetVisibilityTimer);
      window.clearTimeout(showVisibilityTimer);
    };
  }, [location]);

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('menu-open-active');
    } else {
      document.body.classList.remove('menu-open-active');
    }

    return () => {
      document.body.classList.remove('menu-open-active');
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!featuresGridRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting) {
        featuresGridRef.current?.classList.add('is-active');
      } else {
        featuresGridRef.current?.classList.remove('is-active');
      }
    }, {
      threshold: 0.35,
    });

    observer.observe(featuresGridRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateHeroProgress = () => {
      if (!heroSectionRef.current) {
        return;
      }

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

  useEffect(() => {
    if (!howSectionRef.current) return undefined;

    const handleScrollVisibility = () => {
      const section = howSectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionVisible = rect.top < windowHeight * 0.75 && rect.bottom > windowHeight * 0.25;
      setShowScrollIndicator(sectionVisible);
    };

    handleScrollVisibility();
    window.addEventListener('scroll', handleScrollVisibility, { passive: true });
    window.addEventListener('resize', handleScrollVisibility);

    return () => {
      window.removeEventListener('scroll', handleScrollVisibility);
      window.removeEventListener('resize', handleScrollVisibility);
    };
  }, []);


  useEffect(() => {
    const handleWheel = (event) => {
      if (window.matchMedia('(max-width: 1024px)').matches) {
        return;
      }

      const windowHeight = window.innerHeight;
      const instantLockSectionIds = ['features', 'science'];

      // Apply a one-wheel "instant" viewport lock before allowing normal scroll.
      for (const sectionId of instantLockSectionIds) {
        const targetSection = document.getElementById(sectionId);
        if (!targetSection) {
          continue;
        }

        const targetRect = targetSection.getBoundingClientRect();
        const inInstantLockZone = targetRect.top <= windowHeight * 0.12 && targetRect.bottom > windowHeight * 0.4;

        if (inInstantLockZone && !instantSectionLocksRef.current[sectionId]) {
          event.preventDefault();
          instantSectionLocksRef.current[sectionId] = true;
          window.scrollTo({ top: window.scrollY + targetRect.top, left: 0, behavior: 'auto' });
          return;
        }

        if (!inInstantLockZone) {
          instantSectionLocksRef.current[sectionId] = false;
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const navItems = [
    { label: 'How it Works', sectionId: 'how-it-works' },
    { label: 'Features', sectionId: 'features' },
    { label: 'The Science', sectionId: 'science' },
  ];

  const mobileMenuItems = navItems.map((item) => ({
    label: item.label,
    link: '#',
    active: activeSection === item.sectionId,
    onClick: () => {
      scrollToSectionById(item.sectionId, setMenuOpen);
    },
  })).concat([
    {
      label: 'Login',
      link: '#',
      active: false,
      onClick: () => navigateTo(ROUTES.LOGIN),
    },
    {
      label: 'Get Started',
      link: '#',
      active: false,
      onClick: () => navigateTo(ROUTES.REGISTER),
    },
  ]);

  return (
    <div className="figma-landing">
      <nav
        className={[
          'figma-nav',
          activeTheme === 'dark' && 'nav-theme-dark',
          activeSection === 'hero' && 'nav-on-hero',
          activeSection === 'science' && 'nav-on-green-sections',
          (activeSection === 'how-it-works' || activeSection === 'features') && 'nav-menu-black',
          activeSection === 'section-5' && 'nav-on-last-section',
          menuOpen && 'menu-open',
          isNavVisible ? 'nav-visible' : 'nav-hidden',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Primary landing navigation"
      >
        <div className="figma-nav-inner">
          <button
            type="button"
            className="figma-logo"
            onClick={() => scrollToSectionById('hero', setMenuOpen)}
            aria-label="Go to hero section"
          >
            <div className="landing-logo-wrapper">
              <img 
                src={bigkasLogo} 
                srcSet={bigkasLogo}
                alt="Bigkas" 
                className="landing-logo-img" 
                fetchPriority="high"
              />
              <span className="logo-text">Bigkas</span>
            </div>
          </button>

          <ul className="figma-nav-links">
            {navItems.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className={`nav-link-btn ${activeSection === item.sectionId ? 'active' : ''}`}
                  onClick={() => scrollToSectionById(item.sectionId, setMenuOpen)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="figma-nav-actions">
            <Button
              variant="outline"
              className="landing-btn--nav landing-btn--pill nav-cta nav-cta--secondary"
              onClick={() => navigateTo(ROUTES.LOGIN)}
            >
              Login
            </Button>
            <Button
              variant="ink"
              className="landing-btn--nav landing-btn--pill nav-cta nav-cta--primary"
              onClick={() => navigateTo(ROUTES.REGISTER)}
            >
              Get Started
            </Button>
          </div>

          <div className="figma-burger" aria-label="Toggle menu">
            <StaggeredMenu
              className="landing-staggered-menu"
              position="right"
              colors={['#1f6aa4', '#0f3048']}
              items={mobileMenuItems}
              displaySocials={false}
              displayItemNumbering={true}
              brandName=""
              menuButtonColor="currentColor"
              openMenuButtonColor="#ffffff"
              accentColor="#f18f01"
              isFixed={true}
              onMenuOpen={() => setMenuOpen(true)}
              onMenuClose={() => setMenuOpen(false)}
            />
          </div>
        </div>
      </nav>

      <LandingHeroSection
        heroSectionRef={heroSectionRef}
        heroScrollProgress={heroScrollProgress}
        navigateTo={navigateTo}
        onSeeHowItWorks={() => scrollToSectionById('how-it-works', setMenuOpen)}
      />

      <Suspense fallback={<div className="landing-section-loading how-loading" />}>
        <LandingHowItWorksSection
          howSectionRef={howSectionRef}
          revealStep={revealStep}
          showScrollIndicator={showScrollIndicator}
        />
      </Suspense>

      <Suspense fallback={<div className="landing-section-loading features-loading" />}>
        <LandingFeaturesSection
          featuresGridRef={featuresGridRef}
          featureCardIndex={featureCardIndex}
          goToPreviousFeatureCard={goToPreviousFeatureCard}
          goToNextFeatureCard={goToNextFeatureCard}
          goToFeatureCard={goToFeatureCard}
        />
      </Suspense>

      <Suspense fallback={<div className="landing-section-loading science-loading" />}>
        <LandingScienceSection />
      </Suspense>

      <Suspense fallback={<div className="landing-section-loading s5-loading" />}>
        <LandingSectionFive navigateTo={navigateTo} />
      </Suspense>

      <Suspense fallback={<div className="landing-section-loading footer-loading" />}>
        <LandingFooterSection
          navigateTo={navigateTo}
          onScrollToSection={(sectionId) => scrollToSectionById(sectionId, setMenuOpen)}
        />
      </Suspense>
    </div>
  );
}
