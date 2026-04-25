import { useEffect, useMemo, useRef, useState } from 'react';
import robotImage from '../../assets/Sprites/Robot/0008-noBulb-inverted.png';
import tutorialVoice1 from '../../assets/Voices/Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3';
import tutorialVoice2 from '../../assets/Voices/Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3';
import tutorialVoice3 from '../../assets/Voices/Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3';
import tutorialVoice4 from '../../assets/Voices/Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 4.mp3';
import tutorialVoice5 from '../../assets/Voices/Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3';
import { useInteraction } from '../../hooks/useInteraction';
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
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const activeSpotlightRef = useRef(null);
  const stepAudioRefs = useRef([]);
  const typingIntervalRef = useRef(null);
  const { playClick } = useInteraction();

  const stopAllAudios = () => {
    stepAudioRefs.current.forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
  };

  useEffect(() => {
    stepAudioRefs.current = [
      new Audio(tutorialVoice1),
      new Audio(tutorialVoice2),
      new Audio(tutorialVoice3),
      new Audio(tutorialVoice4),
      new Audio(tutorialVoice5),
    ];
    stepAudioRefs.current.forEach((audio) => {
      audio.preload = 'auto';
    });

    return () => {
      stopAllAudios();
      stepAudioRefs.current = [];
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      return;
    }
    stopAllAudios();
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
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

  useEffect(() => {
    if (!isOpen) return undefined;
    const activeStep = tutorialSteps[currentStep];
    if (!activeStep) return undefined;

    setTypedText('');
    setIsTypingDone(false);
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    let charIndex = 0;
    typingIntervalRef.current = window.setInterval(() => {
      charIndex += 1;
      setTypedText(activeStep.text.slice(0, charIndex));
      if (charIndex >= activeStep.text.length) {
        if (typingIntervalRef.current) {
          window.clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTypingDone(true);
      }
    }, 12);

    stopAllAudios();
    const stepAudio = stepAudioRefs.current[currentStep];
    if (stepAudio) {
      stepAudio.currentTime = 0;
      stepAudio.play().catch(() => {});
    }

    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      stopAllAudios();
    };
  }, [currentStep, isOpen, tutorialSteps]);

  if (!isOpen) return null;

  const activeStep = tutorialSteps[currentStep];
  if (!activeStep) return null;

  const renderTypedText = () => {
    if (!isTypingDone) return typedText;
    if (activeStep.id === 'step-topic') {
      return (
        <>
          <strong>'The Topic'</strong> This is your prompt! Focus on the subject shown here to keep your speech on track.
        </>
      );
    }
    if (activeStep.id === 'step-camera') {
      return (
        <>
          <strong>'The Camera View'</strong>, Check your posture and expression in this frame—confidence starts with how you carry
          yourself!
        </>
      );
    }
    if (activeStep.id === 'step-soundbar') {
      return (
        <>
          <strong>'Voice and Time'</strong>, Watch the soundbar dance as you speak and keep an eye on the timer to hit your goal.
        </>
      );
    }
    if (activeStep.id === 'step-controls') {
      return (
        <>
          <strong>'The Controls'</strong>, Use Start to begin, Pause if you need a breather, or Restart to try the topic again from
          the top!
        </>
      );
    }
    return typedText;
  };

  const handleNext = async () => {
    await playClick();
    stopAllAudios();

    if (!isTypingDone) {
      const currentText = tutorialSteps[currentStep]?.text || '';
      setTypedText(currentText);
      setIsTypingDone(true);
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      return;
    }

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
    <section
      className={`tutorial-overlay-wrapper${activeStep.id === 'step-controls' ? ' is-controls-step' : ''}`}
      aria-label="Training tutorial overlay"
    >
      <div className="tutorial-dark-bg" aria-hidden="true" />
      <div className="tutorial-companion-container">
        <img src={robotImage} alt="" className="tutorial-robot-img" aria-hidden="true" />
        <article className="tutorial-speech-bubble">
          <div className="tutorial-bubble-title">{activeStep.title}</div>
          <p className="tutorial-bubble-text">{renderTypedText()}</p>
          <button type="button" className="tutorial-bubble-btn" onClick={handleNext} disabled={!isTypingDone}>
            {activeStep.button}
          </button>
        </article>
      </div>
    </section>
  );
}

export default TutorialOverlay;
