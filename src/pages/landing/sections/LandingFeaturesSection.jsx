import Feature3DCard from '../../../components/common/Feature3DCard';

const FEATURE_CARDS = [
  {
    tone: 'visual',
    title: 'Visual',
    text: 'Uses computer vision to read your expressions, posture, and gestures. Bigkas helps your nonverbal signals match what you say so you look steady and intentional—not stiff or closed off.',
  },
  {
    tone: 'vocal',
    title: 'Vocal',
    text: 'Detects shakiness and uneven volume tied to anxiety. By tracking these acoustic cues, Bigkas steadies your pitch and loudness for a clearer, more grounded delivery.',
  },
  {
    tone: 'verbal',
    title: 'Verbal',
    text: 'Scores how clearly you pronounce words and phrases. You get specific feedback on sounds to tighten so listeners can follow you without strain.',
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
    <section id="features" className="features-section">
      <div className="section-shell features-shell">
        <div className="features-heading">
          <h2>The Anatomy of Confidence</h2>
          <p className="features-subtitle">Three layers of feedback on how you look, sound, and speak.</p>
        </div>

        <div ref={featuresGridRef} className="confidence-grid features-reveal">
          {FEATURE_CARDS.map((card, index) => (
            <div
              key={card.title}
              className={`feature-card-item ${featureCardIndex === index ? 'is-mobile-active' : ''}`}
            >
              <Feature3DCard tone={card.tone} title={card.title} text={card.text} />
            </div>
          ))}
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
