import PushButton from '../../../components/common/PushButton';
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
          <img 
            src="https://assets.bigkas.site/Images/GraduationSpeech.jpeg" 
            srcSet="https://assets.bigkas.site/Images/GraduationSpeech.webp"
            alt="Bigkas coach" 
            className="hero-character" 
            fetchpriority="high" 
          />
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
              <PushButton
                bgColor="#059669"
                shadowColor="#047857"
                className="hero-cta hero-cta--push-primary"
                onClick={() => navigateTo(ROUTES.REGISTER)}
              >
                Start Practicing - It&apos;s Free
              </PushButton>
              <PushButton
                bgColor="#f18f01"
                shadowColor="#d97706"
                className="hero-cta hero-cta--push-secondary"
                onClick={onSeeHowItWorks}
              >
                See How it Works
              </PushButton>
            </div>
          </div>
        </div>
      </div>

      <ScrollDownIndicator hidden={heroScrollProgress > 0.08} />
    </section>
  );
}