import graduationSpeech from '../../../assets/landing/GraduationSpeech.jpeg';
import Button from '../../../components/common/Button';
import ScrollDownIndicator from '../../../components/common/ScrollDownIndicator';
import { ROUTES } from '../../../utils/constants';

export default function LandingHeroSection({
  heroSectionRef,
  heroScrollProgress,
  navigateTo,
  onSeeHowItWorks,
}) {
  return (
    <section
      id="hero"
      ref={heroSectionRef}
      className={`hero-section ${heroScrollProgress > 0.12 ? 'hero-transition-active' : ''}`}
      style={{ '--hero-progress': heroScrollProgress }}
    >
      <div className="section-shell hero-shell">
        <div className="hero-visual">
          <img src={graduationSpeech} alt="Bigkas coach" className="hero-character" />
        </div>

        <div className="hero-copy">
          <h1 className="hero-title">
            <span className="hero-title-line1">Master the Stage,</span>
            <span className="hero-title-line2">Minus the Stage Fright</span>
          </h1>
          <div className="hero-info-pane">
            <p className="hero-body">
              Bigkas provides a private, judgment-free space for Filipino learners to practice speaking through acoustic biomarkers and computer vision.
            </p>
            <div className="hero-actions">
              <Button
                variant="ink"
                className="landing-btn--pill hero-cta hero-cta--forest-solid"
                onClick={() => navigateTo(ROUTES.REGISTER)}
              >
                Start Practicing - It&apos;s Free
              </Button>
              <Button
                variant="outline"
                className="landing-btn--pill hero-cta hero-cta--forest-outline"
                onClick={onSeeHowItWorks}
              >
                See How it Works
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ScrollDownIndicator hidden={heroScrollProgress > 0.08} />
    </section>
  );
}