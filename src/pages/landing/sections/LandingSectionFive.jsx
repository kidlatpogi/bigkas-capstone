import Button from '../../../components/common/Button';
import { ROUTES } from '../../../utils/constants';

export default function LandingSectionFive({ navigateTo }) {
  return (
    <section id="section-5" className="section-five-section">
      <div className="section-shell section-five-shell">
        <div className="section-five-content">
          <h2 className="section-five-title">Let's Hear Your Voice</h2>
          <p className="section-five-body">
            Connect with others who are working on their speaking skills behind the scenes. Practice as much as you want
            in a private space where nobody is judging you.
          </p>
          <Button variant="ink" className="section-five-cta landing-btn--pill" onClick={() => navigateTo(ROUTES.REGISTER)}>
            Get Started Now
          </Button>
        </div>
      </div>
    </section>
  );
}