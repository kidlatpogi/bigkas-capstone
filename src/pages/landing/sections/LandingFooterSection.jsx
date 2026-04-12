import Button from '../../../components/common/Button';
import { ROUTES } from '../../../utils/constants';

export default function LandingFooterSection({ navigateTo, onScrollToSection }) {
  return (
    <footer className="landing-footer" aria-label="Site footer">
      <div className="landing-footer-main">
        <div className="landing-footer-brand">
          <h4>Bigkas</h4>
          <p>
            Build your speaking skills in a safe space that
            gives instant feedback on how you perform.
          </p>
          <Button
            variant="ink"
            className="landing-footer-cta landing-btn--pill"
            onClick={() => navigateTo(ROUTES.REGISTER)}
          >
            Get Started
          </Button>
        </div>

        <div className="landing-footer-links">
          <div className="landing-footer-col">
            <h5>Site Map</h5>
            <button type="button" onClick={() => onScrollToSection('how-it-works')}>How It Works</button>
            <button type="button" onClick={() => onScrollToSection('features')}>Features</button>
            <button type="button" onClick={() => onScrollToSection('science')}>The Science</button>
          </div>

          <div className="landing-footer-col">
            <h5>Support</h5>
            <button type="button">Contact Us</button>
            <button type="button">FAQ</button>
          </div>

          <div className="landing-footer-col">
            <h5>Legal</h5>
            <button type="button">Privacy Policy</button>
            <button type="button">Terms of Service</button>
          </div>
        </div>
      </div>

      <div className="landing-footer-bottom">
        <p>©2026 Bigkas. Built for better speaking</p>
      </div>
    </footer>
  );
}