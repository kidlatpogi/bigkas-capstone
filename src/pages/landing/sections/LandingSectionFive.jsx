import PushButton from '../../../components/common/PushButton';
import { ROUTES } from '../../../utils/constants';
import b01Mascot from '../../../assets/Sprites/Robot/0001.webp';

const practiceSteps = [
  'Start a tiny practice streak',
  'Let B-01 guide your next round',
  'Walk in with a steadier voice',
];

export default function LandingSectionFive({ navigateTo, onSeeHowItWorks }) {
  return (
    <section id="section-5" className="section-five-section">
      <div className="section-shell section-five-shell">
        <div className="section-five-content">
          <div className="section-five-copy">
            <h2 className="section-five-title">Ready when you are.</h2>
            <p className="section-five-body">
              Start small, repeat often, and let B-01 keep the next step obvious. Your first private run-through only
              takes a minute.
            </p>
            <div className="section-five-actions">
              <PushButton
                bgColor="#059669"
                shadowColor="#047857"
                className="section-five-cta section-five-cta--push-primary"
                onClick={() => navigateTo(ROUTES.REGISTER)}
              >
                Start Practicing - It&apos;s Free
              </PushButton>
              <PushButton
                bgColor="#f18f01"
                shadowColor="#d97706"
                className="section-five-cta section-five-cta--push-secondary"
                onClick={onSeeHowItWorks}
              >
                See How it Works
              </PushButton>
            </div>
          </div>

          <div className="cta-mascot-panel">
            <img src={b01Mascot} alt="B-01 inviting you to practice" className="cta-b01-img" loading="lazy" />
            <div className="section-five-practice-loop" aria-label="How Bigkas practice works">
              {practiceSteps.map((step, index) => (
                <div className="section-five-step" key={step}>
                  <span className="section-five-step-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="section-five-step-text">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
