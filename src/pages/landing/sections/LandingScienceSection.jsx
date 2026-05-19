import { motion } from 'framer-motion';
import { IoAnalytics, IoCheckmarkCircle, IoEye, IoMic, IoPulse } from 'react-icons/io5';
import b01Mascot from '../../../assets/Sprites/Robot/0001.webp';

const sciencePoints = [
  {
    icon: IoPulse,
    label: 'Voice',
    title: 'Steadier sound',
    text: 'Pitch, loudness, and pauses become easy-to-read signals.',
  },
  {
    icon: IoEye,
    label: 'Presence',
    title: 'Cleaner delivery',
    text: 'Posture and eye contact cues connect to how confident you appear.',
  },
  {
    icon: IoMic,
    label: 'Pacing',
    title: 'Less rushing',
    text: 'You see where the run needs more breath, clarity, or control.',
  },
];

export default function LandingScienceSection() {
  return (
    <section id="science" className="science-section-premium b01-science-section">
      <div className="section-shell b01-science-shell">
        <div className="science-copy-center">
          <motion.h2
            className="premium-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Real signals, friendly nudges.
          </motion.h2>

          <motion.p
            className="premium-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
          >
            Bigkas reads the messy parts of practice, then turns them into clear next moves. B-01 keeps the science from
            feeling like a report card.
          </motion.p>

          <motion.div
            className="science-wave-card"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16 }}
            aria-label="Example practice signal"
          >
            <div className="science-wave-bars" aria-hidden="true">
              {[42, 70, 34, 88, 54, 76, 40, 64, 50, 82, 38, 58].map((height, index) => (
                <span key={index} style={{ '--bar-height': `${height}%` }} />
              ))}
            </div>
            <div>
              <strong>One run becomes a clearer next round.</strong>
              <p>Volume, pauses, face cues, and pacing are translated into plain-language feedback.</p>
            </div>
          </motion.div>
        </div>

        <div className="science-lab-board science-signal-board">
          <motion.div
            className="science-mascot-card science-mascot-card--signal"
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <img src={b01Mascot} alt="B-01 reviewing feedback" className="science-b01-img" loading="lazy" />
            <div className="science-check-pill">
              <IoCheckmarkCircle />
              Try this line slower
            </div>
          </motion.div>

          <div className="science-point-list science-signal-list">
            {sciencePoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <motion.article
                  key={point.title}
                  className="science-point-card"
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <span className="science-point-label">{point.label}</span>
                  <div className="science-point-icon" aria-hidden="true">
                    <Icon />
                  </div>
                  <div>
                    <h3>{point.title}</h3>
                    <p>{point.text}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
