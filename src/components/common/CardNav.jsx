import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { GoArrowUpRight } from 'react-icons/go';
import PropTypes from 'prop-types';
import './CardNav.css';

const CardNav = ({
  logo,
  logoAlt = 'Logo',
  items,
  className = '',
  ease = 'power3.out',
  baseColor = '#ffffff',
  menuColor = '#0B3954',
  buttonBgColor = '#059669',
  buttonTextColor = '#ffffff',
  onCtaClick,
  onLoginClick,
  onLogoClick,
  onLinkClick,
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.card-nav-content');
      if (contentEl) {
        const wasVisible = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';

        contentEl.offsetHeight;

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisible;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }
    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease
    });

    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const closeMenu = () => {
    const tl = tlRef.current;
    if (!tl || !isExpanded) return;
    setIsHamburgerOpen(false);
    tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
    tl.reverse();
  };

  const setCardRef = i => el => {
    if (el) cardsRef.current[i] = el;
  };

  const handleLinkClickInternal = (e, link) => {
    closeMenu();
    if (onLinkClick) {
      onLinkClick(e, link);
    }
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`}>
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
              }
            }}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            aria-expanded={isExpanded}
            tabIndex={0}
            style={{ color: menuColor || '#0B3954' }}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div 
            className="logo-container" 
            onClick={() => { closeMenu(); onLogoClick?.(); }}
            style={{ cursor: onLogoClick ? 'pointer' : 'default' }}
          >
            <img src={logo} alt={logoAlt} className="logo" />
            {logoAlt && <span className="logo-text-title">{logoAlt}</span>}
          </div>

          <div className="card-nav-actions">
            <button
              type="button"
              className="card-nav-login-button"
              onClick={() => { closeMenu(); onLoginClick?.(); }}
            >
              Login
            </button>
            <button
              type="button"
              className="card-nav-cta-button"
              style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
              onClick={() => { closeMenu(); onCtaClick?.(); }}
            >
              Get Started
            </button>
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <a 
                    key={`${lnk.label}-${i}`} 
                    className="nav-card-link" 
                    href={lnk.href || '#'} 
                    aria-label={lnk.ariaLabel}
                    onClick={(e) => handleLinkClickInternal(e, lnk)}
                  >
                    <GoArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
                    {lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

CardNav.propTypes = {
  logo: PropTypes.string.isRequired,
  logoAlt: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      bgColor: PropTypes.string,
      textColor: PropTypes.string,
      links: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string,
          href: PropTypes.string,
          ariaLabel: PropTypes.string,
          onClick: PropTypes.func,
        })
      ),
    })
  ).isRequired,
  className: PropTypes.string,
  ease: PropTypes.string,
  baseColor: PropTypes.string,
  menuColor: PropTypes.string,
  buttonBgColor: PropTypes.string,
  buttonTextColor: PropTypes.string,
  onCtaClick: PropTypes.func,
  onLoginClick: PropTypes.func,
  onLogoClick: PropTypes.func,
  onLinkClick: PropTypes.func,
};

export default CardNav;
