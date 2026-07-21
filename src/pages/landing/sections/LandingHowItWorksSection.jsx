import { motion as Motion } from 'framer-motion';
import { IoChatbubbleEllipses, IoDownloadOutline, IoMic, IoRefresh } from 'react-icons/io5';
import ScrollDownIndicator from '../../../components/common/ScrollDownIndicator';

const apkDownloadPath = '/downloads/TalkTics.apk';
const apkIconPath = '/images/bigkas-apk-icon.png';

const workflowSteps = [
  {
    tone: 'choose',
    icon: IoChatbubbleEllipses,
    label: '01',
    title: 'Pick a mode',
    text: 'Open Journey, Randomizer, or Free Speech and choose the next prompt that fits your goal.',
  },
  {
    tone: 'record',
    icon: IoMic,
    label: '02',
    title: 'Speak once',
    text: 'Keep the task front and center while you make a short private attempt with B-01 nearby.',
  },
  {
    tone: 'improve',
    icon: IoRefresh,
    label: '03',
    title: 'Move forward',
    text: 'Your score, EXP, streak, and DONE state make the next retake or activity easy to see.',
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
    <section id="how-it-works" className="how-it-works-redesign landing-how-path-section" ref={howSectionRef}>
      <Motion.div
        className="section-shell landing-how-path-shell"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="landing-how-path-copy">
          <Motion.div variants={itemVariants}>
            <h2>Practice moves like a path.</h2>
            <p>
              Start with one small practice run, get a clear nudge from B-01, then continue to the next step without guessing
              what changed.
            </p>
          </Motion.div>

          <Motion.a
            variants={itemVariants}
            className="landing-how-apk landing-how-android-button"
            href={apkDownloadPath}
            download="TalkTics.apk"
            aria-label="Download TalkTics for Android"
          >
            <img src={apkIconPath} alt="" className="landing-how-apk-icon" loading="lazy" aria-hidden="true" />
            <div className="landing-how-apk-copy">
              <span>Android app</span>
              <strong>Download to Android</strong>
              <p>Install TalkTics on Android and continue the same speaking loop from your phone.</p>
            </div>
            <span className="landing-how-download" aria-hidden="true">
              <IoDownloadOutline aria-hidden="true" />
              <span>Download</span>
            </span>
          </Motion.a>
        </div>

        <div className="landing-how-path-map" aria-label="How TalkTics practice works">
          <div className="landing-how-path-line" aria-hidden="true" />
          {workflowSteps.map((step) => (
            <Motion.article
              key={step.title}
              className={`landing-how-path-node landing-how-path-node--${step.tone}`}
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <div className="landing-how-node-icon" aria-hidden="true">
                <step.icon />
              </div>
              <div className="landing-how-node-copy">
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </Motion.article>
          ))}
        </div>
      </Motion.div>

      <ScrollDownIndicator hidden={!showScrollIndicator} />
    </section>
  );
}
