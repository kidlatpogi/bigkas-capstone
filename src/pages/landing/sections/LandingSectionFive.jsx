import PushButton from '../../../components/common/PushButton';
import { ROUTES } from '../../../utils/constants';

export default function LandingSectionFive({ navigateTo, onSeeHowItWorks }) {
  return (
    <section id="section-5" className="section-five-section">
      <div className="section-shell section-five-shell">
        <div className="section-five-content">
          <div className="section-five-copy">
            <h2 className="section-five-title">Start with one brave take.</h2>
            <p className="section-five-body">
              No audience. No pressure. Just a private speaking round, clear feedback, and B-01 keeping the next move
              easy to see.
            </p>
            <div className="section-five-actions">
              <PushButton
                bgColor="#ffffff"
                shadowColor="#c9f3dc"
                textColor="#047857"
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
        </div>
      </div>
    </section>
  );
}
