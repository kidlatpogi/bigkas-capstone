import { motion as Motion } from 'framer-motion';
import { IoChatbubbleEllipses, IoMic, IoRefresh, IoSparkles } from 'react-icons/io5';
import ScrollDownIndicator from '../../../components/common/ScrollDownIndicator';
import b01Mascot from '../../../assets/Sprites/Robot/0001.webp';

const processSteps = [
  {
    icon: IoChatbubbleEllipses,
    title: 'Choose a prompt',
    text: 'Start with a tiny speaking quest that matches your real goal.',
  },
  {
    icon: IoMic,
    title: 'Do one run',
    text: 'Record a short private attempt while B-01 keeps the next move clear.',
  },
  {
    icon: IoRefresh,
    title: 'Try it sharper',
    text: 'Use the feedback, repeat the round, and feel the delivery settle.',
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
      <Motion.div
        className="section-shell path-shell path-shell--quest"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="path-copy">
          <Motion.div variants={itemVariants}>
            <h2 className="how-headline">A practice loop that actually moves.</h2>
            <p className="how-subheadline">
              No giant lesson wall. Pick one speaking quest, run it once, get a useful nudge, then come back better.
            </p>
          </Motion.div>

          <Motion.div variants={itemVariants} className="practice-loop-card" aria-label="Bigkas practice loop">
            <div className="practice-loop-orbit" aria-hidden="true">
              <span>1</span>
              <span>2</span>
              <span>3</span>
            </div>
            <img src={b01Mascot} alt="B-01 practice guide" className="practice-loop-b01" loading="lazy" />
            <div className="practice-loop-copy">
              <IoSparkles aria-hidden="true" />
              <h3>B-01 keeps it light</h3>
              <p>Short prompts, quick restarts, and feedback that sounds like a next step.</p>
            </div>
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
          <Motion.div className="quest-finish-banner" variants={itemVariants}>
            <span>Repeatable, private, low-pressure.</span>
          </Motion.div>
        </div>
      </Motion.div>

      <ScrollDownIndicator hidden={!showScrollIndicator} white />
    </section>
  );
}
