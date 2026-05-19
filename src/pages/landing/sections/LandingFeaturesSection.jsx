import { IoChatbubbleEllipses, IoEye, IoMic } from 'react-icons/io5';

const FEATURE_CARDS = [
  {
    tone: 'visual',
    icon: IoEye,
    title: 'Look steady',
    text: 'Read posture, eye contact, and facial tension so your delivery feels intentional instead of frozen.',
  },
  {
    tone: 'vocal',
    icon: IoMic,
    title: 'Sound clear',
    text: 'Track volume, pitch, and shakiness so your voice becomes easier to control with every run-through.',
  },
  {
    tone: 'verbal',
    icon: IoChatbubbleEllipses,
    title: 'Speak naturally',
    text: 'Review pronunciation and pacing cues that help listeners follow your message without extra effort.',
  },
];

export default function LandingFeaturesSection({
  featuresGridRef,
  featureCardIndex,
  goToPreviousFeatureCard,
  goToNextFeatureCard,
  goToFeatureCard,
}) {
  return (
    <section id="features" className="features-section lesson-features-section">
      <div className="section-shell lesson-features-shell">
        <div className="features-heading">
          <h2>Three feedback lanes, one speaking goal.</h2>
          <p className="features-subtitle">
            Bigkas keeps the feedback focused, readable, and easy to act on after each short practice session.
          </p>
        </div>

        <div ref={featuresGridRef} className="confidence-grid features-reveal lesson-feature-grid">
          {FEATURE_CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={`lesson-feature-card lesson-feature-card--${card.tone} ${
                  featureCardIndex === index ? 'is-mobile-active' : ''
                }`}
              >
                <div className="lesson-feature-icon" aria-hidden="true">
                  <Icon />
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>

        <div className="features-mobile-controls" aria-label="Feature cards controls">
          <button type="button" className="features-mobile-btn btn-alt features-mobile-btn-next" onClick={goToPreviousFeatureCard}>
            Prev
          </button>
          <div className="features-mobile-dots" aria-label="Feature card pagination">
            {FEATURE_CARDS.map((card, index) => (
              <button
                key={`${card.title}-dot`}
                type="button"
                className={`features-mobile-dot ${featureCardIndex === index ? 'is-active' : ''}`}
                onClick={() => goToFeatureCard(index)}
                aria-label={`Show ${card.title}`}
                aria-pressed={featureCardIndex === index}
              />
            ))}
          </div>
          <button type="button" className="features-mobile-btn btn-main features-mobile-btn-prev" onClick={goToNextFeatureCard}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
