import { useEffect, useMemo, useRef, useState } from 'react';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { getSpriteUrl, getVoiceUrl } from '../../utils/assetUtils';

const defaultRobotImage = getSpriteUrl('Robot/0008-noBulb-inverted.png');
const tutorialVoice1 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3');
const tutorialVoice2 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3');
const tutorialVoice3 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3');
const tutorialVoice4 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 4.mp3');
const tutorialVoice5 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3');
const tutorialVoiceFinal = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial FINAL.mp3');
const defaultFinalRobotImage = getSpriteUrl('Robot/0002.webp');
import './TutorialOverlay.css';

function TutorialOverlay({
  isOpen,
  onClose,
  onFinish,
  steps = null,
  robotImage = defaultRobotImage,
  finalRobotImage = defaultFinalRobotImage,
  showAudioToggle = false,
}) {
  const TUTORIAL_MUTE_KEY = 'bigkas_tutorial_overlay_muted_v1';
  const defaultSteps = useMemo(
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
        text: "'The Topic' This is for your Verbal analysis! Focus on the prompt shown here to ensure your content is clear and stays on track.",
        button: 'Continue',
        targetElementId: 'tutorial-target-topic',
        emphasis: "'The Topic'",
      },
      {
        id: 'step-camera',
        title: 'B-01:',
        text: "'The Camera View' This is for your Visual analysis! Position yourself within the guide so I can accurately track your eye contact, expressions, and gestures. Also, make sure you're in a well-lit room so I can see you clearly—good lighting makes for a great performance!",
        button: 'Next',
        targetElementId: 'tutorial-target-camera',
        emphasis: "'The Camera View'",
      },
      {
        id: 'step-soundbar',
        title: 'B-01:',
        text: "'Voice and Time' This is for your Vocal analysis! Watch the soundbar dance as you speak to see your projection and emotional expression.",
        button: 'Next',
        targetElementId: 'tutorial-target-soundbar',
        emphasis: "'Voice and Time'",
      },
      {
        id: 'step-controls',
        title: 'B-01:',
        text: "'The Controls', Use Start to begin, Pause if you need a breather, or Restart to try the topic again from the top!",
        button: 'Next',
        targetElementId: 'tutorial-target-controls',
        emphasis: "'The Controls'",
      },
      {
        id: 'step-final',
        title: 'B-01:',
        text: "Controls mastered! Yay! Whenever you're ready, click Start so I can hear what you've got. I'm so excited to listen!",
        button: 'BEGIN!',
        targetElementId: null,
      },
    ],
    []
  );
  const tutorialSteps = useMemo(
    () => (Array.isArray(steps) && steps.length > 0 ? steps : defaultSteps),
    [defaultSteps, steps],
  );
  const shouldUseAudio = useMemo(
    () => !(Array.isArray(steps) && steps.length > 0),
    [steps],
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(TUTORIAL_MUTE_KEY) === '1';
  });
  const activeSpotlightRef = useRef(null);
  const companionContainerRef = useRef(null);
  const stepAudioRefs = useRef([]);
  const typingIntervalRef = useRef(null);
  const [anchoredCompanionStyle, setAnchoredCompanionStyle] = useState(null);

  const clearAllSpotlights = () => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.tutorial-spotlight-active').forEach((el) => {
      el.classList.remove('tutorial-spotlight-active');
    });
  };

  const stopAllAudios = () => {
    stepAudioRefs.current.forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TUTORIAL_MUTE_KEY, next ? '1' : '0');
      }
      if (next) {
        stopAllAudios();
      }
      return next;
    });
  };

  useEffect(() => {
    if (!shouldUseAudio) {
      stepAudioRefs.current = [];
      return undefined;
    }
    stepAudioRefs.current = [
      new Audio(tutorialVoice1),
      new Audio(tutorialVoice2),
      new Audio(tutorialVoice3),
      new Audio(tutorialVoice4),
      new Audio(tutorialVoice5),
      new Audio(tutorialVoiceFinal),
    ];
    stepAudioRefs.current.forEach((audio) => {
      if (!audio) return;
      audio.preload = 'auto';
    });

    return () => {
      stopAllAudios();
      stepAudioRefs.current = [];
    };
  }, [shouldUseAudio]);

  useEffect(() => {
    if (!shouldUseAudio) return;
    stepAudioRefs.current.forEach((audio) => {
      if (!audio) return;
      audio.muted = isMuted;
      if (isMuted) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }, [isMuted, shouldUseAudio]);

  useEffect(() => {
    if (isOpen) {
      clearAllSpotlights();
      setCurrentStep(0);
      return;
    }
    clearAllSpotlights();
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

    clearAllSpotlights();
    if (activeSpotlightRef.current) {
      activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
      activeSpotlightRef.current = null;
    }

    const step = tutorialSteps[currentStep];
    const targetId = step?.targetElementId;
    const isCustomTutorial = Array.isArray(steps) && steps.length > 0;
    const spotlightZIndex =
      isCustomTutorial && targetId === 'tutorial-target-home-journey' ? '1280' : '950';
    let retryTimer = null;
    if (targetId) {
      const applySpotlight = (attempt = 0) => {
        const nextEl = document.getElementById(targetId);
        if (nextEl) {
          nextEl.classList.add('tutorial-spotlight-active');
          nextEl.style.setProperty('z-index', spotlightZIndex, 'important');
          activeSpotlightRef.current = nextEl;
          return;
        }
        if (attempt >= 4) return;
        retryTimer = window.setTimeout(() => applySpotlight(attempt + 1), 60);
      };
      applySpotlight(0);
    }

    return () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      clearAllSpotlights();
      if (activeSpotlightRef.current) {
        activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
        activeSpotlightRef.current.style.removeProperty('z-index');
        activeSpotlightRef.current = null;
      }
    };
  }, [currentStep, isOpen, steps, tutorialSteps]);

  useEffect(() => {
    if (!isOpen) {
      setAnchoredCompanionStyle(null);
      return undefined;
    }

    const step = tutorialSteps[currentStep];
    const shouldAnchorToTarget = step?.id === 'step-controls' || step?.id === 'step-soundbar';
    if (!shouldAnchorToTarget) {
      setAnchoredCompanionStyle(null);
      return undefined;
    }

    let frameId = 0;
    let retryTimer = 0;

    const updateAnchoredPosition = () => {
      const targetEl = step?.targetElementId ? document.getElementById(step.targetElementId) : null;
      const companionEl = companionContainerRef.current;
      if (!targetEl || !companionEl) return false;

      const targetRect = targetEl.getBoundingClientRect();
      const companionRect = companionEl.getBoundingClientRect();
      const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      const gapPx = rootFontSize * 2;
      const top = Math.max(8, targetRect.top - companionRect.height - gapPx);

      setAnchoredCompanionStyle({
        top: `${top}px`,
        bottom: 'auto',
        zIndex: 1100,
      });
      return true;
    };

    const scheduleUpdate = () => {
      frameId = window.requestAnimationFrame(() => {
        const positioned = updateAnchoredPosition();
        if (!positioned) {
          retryTimer = window.setTimeout(scheduleUpdate, 60);
        }
      });
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
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

    if (shouldUseAudio && !isMuted) {
      stopAllAudios();
      const stepAudio = stepAudioRefs.current[currentStep];
      if (stepAudio) {
        stepAudio.currentTime = 0;
        stepAudio.play().catch(() => {});
      }
    }

    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      if (shouldUseAudio) {
        stopAllAudios();
      }
    };
  }, [currentStep, isMuted, isOpen, shouldUseAudio, tutorialSteps]);

  if (!isOpen) return null;

  const activeStep = tutorialSteps[currentStep];
  if (!activeStep) return null;

  const handleNext = () => {
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
      onFinish?.();
      onClose?.();
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const renderBubbleText = () => {
    if (!isTypingDone) return typedText;

    const emphasis = activeStep?.emphasis;
    if (!emphasis) return typedText;
    const idx = typedText.indexOf(emphasis);
    if (idx < 0) return typedText;

    const before = typedText.slice(0, idx);
    const after = typedText.slice(idx + emphasis.length);
    return (
      <>
        {before}
        <strong className="tutorial-bubble-emphasis">{emphasis}</strong>
        {after}
      </>
    );
  };

  return (
    <>
      <div className="tutorial-dark-bg" aria-hidden="true" />
      <section
        className={`tutorial-overlay-wrapper${Array.isArray(steps) && steps.length > 0 ? ' is-custom-tutorial' : ' is-default-tutorial'}${activeStep.id === 'step-controls' ? ' is-controls-step' : ''}${activeStep.id === 'step-soundbar' ? ' is-soundbar-step' : ''}${activeStep.id === 'step-final' ? ' is-final-step' : ''}${activeStep.robotClassName ? ` ${activeStep.robotClassName}` : ''}`}
        aria-label="Training tutorial overlay"
      >
        <div className="tutorial-companion-container" ref={companionContainerRef} style={anchoredCompanionStyle ?? undefined}>
          <img
            src={activeStep.robot || (activeStep.id === 'step-final' ? finalRobotImage : robotImage)}
            alt=""
            className="tutorial-robot-img"
            aria-hidden="true"
          />
          <article className="tutorial-speech-bubble">
            <div className="tutorial-bubble-title">{activeStep.title}</div>
            <p className="tutorial-bubble-text">{renderBubbleText()}</p>
            <button type="button" className="tutorial-bubble-btn" onClick={handleNext} disabled={!isTypingDone}>
              {activeStep.button}
            </button>
          </article>
        </div>
        {showAudioToggle ? (
          <div className="tutorial-audio-action">
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
              title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
              className={`tutorial-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
            >
              {isMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}

export default TutorialOverlay;
