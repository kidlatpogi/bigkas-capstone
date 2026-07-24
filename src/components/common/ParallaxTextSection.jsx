import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import './ParallaxTextSection.css';

export default function ParallaxTextSection() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const rowOneX = useTransform(scrollYProgress, [0, 1], ['18vw', '-18vw']);
  const rowTwoX = useTransform(scrollYProgress, [0, 1], ['-18vw', '18vw']);

  return (
    <section className="parallax-text-section" ref={sectionRef} aria-label="TalkTics practice pillars">
      <div className="parallax-text-rows">
        <div className="parallax-text-row-track">
          <motion.div className="parallax-text-row" style={{ x: rowOneX }}>
            <span className="parallax-text-headline">Visual</span>
            <span className="parallax-text-amp">&amp;</span>
            <span className="parallax-text-headline">Vocal</span>
          </motion.div>
        </div>

        <div className="parallax-text-row-track">
          <motion.div className="parallax-text-row" style={{ x: rowTwoX }}>
            <span className="parallax-text-headline">Practice</span>
            <span className="parallax-text-amp">&amp;</span>
            <span className="parallax-text-headline">Improve</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
