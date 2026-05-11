import { motion } from 'framer-motion';
import ScrollDownIndicator from '../../../components/common/ScrollDownIndicator';

export default function LandingHowItWorksSection({ howSectionRef, showScrollIndicator }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } }
  };

  const processSteps = [
    {
      title: 'Structured Activities',
      text: 'Choose from a library of tailored exercises—from Elevator Pitches to Graduation Speeches.',
      delay: 0,
      x: -40,
      y: -40
    },
    {
      title: 'Record and Analyze',
      text: "Bigkas's multi-modal engine tracks your facial muscle movements and vocal stability.",
      delay: 0.2,
      x: 40,
      y: -40
    },
    {
      title: 'Data-Driven Insights',
      text: 'Get an objective Speaking Confidence Score based on linguistic and non-verbal standards.',
      delay: 0.4,
      x: -40,
      y: 40
    },
    {
      title: 'Iterative Growth',
      text: 'Review session highlights and jump back into an activity to try again and improve.',
      delay: 0.6,
      x: 40,
      y: 40
    }
  ];

  return (
    <section id="how-it-works" className="how-it-works-redesign" ref={howSectionRef}>
      <div className="how-bg-overlay" aria-hidden="true" />
      
      <motion.div 
        className="how-redesign-container"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="how-redesign-content">
          <motion.div variants={itemVariants} className="how-header">
            <h2 className="how-headline">
              Just You and <span>the Mic</span>
            </h2>
            <p className="how-subheadline">
              No Judgement. Just Data. Master the stage with objective feedback.
            </p>
          </motion.div>

          <div className="how-visual-center">
            {/* Center Visual - Laptop */}
            <motion.div 
              className="how-visual-wrap"
              animate={{ 
                y: [0, -12, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="how-visual-glow" />
              <img 
                src="https://assets.bigkas.site/Images/Laptop.webp" 
                srcSet="https://assets.bigkas.site/Images/Laptop.webp 1x"
                alt="Bigkas on Laptop" 
                className="how-visual-img" 
                loading="lazy"
                fetchPriority="high"
              />
            </motion.div>

            {/* Floating Cards */}
            <div className="how-floating-cards">
              {processSteps.map((step, i) => (
                <motion.div
                  key={i}
                  className={`how-step-card step-card-${i + 1}`}
                  initial={{ opacity: 0, scale: 0.8, x: step.x * 1.5, y: step.y * 1.5 }}
                  whileInView={{ opacity: 1, scale: 1, x: step.x, y: step.y, transition: { delay: step.delay, duration: 0.8, type: 'spring' } }}
                  viewport={{ once: true }}
                  animate={{
                    y: [step.y, step.y - 12, step.y],
                  }}
                  transition={{
                    duration: 4 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: step.delay
                  }}
                >
                  <div className="step-number">{i + 1}</div>
                  <div className="step-card-content">
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <ScrollDownIndicator hidden={!showScrollIndicator} white={true} />
    </section>
  );
}