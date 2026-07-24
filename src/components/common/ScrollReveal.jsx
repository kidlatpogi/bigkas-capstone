import { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './ScrollReveal.css';

gsap.registerPlugin(ScrollTrigger);

const ScrollReveal = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  rotationEnd = 'bottom bottom-=10%',
  wordAnimationEnd = 'bottom bottom-=10%',
  as: Component = 'div'
}) => {
  const containerRef = useRef(null);

  const splitText = useMemo(() => {
    if (typeof children === 'string') {
      return children.split(/(\s+)/).map((word, index) => {
        if (word.match(/^\s+$/)) return word;
        return (
          <span className="word" key={index}>
            {word}
          </span>
        );
      });
    }
    return children;
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller = scrollContainerRef && scrollContainerRef.current ? scrollContainerRef.current : window;

    const ctx = gsap.context(() => {
      if (baseRotation !== 0) {
        gsap.fromTo(
          el,
          { transformOrigin: '0% 50%', rotate: baseRotation },
          {
            ease: 'none',
            rotate: 0,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top bottom',
              end: rotationEnd,
              scrub: true
            }
          }
        );
      }

      const wordElements = el.querySelectorAll('.word');
      const targets = wordElements.length > 0 ? wordElements : el;

      gsap.fromTo(
        targets,
        { opacity: baseOpacity, willChange: 'opacity, filter' },
        {
          ease: 'none',
          opacity: 1,
          stagger: wordElements.length > 0 ? 0.04 : 0,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top bottom-=10%',
            end: wordAnimationEnd,
            scrub: true
          }
        }
      );

      if (enableBlur) {
        gsap.fromTo(
          targets,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: 'none',
            filter: 'blur(0px)',
            stagger: wordElements.length > 0 ? 0.04 : 0,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top bottom-=10%',
              end: wordAnimationEnd,
              scrub: true
            }
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, rotationEnd, wordAnimationEnd, blurStrength]);

  return (
    <Component ref={containerRef} className={`scroll-reveal ${containerClassName}`}>
      <div className={`scroll-reveal-text ${textClassName}`}>{splitText}</div>
    </Component>
  );
};

export default ScrollReveal;
