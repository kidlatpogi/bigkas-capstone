import { useEffect } from 'react';
import { motion as Motion } from 'framer-motion';

import gearIcon from './science-icons/gear.png';
import marketDemandIcon from './science-icons/market-demand.png';
import publicSpeakingIcon from './science-icons/public-speaking.png';

const sciencePoints = [
  {
    icon: marketDemandIcon,
    title: 'Identifying Triggers',
    text: 'Nervousness usually hides in plain sight. Our biometric analysis detects the exact moments your voice shakes or your gestures become stiff, isolating the specific triggers of your stage fright.',
  },
  {
    icon: gearIcon,
    title: 'Correcting Habits',
    text: 'Once your unconscious habits are brought to light, you can begin the work to improve them. The system highlights your filler words and provides personalized AI recommendations, giving you clear steps to refine your delivery.',
  },
  {
    icon: publicSpeakingIcon,
    title: 'Mastering Delivery',
    text: "By combining vocal steadiness with aligned visual gestures, you rewire how you communicate. The science isn't just about tracking data; it's about building lasting self-assurance on any stage.",
  },
];

export default function LandingScienceSection() {
  useEffect(() => {
    const section = document.getElementById('science');
    if (!section) return undefined;

    const toggleScienceNav = (isVisible) => {
      document.body.classList.toggle('science-nav-visible', isVisible);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        toggleScienceNav(entry.isIntersecting && entry.intersectionRatio > 0.35);
      },
      { threshold: [0, 0.35, 0.6] },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
      toggleScienceNav(false);
    };
  }, []);

  return (
    <section id="science" className="science-section-premium b01-science-section">
      <div className="section-shell b01-science-shell">
        <div className="science-copy-center">
          <Motion.h2
            className="premium-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Real signals, friendly nudges.
          </Motion.h2>

          <Motion.p
            className="premium-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
          >
            TalkTics reads the messy parts of practice, then turns them into clear next moves. B-01 keeps the science from
            feeling like a report card.
          </Motion.p>

          <p className="premium-subtitle">
            TalkTics isn't just a tool; it's a diagnostic instrument. We bridge the gap between social anxiety and
            articulate communication through validated biometric analysis.
          </p>
        </div>

        <div className="science-point-list science-draft-grid">
          {sciencePoints.map((point) => {
            return (
              <article
                key={point.title}
                className="science-point-card science-draft-card"
              >
                <div className="science-point-icon" aria-hidden="true">
                  <img src={point.icon} alt="" loading="lazy" />
                </div>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
