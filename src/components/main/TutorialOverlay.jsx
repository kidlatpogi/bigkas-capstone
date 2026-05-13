import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { getSpriteUrl, getVoiceUrl } from '../../utils/assetUtils';
import { useAuthContext } from '../../context/useAuthContext';

const defaultRobotImage = getSpriteUrl('Robot/0008-noBulb-inverted.png');
const tutorialVoice1 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3');
const tutorialVoice2 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3');
const tutorialVoice3 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3');
const tutorialVoice4 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 4_new.mp3');
const tutorialVoice5 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3');
const tutorialVoiceFinal = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial FINAL.mp3');
const defaultFinalRobotImage = getSpriteUrl('Robot/0002.webp');
import './TutorialOverlay.css';

/**
 * Isolated typing component to prevent parent re-renders on every character typing cycle
 */
const TypingText = memo(({ text, fullText, isDone, emphasis }) => {
  if (!isDone) return <>{text}</>;
  if (!emphasis) return <>{fullText}</>;

  const idx = fullText.indexOf(emphasis);
  if (idx < 0) return <>{fullText}</>;

  const before = fullText.slice(0, idx);
  const after = fullText.slice(idx + emphasis.length);

  return (
    <>
      {before}
      <strong className="tutorial-bubble-emphasis">{emphasis}</strong>
      {after}
    </>
  );
});

TypingText.displayName = 'TypingText';

function TutorialOverlay({
  isOpen,
  onClose,
  onFinish,
  steps = null,
  robotImage = defaultRobotImage,
  finalRobotImage = defaultFinalRobotImage,
  showAudioToggle = false,
}) {
  const { user, updateUserMetadata } = useAuthContext();
  const GLOBAL_MUTE_KEY = 'bigkas_global_audio_muted_v1';
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
        text: "'Voice Meter' This is for your Vocal analysis! Watch the soundbar dance as you speak to see your projection and emotional expression.",
        button: 'Next',
        targetElementId: 'tutorial-target-soundbar',
        emphasis: "'Voice Meter'",
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
  /** 0 = primary `text`; 1 = optional `textPart2` before advancing to the next step */
  const [stepTextSegment, setStepTextSegment] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Prioritize context/user preference if available
    if (user && typeof user.isAudioMuted === 'boolean') return user.isAudioMuted;
    return window.localStorage.getItem(GLOBAL_MUTE_KEY) === '1';
  });

  useEffect(() => {
    if (user && typeof user.isAudioMuted === 'boolean') {
      setIsMuted(user.isAudioMuted);
    }
  }, [user?.isAudioMuted]);

  const activeSpotlightRef = useRef(null);
  const companionContainerRef = useRef(null);
  const stepAudioRefs = useRef([]);
  const customVoiceRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  const [anchoredCompanionStyle, setAnchoredCompanionStyle] = useState(null);

  const activeStep = useMemo(() => tutorialSteps[currentStep], [tutorialSteps, currentStep]);

  const displayedStepText = useMemo(() => {
    if (!activeStep?.text) return '';
    if (activeStep.textPart2 && stepTextSegment === 1) {
      return activeStep.textPart2;
    }
    return activeStep.text;
  }, [activeStep, stepTextSegment]);

  const robotSrc = useMemo(() => {
    if (!activeStep) return robotImage;
    return activeStep.robot || (activeStep.id === 'step-final' ? finalRobotImage : robotImage);
  }, [activeStep, finalRobotImage, robotImage]);

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
    if (customVoiceRef.current) {
      customVoiceRef.current.pause();
      customVoiceRef.current.currentTime = 0;
      customVoiceRef.current = null;
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(GLOBAL_MUTE_KEY, next ? '1' : '0');
      }
      if (user?.id) {
        updateUserMetadata({ is_audio_muted: next }).catch(() => {});
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
      audio.preload = 'none'; // Changed from 'auto' to 'none' for Lighthouse performance
    });

    return () => {
      stopAllAudios();
      stepAudioRefs.current = [];
    };
  }, [shouldUseAudio]);

  useEffect(() => {
    stepAudioRefs.current.forEach((audio) => {
      if (!audio) return;
      audio.muted = isMuted;
      if (isMuted) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    if (customVoiceRef.current) {
      customVoiceRef.current.muted = isMuted;
      if (isMuted) {
        customVoiceRef.current.pause();
        customVoiceRef.current.currentTime = 0;
      }
    }

    if (!isMuted && isOpen && activeStep) {
      stopAllAudios();
      const voiceUrl =
        stepTextSegment === 1 && activeStep.voicePart2
          ? activeStep.voicePart2
          : stepTextSegment === 0 && activeStep.voice
            ? activeStep.voice
            : null;

      if (voiceUrl) {
        const audio = new Audio(voiceUrl);
        audio.muted = false;
        customVoiceRef.current = audio;
        audio.play().catch(() => {});
      } else if (shouldUseAudio) {
        const stepAudio = stepAudioRefs.current[currentStep];
        if (stepAudio) {
          stepAudio.muted = false;
          stepAudio.currentTime = 0;
          stepAudio.play().catch(() => {});
        }
      }
    }
  }, [isMuted, isOpen, activeStep, stepTextSegment, shouldUseAudio, currentStep]);

  useEffect(() => {
    if (isOpen) {
      clearAllSpotlights();
      setCurrentStep(0);
      setStepTextSegment(0);
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
    setStepTextSegment(0);
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen || !activeStep) return undefined;

    clearAllSpotlights();
    if (activeSpotlightRef.current) {
      activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
      activeSpotlightRef.current = null;
    }

    const targetId = activeStep.targetElementId;
    const isCustomTutorial = Array.isArray(steps) && steps.length > 0;
    const spotlightZIndex =
      isCustomTutorial && targetId === 'tutorial-target-home-journey' ? '4600' : '4500';
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
      if (activeSpotlightRef.current) {
        activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
        activeSpotlightRef.current.style.removeProperty('z-index');
        activeSpotlightRef.current = null;
      }
    };
  }, [isOpen, activeStep?.targetElementId]);

  useEffect(() => {
    if (!isOpen || !activeStep) {
      setAnchoredCompanionStyle(null);
      return undefined;
    }

    const shouldAnchorToTarget = activeStep.id === 'step-controls' || activeStep.id === 'step-soundbar' || activeStep.id === 'step-roadmap' || activeStep.id === 'step-practice';
    if (!shouldAnchorToTarget) {
      setAnchoredCompanionStyle(null);
      return undefined;
    }

    let frameId = 0;
    let retryTimer = 0;

    const updateAnchoredPosition = () => {
      const targetEl = activeStep.targetElementId ? document.getElementById(activeStep.targetElementId) : null;
      const companionEl = companionContainerRef.current;
      if (!targetEl || !companionEl) return false;

      const targetRect = targetEl.getBoundingClientRect();
      const companionRect = companionEl.getBoundingClientRect();
      const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      const extraGap = activeStep.id === 'step-roadmap' ? rootFontSize : 0;
      const gapPx = (rootFontSize * 2) + extraGap;
      const top = Math.max(8, targetRect.top - companionRect.height - gapPx);

      setAnchoredCompanionStyle({
        top: `${top}px`,
        bottom: 'auto',
        zIndex: 5100,
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
  }, [isOpen, activeStep?.id, activeStep?.targetElementId, stepTextSegment]);

  useEffect(() => {
    if (!isOpen || !activeStep) return undefined;

    setTypedText('');
    setIsTypingDone(false);
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    let charIndex = 0;
    const fullText = displayedStepText;
    typingIntervalRef.current = window.setInterval(() => {
      charIndex += 1;
      setTypedText(fullText.slice(0, charIndex));
      if (charIndex >= fullText.length) {
        if (typingIntervalRef.current) {
          window.clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTypingDone(true);
      }
    }, 12);

    if (!isMutedRef.current) {
      stopAllAudios();

      const voiceUrl =
        stepTextSegment === 1 && activeStep.voicePart2
          ? activeStep.voicePart2
          : stepTextSegment === 0 && activeStep.voice
            ? activeStep.voice
            : null;

      // 1. Step-specific voice (segment 0: voice; segment 1: voicePart2 when provided)
      if (voiceUrl) {
        const audio = new Audio(voiceUrl);
        audio.muted = false;
        customVoiceRef.current = audio;
        audio.play().catch((err) => console.warn('[TutorialOverlay] Custom voice play failed:', err));
      }
      // 2. Fallback to hardcoded pre-test tutorial voices
      else if (shouldUseAudio) {
        const stepAudio = stepAudioRefs.current[currentStep];
        if (stepAudio) {
          stepAudio.currentTime = 0;
          stepAudio.play().catch(() => {});
        }
      }
    }

    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      stopAllAudios();
    };
  }, [
    currentStep,
    isOpen,
    shouldUseAudio,
    activeStep?.id,
    activeStep?.voice,
    activeStep?.voicePart2,
    displayedStepText,
    stepTextSegment,
  ]);

  if (!isOpen || !activeStep) return null;

  const handleNext = () => {
    stopAllAudios();

    if (!isTypingDone) {
      setTypedText(displayedStepText);
      setIsTypingDone(true);
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      return;
    }

    if (activeStep.textPart2 && stepTextSegment === 0) {
      setStepTextSegment(1);
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

  return (
    <>
      <div className="tutorial-dark-bg" aria-hidden="true" />
      <section
        className={`tutorial-overlay-wrapper${Array.isArray(steps) && steps.length > 0 ? ' is-custom-tutorial' : ' is-default-tutorial'}${activeStep.id === 'step-controls' ? ' is-controls-step' : ''}${activeStep.id === 'step-soundbar' ? ' is-soundbar-step' : ''}${activeStep.id === 'step-final' ? ' is-final-step' : ''}${activeStep.robotClassName ? ` ${activeStep.robotClassName}` : ''}`}
        aria-label="Training tutorial overlay"
      >
        <div className="tutorial-companion-container" ref={companionContainerRef} style={anchoredCompanionStyle ?? undefined}>
          <img
            src={robotSrc}
            alt=""
            className="tutorial-robot-img"
            aria-hidden="true"
          />
          <article className="tutorial-speech-bubble">
            <div className="tutorial-bubble-title">{activeStep.title}</div>
            <p className="tutorial-bubble-text">
              <TypingText 
                text={typedText} 
                fullText={displayedStepText} 
                isDone={isTypingDone} 
                emphasis={stepTextSegment === 0 ? activeStep.emphasis : undefined} 
              />
            </p>
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

export default memo(TutorialOverlay);
