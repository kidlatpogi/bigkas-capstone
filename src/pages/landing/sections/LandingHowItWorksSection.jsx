import { motion as Motion } from 'framer-motion';
import { IoChatbubbleEllipses, IoDownloadOutline, IoMic, IoRefresh } from 'react-icons/io5';
import ScrollDownIndicator from '../../../components/common/ScrollDownIndicator';

const apkDownloadPath = '/downloads/Bigkas.apk';
const apkIconPath = '/images/bigkas-apk-icon.png';

const insightBubbles = [
  { text: 'Presence', className: 'how-bubble--presence' },
  { text: 'Visual', className: 'how-bubble--visual' },
  { text: 'Vocal', className: 'how-bubble--vocal' },
  { text: 'Flow', className: 'how-bubble--flow' },
  { text: 'Confidence', className: 'how-bubble--confidence' },
  { text: 'Growth', className: 'how-bubble--growth' },
  { text: 'Eye Contact', className: 'how-bubble--eye-contact' },
];

const processSteps = [
  {
    icon: IoChatbubbleEllipses,
    title: 'Pick a stage',
    text: 'Open your Journey path, choose an unlocked activity, or jump into Randomizer or Free Speech practice.',
  },
  {
    icon: IoMic,
    title: 'Start one run',
    text: 'B-01 sets the prompt, then you record a short attempt with the speaking task front and center.',
  },
  {
    icon: IoRefresh,
    title: 'Use the feedback',
    text: 'Your score, EXP, streak, and DONE stamp update so the next activity or retake is obvious.',
  },
];

export default function LandingHowItWorksSection({ howSectionRef, showScrollIndicator }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.14 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 120, damping: 20 },
    },
  };

  return (
    <section id="how-it-works" className="how-it-works-redesign landing-path-section" ref={howSectionRef}>
      <div className="how-bubble-field" aria-hidden="true">
        {insightBubbles.map((bubble) => (
          <span key={bubble.text} className={`how-insight-bubble ${bubble.className}`}>
            {bubble.text}
          </span>
        ))}
      </div>

      <Motion.div
        className="section-shell path-shell path-shell--quest"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="path-copy">
          <Motion.div variants={itemVariants}>
            <h2 className="how-headline">Practice that moves.</h2>
            <p className="how-subheadline">
              The Activity page is built around one clear loop: pick a stage, speak once, get feedback, and keep the journey moving.
            </p>
          </Motion.div>

          <Motion.div variants={itemVariants} className="apk-download-panel" aria-label="Download the Bigkas Android APK">
            <img src={apkIconPath} alt="" className="apk-download-b01" loading="lazy" aria-hidden="true" />
            <div className="apk-download-copy">
              <span className="apk-download-kicker">Android APK</span>
              <h3>Take B-01 with you.</h3>
              <p>Install Bigkas on Android and continue the same speaking loop from your phone.</p>
            </div>
            <a className="apk-download-button" href={apkDownloadPath} download="Bigkas.apk">
              <IoDownloadOutline aria-hidden="true" />
              <span>Download APK</span>
            </a>
          </Motion.div>
        </div>

        <div className="path-map quest-stack" aria-label="How Bigkas practice works">
          {processSteps.map((step, index) => (
            <Motion.article
              key={step.title}
              className="quest-step-card"
              variants={itemVariants}
              whileHover={{ y: -4, rotate: index === 1 ? 0 : index === 0 ? -1 : 1 }}
            >
              <div className="quest-step-number">0{index + 1}</div>
              <div className="quest-step-icon" aria-hidden="true">
                <step.icon />
              </div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </Motion.article>
          ))}
        </div>
      </Motion.div>

      <ScrollDownIndicator hidden={!showScrollIndicator} white />
    </section>
  );
}
