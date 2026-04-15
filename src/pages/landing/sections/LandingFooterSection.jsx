import { useState } from 'react';
import Button from '../../../components/common/Button';
import LegalModal from '../../../components/Legal/LegalModal';
import { TERMS_AND_CONDITIONS } from '../../../constants/legal/terms';
import { PRIVACY_POLICY } from '../../../constants/legal/privacy';
import { ROUTES } from '../../../utils/constants';

export default function LandingFooterSection({ navigateTo, onScrollToSection }) {
  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '', content: '' });

  const showPrivacy = () => {
    setLegalModal({ isOpen: true, title: 'Privacy Policy', content: PRIVACY_POLICY });
  };

  const showTerms = () => {
    setLegalModal({ isOpen: true, title: 'Terms & Conditions', content: TERMS_AND_CONDITIONS });
  };

  const showSupportPlaceholder = (label) => {
    if (typeof window !== 'undefined') {
      window.alert(`${label} page is coming soon.`);
    }
  };

  const closeLegal = () => {
    setLegalModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <>
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
              <button type="button" onClick={() => showSupportPlaceholder('Contact Us')}>Contact Us</button>
              <button type="button" onClick={() => showSupportPlaceholder('FAQ')}>FAQ</button>
            </div>

            <div className="landing-footer-col">
              <h5>Legal</h5>
              <button type="button" onClick={showPrivacy}>Privacy Policy</button>
              <button type="button" onClick={showTerms}>Terms of Service</button>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p>©2026 Bigkas. Built for better speaking</p>
        </div>
      </footer>
      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={closeLegal}
        title={legalModal.title}
        content={legalModal.content}
      />
    </>
  );
}