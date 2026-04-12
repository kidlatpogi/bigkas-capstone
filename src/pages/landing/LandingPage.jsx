import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { scroller } from 'react-scroll';
import { ROUTES } from '../../utils/constants';
import './LandingPage.css';
import './sections/LandingSections.css';
import Button from '../../components/common/Button';
import StaggeredMenu from '../../components/common/StaggeredMenu';
import LandingHeroSection from './sections/LandingHeroSection';
import LandingHowItWorksSection from './sections/LandingHowItWorksSection';
import LandingFeaturesSection from './sections/LandingFeaturesSection';
import LandingScienceSection from './sections/LandingScienceSection';
import LandingSectionFive from './sections/LandingSectionFive';
import LandingFooterSection from './sections/LandingFooterSection';

const SCROLL_OFFSET = 0;

const LOADER_DURATION_MS = 4000;
const LOADER_EXIT_MS = 650;
const FEATURE_CARD_COUNT = 3;

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - ((-2 * value + 2) ** 3) / 2;
}

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
  const isLandingRoute = location.pathname === ROUTES.HOME;
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('light');
  const [activeSection, setActiveSection] = useState('hero');
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [isLoaderExiting, setIsLoaderExiting] = useState(false);
  const [hasWindowLoaded, setHasWindowLoaded] = useState(document.readyState === 'complete');
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [featureCardIndex, setFeatureCardIndex] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const heroSectionRef = useRef(null);
  const featuresGridRef = useRef(null);
  const howSectionRef = useRef(null);
  const loaderFrameRef = useRef(0);
  const loaderExitTimerRef = useRef(0);
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

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          setActiveSection(id);
          setActiveTheme(id === 'hero' ? 'light' : 'dark');
        }
      });
    }, {
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0.1,
    });

    const sections = ['hero', 'how-it-works', 'features', 'science', 'section-5'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      if (managePageClass) {
        document.documentElement.classList.remove('landing-page-active');
        document.body.classList.remove('landing-page-active');
      }
      observer.disconnect();
    };
  }, [managePageClass]);

  useEffect(() => {
    const isLandingRoute = location.pathname === ROUTES.HOME;
    const skipLoader = location.state?.skipLoader;

    if (!isLandingRoute) {
      const resetLoaderTimer = window.setTimeout(() => {
        setIsPageLoading(false);
        setIsLoaderExiting(false);
      }, 0);

      const closeMenuTimer = window.setTimeout(() => {
        setMenuOpen(false);
      }, 0);

      return () => {
        window.clearTimeout(resetLoaderTimer);
        window.clearTimeout(closeMenuTimer);
      };
    }

    // Skip loader animation if returning from auth pages
    if (skipLoader) {
      const skipLoaderTimer = window.setTimeout(() => {
        setIsPageLoading(false);
        setIsLoaderExiting(false);
        setLoaderProgress(100);
        setIsNavVisible(true);
      }, 0);

      return () => window.clearTimeout(skipLoaderTimer);
    }

    const initializeLoaderTimer = window.setTimeout(() => {
      setIsPageLoading(true);
      setIsLoaderExiting(false);
      setLoaderProgress(0);
      setHasWindowLoaded(document.readyState === 'complete');

      const startTime = window.performance.now();

      const animateLoader = (now) => {
        const elapsed = Math.min(now - startTime, LOADER_DURATION_MS);
        const progress = Math.min(100, Math.round(easeInOutCubic(elapsed / LOADER_DURATION_MS) * 100));
        setLoaderProgress(progress);

        if (elapsed < LOADER_DURATION_MS) {
          loaderFrameRef.current = window.requestAnimationFrame(animateLoader);
        }
      };

      loaderFrameRef.current = window.requestAnimationFrame(animateLoader);
    }, 0);

    const onWindowLoad = () => {
      setHasWindowLoaded(true);
    };

    if (document.readyState !== 'complete') {
      window.addEventListener('load', onWindowLoad, { once: true });
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
      window.clearTimeout(initializeLoaderTimer);
      window.cancelAnimationFrame(loaderFrameRef.current);
      window.clearTimeout(resetVisibilityTimer);
      window.clearTimeout(showVisibilityTimer);
      window.removeEventListener('load', onWindowLoad);
      window.clearTimeout(loaderExitTimerRef.current);
    };
  }, [location]);

  useEffect(() => {
    if (location.pathname !== ROUTES.HOME || !isPageLoading || isLoaderExiting) {
      return undefined;
    }

    if (!hasWindowLoaded || loaderProgress < 100) {
      return undefined;
    }

    const triggerExitTimer = window.setTimeout(() => {
      setIsLoaderExiting(true);
      loaderExitTimerRef.current = window.setTimeout(() => {
        setIsPageLoading(false);
      }, LOADER_EXIT_MS);
    }, 0);

    return () => {
      window.clearTimeout(triggerExitTimer);
      window.clearTimeout(loaderExitTimerRef.current);
    };
  }, [hasWindowLoaded, isLoaderExiting, isPageLoading, loaderProgress, location.pathname]);

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
    revealStepRef.current = revealStep;

    const handleScrollVisibility = () => {
      const isMobileViewport = window.matchMedia('(max-width: 1024px)').matches;
      if (isMobileViewport) {
        setShowScrollIndicator(false);
        document.documentElement.classList.remove('how-lock-active');
        return;
      }

      const section = howSectionRef.current;
      if (!section) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionVisible = rect.top < windowHeight * 0.75 && rect.bottom > windowHeight * 0.25;
      setShowScrollIndicator(sectionVisible && revealStepRef.current === 0);

      const shouldKeepSnapUnlocked = revealStepRef.current === 0
        && rect.top <= windowHeight * 0.12
        && rect.bottom > windowHeight * 0.4;
      document.documentElement.classList.toggle('how-lock-active', shouldKeepSnapUnlocked);
    };

    handleScrollVisibility();
    window.addEventListener('scroll', handleScrollVisibility, { passive: true });
    window.addEventListener('resize', handleScrollVisibility);

    return () => {
      window.removeEventListener('scroll', handleScrollVisibility);
      window.removeEventListener('resize', handleScrollVisibility);
      document.documentElement.classList.remove('how-lock-active');
    };
  }, [revealStep]);


  useEffect(() => {
    if (!howSectionRef.current) return undefined;

    if (window.matchMedia('(max-width: 1024px)').matches) {
      document.documentElement.classList.remove('how-lock-active');
      return undefined;
    }

    const handleWheel = (event) => {
      if (window.matchMedia('(max-width: 1024px)').matches) {
        return;
      }

      const direction = Math.sign(event.deltaY);
      if (direction === 0) {
        return;
      }

      const section = howSectionRef.current;
      if (!section) {
        return;
      }

      const windowHeight = window.innerHeight;
      const instantLockSectionIds = ['features', 'science'];

      // Section 3 onwards: apply a one-wheel "instant" viewport lock before allowing normal scroll.
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

      const rect = section.getBoundingClientRect();
      // Use a tolerance band so fast wheel + snap can't skip the exact top edge.
      const inLockZone = rect.top <= windowHeight * 0.12 && rect.bottom > windowHeight * 0.4;
      const currentStep = revealStepRef.current;

      if (!inLockZone || currentStep > 0) {
        document.documentElement.classList.remove('how-lock-active');
      } else {
        document.documentElement.classList.add('how-lock-active');
      }

      if (!inLockZone) {
        return;
      }

      if (direction > 0 && currentStep === 0) {
        event.preventDefault();
        setRevealStep(4);
        window.scrollTo({ top: window.scrollY + rect.top, left: 0, behavior: 'auto' });
        return;
      }

      if (direction < 0 && currentStep > 0) {
        event.preventDefault();
        setRevealStep(0);
        window.scrollTo({ top: window.scrollY + rect.top, left: 0, behavior: 'auto' });
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      document.documentElement.classList.remove('how-lock-active');
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
      {isLandingRoute && isPageLoading && (
        <div className={`landing-loader-overlay ${isLoaderExiting ? 'is-exiting' : ''}`} aria-label={`Loading ${loaderProgress}%`}>
          <div className="container" role="status" aria-live="polite" aria-atomic="true">
            <div className="loader" />
            <div className="loader" />
            <div className="loader" />
            <span className="landing-loader-percent">{loaderProgress}%</span>
            <span className="landing-loader-word">Bigkas</span>
          </div>
        </div>
      )}

      <nav
        className={`figma-nav ${activeTheme === 'dark' ? 'nav-theme-dark' : ''} ${activeSection === 'hero' ? 'nav-on-hero' : ''} ${activeSection === 'how-it-works' || activeSection === 'science' ? 'nav-on-green-sections' : ''} ${activeSection === 'features' ? 'nav-menu-black' : ''} ${activeSection === 'section-5' ? 'nav-on-last-section' : ''} ${menuOpen ? 'menu-open' : ''} ${isNavVisible ? 'nav-visible' : 'nav-hidden'}`}
        aria-label="Primary landing navigation"
      >
        <div className="figma-nav-inner">
          <button
            type="button"
            className="figma-logo"
            onClick={() => scrollToSectionById('hero', setMenuOpen)}
            aria-label="Go to hero section"
          >
            <span className="logo-text">Bigkas</span>
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

      <LandingHowItWorksSection
        howSectionRef={howSectionRef}
        revealStep={revealStep}
        showScrollIndicator={showScrollIndicator}
      />

      <LandingFeaturesSection
        featuresGridRef={featuresGridRef}
        featureCardIndex={featureCardIndex}
        goToPreviousFeatureCard={goToPreviousFeatureCard}
        goToNextFeatureCard={goToNextFeatureCard}
        goToFeatureCard={goToFeatureCard}
      />

      <LandingScienceSection />

      <LandingSectionFive navigateTo={navigateTo} />

      <LandingFooterSection
        navigateTo={navigateTo}
        onScrollToSection={(sectionId) => scrollToSectionById(sectionId, setMenuOpen)}
      />
    </div>
  );
}
