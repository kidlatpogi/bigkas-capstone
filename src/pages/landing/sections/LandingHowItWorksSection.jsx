import phoneAsset from '../../../assets/landing/Phone.png';
import ScrollDownIndicator from '../../../components/common/ScrollDownIndicator';
import Grainient from '../../auth/Grainient';

export default function LandingHowItWorksSection({ howSectionRef, revealStep, showScrollIndicator }) {
  return (
    <section id="how-it-works" className="how-it-works-section" ref={howSectionRef}>
      <div className="how-grainient-bg" aria-hidden="true">
        <Grainient
          color1="#5a7863"
          color2="#90ab8b"
          color3="#3c4952"
          timeSpeed={0.25}
          colorBalance={0.05}
          warpStrength={1}
          warpFrequency={2}
          warpSpeed={2.5}
          warpAmplitude={50}
          blendAngle={-25}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated
          contrast={1.2}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>
      <div className="section-shell how-it-works-shell">
        <div className="how-copy-overlay">
          <h2 className="how-copy-title">
            <span>Just You and the Mic.</span>
            <span>No Judgement. Just Data.</span>
          </h2>
          <p className="how-copy-body">
            Practice any activity from thesis defense to job interviews and receive an objective Speaking Confidence Score based on validated speech standards.
          </p>
        </div>

        <div className="how-phone-column" aria-hidden="true">
          <img src={phoneAsset} alt="" className="how-phone" />
          <div className="how-phone-copy">
            <h3>
              <span>Just You and the Mic.</span>
              <span>No Judgement.</span>
              <span>Just Data.</span>
            </h3>
            <p>
              Practice any activity from thesis defense to job interviews and receive an objective Speaking Confidence Score based on validated speech standards.
            </p>
          </div>
          <div className="how-cards-stack">
            <article className={`process-card ${revealStep >= 1 ? 'is-active' : ''}`}>
              <h3>Structured Activities</h3>
              <p>
                Choose from a library of tailored exercises-from 30-second "Elevator Pitches" to "Graduation Speech"-designed to stretch your vocal and visual range.
              </p>
            </article>

            <article className={`process-card ${revealStep >= 2 ? 'is-active' : ''}`}>
              <h3>Record and Analyze</h3>
              <p>
                As you perform, Bigkas's multi-modal engine tracks your facial muscle movements and your vocal stability using your device's camera and mic.
              </p>
            </article>

            <article className={`process-card ${revealStep >= 3 ? 'is-active' : ''}`}>
              <h3>Data-Drive Insights</h3>
              <p>
                Skip the "You did great!" fluff. Get an objective "Speaking Confidence Score" based on linguistic phoneme standards and non-verbal kinesics.
              </p>
            </article>

            <article className={`process-card ${revealStep >= 4 ? 'is-active' : ''}`}>
              <h3>Iterative Growth</h3>
              <p>
                Review your session highlights, see exactly where your voice wavered or your posture slumped, and jump back into an activity to try again.
              </p>
            </article>
          </div>
        </div>
      </div>

      <ScrollDownIndicator hidden={!showScrollIndicator} white={true} />
    </section>
  );
}