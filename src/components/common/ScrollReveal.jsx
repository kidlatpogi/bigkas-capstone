import { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './ScrollReveal.css';

gsap.registerPlugin(ScrollTrigger);

const ScrollReveal = ({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.25,
  baseRotation = 2,
  blurStrength = 4,
  containerClassName = '',
  textClassName = '',
  as: Component = 'div'
}) => {
  const containerRef = useRef(null);

  const splitText = useMemo(() => {
    const extractText = (node) => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extractText).join('');
      if (node && node.props && node.props.children) return extractText(node.props.children);
      return '';
    };

    const text = extractText(children);
    if (!text) return children;

    return text.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return ' ';
      return (
        <span className="word" key={index}>
          {word}
        </span>
      );
    });
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
            ease: 'power2.out',
            rotate: 0,
            duration: 0.8,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top 92%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }

      const wordElements = el.querySelectorAll('.word');
      const targets = wordElements.length > 0 ? wordElements : el;

      gsap.fromTo(
        targets,
        {
          opacity: baseOpacity,
          filter: enableBlur ? `blur(${blurStrength}px)` : 'none',
          willChange: 'opacity, filter'
        },
        {
          ease: 'power2.out',
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.6,
          stagger: wordElements.length > 0 ? 0.025 : 0,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top 90%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }, el);

    return () => ctx.revert();
  }, [scrollContainerRef, enableBlur, baseRotation, baseOpacity, blurStrength]);

  return (
    <Component ref={containerRef} className={`scroll-reveal ${containerClassName}`}>
      <span className={`scroll-reveal-text ${textClassName}`}>{splitText}</span>
    </Component>
  );
};

export default ScrollReveal;
