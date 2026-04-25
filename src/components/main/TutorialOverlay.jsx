import { useEffect, useMemo, useRef, useState } from 'react';
import robotImage from '../../assets/Sprites/Robot/0008-noBulb-inverted.png';
import './TutorialOverlay.css';

function TutorialOverlay({ isOpen, onClose }) {
  const tutorialSteps = useMemo(
    () => [
      {
        id: 'step-intro',
        title: 'B-01:',
        text: "Before we jump in, let's do a quick walkthrough of how this works! Ready to get started?",
        button: 'Continue',
        targetElementId: null,
      },
      {
        id: 'step-topic',
        title: 'B-01:',
        text: "'The Topic' This is your prompt! Focus on the subject shown here to keep your speech on track.",
        button: 'Continue',
        targetElementId: 'tutorial-target-topic',
      },
      {
        id: 'step-camera',
        title: 'B-01:',
        text: "'The Camera View', Check your posture and expression in this frame—confidence starts with how you carry yourself!",
        button: 'Next',
        targetElementId: 'tutorial-target-camera',
      },
      {
        id: 'step-soundbar',
        title: 'B-01:',
        text: "'Voice and Time', Watch the soundbar dance as you speak and keep an eye on the timer to hit your goal.",
        button: 'Next',
        targetElementId: 'tutorial-target-soundbar',
      },
      {
        id: 'step-controls',
        title: 'B-01:',
        text: "'The Controls', Use Start to begin, Pause if you need a breather, or Restart to try the topic again from the top!",
        button: 'Next',
        targetElementId: 'tutorial-target-controls',
      },
    ],
    []
  );
  const [currentStep, setCurrentStep] = useState(0);
  const activeSpotlightRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      return;
    }
    if (activeSpotlightRef.current) {
      activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
      activeSpotlightRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (activeSpotlightRef.current) {
      activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
      activeSpotlightRef.current = null;
    }

    const step = tutorialSteps[currentStep];
    const targetId = step?.targetElementId;
    if (targetId) {
      const nextEl = document.getElementById(targetId);
      if (nextEl) {
        nextEl.classList.add('tutorial-spotlight-active');
        activeSpotlightRef.current = nextEl;
      }
    }

    return () => {
      if (activeSpotlightRef.current) {
        activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
        activeSpotlightRef.current = null;
      }
    };
  }, [currentStep, isOpen, tutorialSteps]);

  if (!isOpen) return null;

  const activeStep = tutorialSteps[currentStep];
  if (!activeStep) return null;

  const handleNext = () => {
    const isLast = currentStep >= tutorialSteps.length - 1;
    if (isLast) {
      if (activeSpotlightRef.current) {
        activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
        activeSpotlightRef.current = null;
      }
      onClose?.();
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  return (
    <section className="tutorial-overlay-wrapper" aria-label="Training tutorial overlay">
      <div className="tutorial-dark-bg" aria-hidden="true" />
      <div className="tutorial-companion-container">
        <img src={robotImage} alt="" className="tutorial-robot-img" aria-hidden="true" />
        <article className="tutorial-speech-bubble">
          <div className="tutorial-bubble-title">{activeStep.title}</div>
          <p className="tutorial-bubble-text">{activeStep.text}</p>
          <button type="button" className="tutorial-bubble-btn" onClick={handleNext}>
            {activeStep.button}
          </button>
        </article>
      </div>
    </section>
  );
}

export default TutorialOverlay;
