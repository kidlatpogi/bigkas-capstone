import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { getSpriteUrl, getVoiceUrl } from '../../utils/assetUtils';
import { useAuthContext } from '../../context/useAuthContext';
import './TutorialOverlay.css';

const defaultRobotImage = getSpriteUrl('Robot/0008-noBulb-inverted.png');
const tutorialVoice1 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3');
const tutorialVoice2 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3');
const tutorialVoice3 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3');
const tutorialVoice4 = 'https://assets.bigkas.site/Voices/Profiling%20and%20Pre-Testing/Pre-Testing%20Tutorial/pre-testing%20tutorial%204_new.mp3';
const tutorialVoice5 = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3');
const tutorialVoiceFinal = getVoiceUrl('Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial FINAL.mp3');
const defaultFinalRobotImage = getSpriteUrl('Robot/0002.webp');
const BIGKAS_LOGO_URL = 'https://assets.bigkas.site/Images/Bigkas-Logo.webp';
/** Home streak step: desktop copy references top-right; on narrow viewports the streak lives elsewhere. */
const HOME_STREAK_STEP_TEXT_MOBILE =
  "Your Streak counter tracks how many consecutive days you've practiced. Consistency is the true secret to mastering public speaking! Log in and complete a daily activity to keep the fire burning and watch that number grow.";
const HOME_STREAK_STEP_VOICE_MOBILE =
  'https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Streak-Counter.mp3';
const HOME_STREAK_STEP_VOICE_MOBILE_V2 =
  'https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Voice%202%20-%20Steak-Counter.mp3';
const soundbarPreviewBars = Array.from({ length: 32 }, (_, index) => index);

/**
 * Isolated typing component to prevent parent re-renders on every character
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

function TutorialOverlayMobile({
  isOpen,
  onClose,
  onFinish,
  onStepChange = undefined,
  steps = null,
  robotImage = defaultRobotImage,
  finalRobotImage = defaultFinalRobotImage,
  showAudioToggle = false,
  /** Mobile Activity home tour: close dashboard when spotlighting the journey map (`tutorial-target-home-journey`). */
  onCloseDashboard = undefined,
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

  const isCustomTutorial = Array.isArray(steps) && steps.length > 0;

  const [currentStep, setCurrentStep] = useState(0);
  /** 0 = `text`; 1 = optional `textPart2` before advancing to the next step */
  const [stepTextSegment, setStepTextSegment] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (user && typeof user.isAudioMuted === 'boolean') return user.isAudioMuted;
    return window.localStorage.getItem(GLOBAL_MUTE_KEY) === '1';
  });
  const [soundbarSpotlightRect, setSoundbarSpotlightRect] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsNarrowViewport(mq.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

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
  const dashboardFooterClickDoneRef = useRef(false);
  /** True after `isOpen` was true at least once this mount — avoids closing dashboard on initial closed render. */
  const tutorialSessionWasOpenRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  const [anchoredCompanionStyle, setAnchoredCompanionStyle] = useState(null);

  const activeStep = useMemo(() => tutorialSteps[currentStep], [tutorialSteps, currentStep]);

  const bubbleFullText = useMemo(() => {
    if (!activeStep?.text) return '';
    if (activeStep.textPart2 && stepTextSegment === 1) {
      return activeStep.textPart2;
    }
    if (isNarrowViewport && activeStep.id === 'step-streak') {
      return HOME_STREAK_STEP_TEXT_MOBILE;
    }
    return activeStep.text;
  }, [activeStep, isNarrowViewport, stepTextSegment]);

  const bubbleVoiceUrl = useMemo(() => {
    if (!activeStep) return null;
    if (isNarrowViewport && activeStep.id === 'step-streak') {
      const voicePref = localStorage.getItem('bigkas_b01_voice') || 'voice1';
      return voicePref === 'voice2' ? HOME_STREAK_STEP_VOICE_MOBILE_V2 : HOME_STREAK_STEP_VOICE_MOBILE;
    }
    if (stepTextSegment === 1 && activeStep.voicePart2) {
      return activeStep.voicePart2;
    }
    if (stepTextSegment === 1) {
      return null;
    }
    return activeStep.voice ?? null;
  }, [activeStep, isNarrowViewport, stepTextSegment]);

  const robotSrc = useMemo(() => {
    if (!activeStep) return robotImage;
    return activeStep.robot || (activeStep.id === 'step-final' ? finalRobotImage : robotImage);
  }, [activeStep, finalRobotImage, robotImage]);

  // Home steps 1–2: keep full B-01 robot art; streak step always uses Bigkas logo; other later steps use logo on narrow viewports
  const useRobotArtForHomeIntro =
    activeStep?.id === 'step-intro' || activeStep?.id === 'step-companion';
  const useLogoCompanion = Boolean(
    (!isCustomTutorial && isNarrowViewport && activeStep?.id !== 'step-final')
      || (
        isCustomTutorial
        && (activeStep?.id === 'step-streak' || (isNarrowViewport && !useRobotArtForHomeIntro))
      ),
  );

  const companionSrc = useMemo(() => {
    if (useLogoCompanion) return BIGKAS_LOGO_URL;
    return robotSrc;
  }, [useLogoCompanion, robotSrc]);

  const needsDashboardForSpotlight = Boolean(
    activeStep?.targetElementId === 'tutorial-target-home-streak'
      || activeStep?.targetElementId === 'tutorial-target-home-rank'
      || activeStep?.targetElementId === 'tutorial-target-home-practice',
  );

  /** Streak step: Bigkas modal scrim below spotlight; rank uses dashboard scrim only */
  const isStreakHomeStep = activeStep?.id === 'step-streak';

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

  const playAudio = (audio, label = 'B-01 voice') => {
    if (!audio) return;
    audio.muted = false;
    audio.currentTime = 0;
    audio.onerror = () => {
      console.warn(`[TutorialOverlayMobile] ${label} unavailable.`);
    };
    audio.play().catch((err) => {
      console.warn(`[TutorialOverlayMobile] ${label} play failed:`, err);
    });
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
      audio.preload = 'none';
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

  }, [isMuted]);

  useEffect(() => {
    if (isOpen) {
      tutorialSessionWasOpenRef.current = true;
      clearAllSpotlights();
      setCurrentStep(0);
      setStepTextSegment(0);
      return;
    }
    if (tutorialSessionWasOpenRef.current && onCloseDashboard && isCustomTutorial && isNarrowViewport) {
      onCloseDashboard();
    }
    tutorialSessionWasOpenRef.current = false;
    clearAllSpotlights();
    stopAllAudios();
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    if (activeSpotlightRef.current) {
      activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
      activeSpotlightRef.current.style.removeProperty('pointer-events');
      activeSpotlightRef.current = null;
    }
  }, [isOpen, onCloseDashboard, isCustomTutorial, isNarrowViewport]);

  useEffect(() => {
    setStepTextSegment(0);
    if (onStepChange && activeStep) {
      onStepChange({ step: activeStep, index: currentStep });
    }
  }, [currentStep, activeStep, onStepChange]);

  useEffect(() => {
    dashboardFooterClickDoneRef.current = false;
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen || !activeStep) return undefined;
    const tid = activeStep.targetElementId;
    if (tid !== 'tutorial-target-home-streak' && tid !== 'tutorial-target-home-rank' && tid !== 'tutorial-target-home-practice') {
      return undefined;
    }
    if (typeof document === 'undefined') return undefined;
    if (document.getElementById(tid)) return undefined;
    if (dashboardFooterClickDoneRef.current) return undefined;

    const footerSection = document.querySelector('.activity-mobile-dashboard-section');
    const btn = footerSection?.querySelector('button.activity-mobile-dashboard-btn');
    const label = btn?.textContent?.trim().toLowerCase();
    if (btn && label === 'dashboard') {
      btn.click();
      dashboardFooterClickDoneRef.current = true;
    }
    return undefined;
  }, [isOpen, activeStep?.id, activeStep?.targetElementId, currentStep]);

  useEffect(() => {
    if (!isOpen || !activeStep) return undefined;

    clearAllSpotlights();
    if (activeSpotlightRef.current) {
      activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
      activeSpotlightRef.current.style.removeProperty('z-index');
      activeSpotlightRef.current.style.removeProperty('pointer-events');
      activeSpotlightRef.current = null;
    }

    const targetId = activeStep?.targetElementId;
    const spotlightZIndex =
      isCustomTutorial && targetId === 'tutorial-target-home-journey' ? '4600' : '4800';
    const needsDashboard =
      targetId === 'tutorial-target-home-streak' || targetId === 'tutorial-target-home-rank' || targetId === 'tutorial-target-home-practice';
    const isJourney = targetId === 'tutorial-target-home-journey';
    const shouldDisableTargetClicks =
      targetId === 'tutorial-target-home-streak' || targetId === 'tutorial-target-home-rank' || targetId === 'tutorial-target-home-practice';
    const maxAttempts = (needsDashboard || isJourney) ? 48 : 6;
    const retryMs = (needsDashboard || isJourney) ? 80 : 60;

    let cancelled = false;
    let retryTimer = null;

    const applySpotlight = (attempt = 0) => {
      if (cancelled || !targetId) return;
      const nextEl = document.getElementById(targetId);
      if (nextEl) {
        const isJourneyTarget = targetId === 'tutorial-target-home-journey';
        const activeNode = isJourneyTarget ? nextEl.querySelector('.skyward-journey-node--active') : true;
        
        if (activeNode) {
          nextEl.classList.add('tutorial-spotlight-active');
          nextEl.style.setProperty('z-index', spotlightZIndex, 'important');
          if (shouldDisableTargetClicks) {
            nextEl.style.setProperty('pointer-events', 'none', 'important');
          }
          activeSpotlightRef.current = nextEl;
          if (targetId === 'tutorial-target-home-practice') {
            const scrollContainer = document.querySelector('.dashboard-overlay-scroll-content') || document.querySelector('.dashboard-overlay-content');
            if (scrollContainer) {
              try {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
              } catch (e) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
              }
              setTimeout(() => {
                if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
              }, 60);
            }
          } else if (isJourneyTarget) {
            try {
              const nodeToScroll = nextEl.querySelector('.skyward-journey-node--active');
              if (nodeToScroll) {
                nodeToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } catch (e) {}
          } else {
            try {
              nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {}
          }
          return;
        }
      }
      if (attempt >= maxAttempts) return;
      retryTimer = window.setTimeout(() => applySpotlight(attempt + 1), retryMs);
    };

    if (targetId) {
      applySpotlight(0);
    }

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      if (activeSpotlightRef.current) {
        activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
        activeSpotlightRef.current.style.removeProperty('z-index');
        activeSpotlightRef.current.style.removeProperty('pointer-events');
        activeSpotlightRef.current = null;
      }
    };
  }, [isOpen, activeStep?.targetElementId, isCustomTutorial]);

  useEffect(() => {
    if (!isOpen || activeStep?.targetElementId !== 'tutorial-target-soundbar') {
      setSoundbarSpotlightRect(null);
      return undefined;
    }

    let frameId = 0;

    const updateSoundbarRect = () => {
      frameId = window.requestAnimationFrame(() => {
        const targetEl = document.getElementById('tutorial-target-soundbar');
        if (!targetEl) {
          setSoundbarSpotlightRect(null);
          return;
        }

        const rect = targetEl.getBoundingClientRect();
        setSoundbarSpotlightRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      });
    };

    updateSoundbarRect();
    window.addEventListener('resize', updateSoundbarRect);
    window.addEventListener('scroll', updateSoundbarRect, true);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', updateSoundbarRect);
      window.removeEventListener('scroll', updateSoundbarRect, true);
      setSoundbarSpotlightRect(null);
    };
  }, [isOpen, activeStep?.targetElementId]);

  /* Home journey step: dashboard sheet covers the map — close it on narrow viewports only. */
  useEffect(() => {
    if (!isOpen || !isNarrowViewport || !isCustomTutorial || !onCloseDashboard) return undefined;
    if (activeStep?.targetElementId !== 'tutorial-target-home-journey') return undefined;
    onCloseDashboard();
    return undefined;
  }, [
    isOpen,
    isNarrowViewport,
    isCustomTutorial,
    activeStep?.targetElementId,
    currentStep,
    stepTextSegment,
    onCloseDashboard,
  ]);

  useEffect(() => {
    if (!isOpen || !activeStep) {
      setAnchoredCompanionStyle(null);
      return undefined;
    }

    const isDefaultMobileTopPinnedStep =
      !isCustomTutorial
      && isNarrowViewport
      && (activeStep.id === 'step-controls' || activeStep.id === 'step-soundbar');
    const shouldAnchorToTarget =
      !isDefaultMobileTopPinnedStep
      && (activeStep.id === 'step-controls'
        || activeStep.id === 'step-soundbar'
        || activeStep.id === 'step-roadmap'
        || activeStep.id === 'step-practice');
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
  }, [isOpen, activeStep?.id, activeStep?.targetElementId, stepTextSegment, isCustomTutorial, isNarrowViewport]);

  useEffect(() => {
    if (!isOpen || !activeStep) return undefined;

    setTypedText('');
    setIsTypingDone(false);
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    let charIndex = 0;
    const fullText = bubbleFullText;
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

      if (bubbleVoiceUrl) {
        const audio = new Audio(bubbleVoiceUrl);
        customVoiceRef.current = audio;
        playAudio(audio, 'Custom voice');
      } else if (shouldUseAudio) {
        const stepAudio = stepAudioRefs.current[currentStep];
        if (stepAudio) {
          playAudio(stepAudio, `Tutorial voice ${currentStep + 1}`);
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
  }, [currentStep, isOpen, shouldUseAudio, activeStep?.id, bubbleFullText, bubbleVoiceUrl, stepTextSegment]);

  if (!isOpen || !activeStep) return null;

  const handleNext = () => {
    stopAllAudios();

    if (!isTypingDone) {
      setTypedText(bubbleFullText);
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
        activeSpotlightRef.current.style.removeProperty('z-index');
        activeSpotlightRef.current.style.removeProperty('pointer-events');
        activeSpotlightRef.current = null;
      }
      onFinish?.();
      onClose?.();
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const overlaySectionClassName = `tutorial-overlay-wrapper${isCustomTutorial ? ' is-custom-tutorial' : ' is-default-tutorial'}${activeStep?.id === 'step-controls' ? ' is-controls-step' : ''}${activeStep?.id === 'step-soundbar' ? ' is-soundbar-step' : ''}${activeStep?.id === 'step-final' ? ' is-final-step' : ''}${activeStep?.id === 'step-rank' ? ' is-rank-step' : ''}${activeStep?.robotClassName ? ` ${activeStep.robotClassName}` : ''}`;

  const companionInner = (
    <>
      <div
        className="tutorial-companion-container"
        ref={companionContainerRef}
        style={needsDashboardForSpotlight ? { ...(anchoredCompanionStyle ?? {}), pointerEvents: 'auto' } : (anchoredCompanionStyle ?? undefined)}
      >
        {!useLogoCompanion ? (
          <img
            src={companionSrc}
            alt=""
            className="tutorial-robot-img"
            aria-hidden="true"
          />
        ) : null}
        <article className={`tutorial-speech-bubble${useLogoCompanion ? ' tutorial-speech-bubble--logo' : ''}`}>
          <div
            className={`tutorial-bubble-title${useLogoCompanion ? ' tutorial-bubble-title--with-brand' : ''}`}
          >
            {useLogoCompanion ? (
              <>
                <img
                  src={BIGKAS_LOGO_URL}
                  alt=""
                  className="tutorial-bubble-title-logo"
                  width={36}
                  height={36}
                />
                <span className="tutorial-bubble-title-label">{activeStep.title}</span>
              </>
            ) : (
              activeStep.title
            )}
          </div>
          <p className="tutorial-bubble-text">
            <TypingText
              text={typedText}
              fullText={bubbleFullText}
              isDone={isTypingDone}
              emphasis={stepTextSegment === 0 ? activeStep.emphasis : undefined}
            />
          </p>
          <div className="tutorial-bubble-footer">
            {showAudioToggle && (
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                className={`tutorial-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
              >
                {isMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
              </button>
            )}
            <button type="button" className="tutorial-bubble-btn" onClick={handleNext} disabled={!isTypingDone}>
              {activeStep.button}
            </button>
          </div>
        </article>
      </div>
    </>
  );

  const portalEl =
    needsDashboardForSpotlight && typeof document !== 'undefined'
      ? createPortal(
          <>
            {isStreakHomeStep ? (
              <div
                className="bigkas-modal-scrim bigkas-modal-scrim--no-enter tutorial-mobile-streak-scrim"
                aria-hidden="true"
                style={{
                  /* Below .dashboard-overlay-wrapper (z-index 2000) so streak stays visible; above base page */
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1800,
                  pointerEvents: 'none',
                  background: 'rgba(15, 23, 42, 0.5)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                }}
              />
            ) : null}
            <div
              className={overlaySectionClassName}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 7200,
                pointerEvents: 'none',
              }}
              aria-label="Training tutorial overlay"
            >
              {companionInner}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      {isOpen && isStreakHomeStep ? (
        <style>{`
          /*
           * Streak tutorial: scrim is portaled to document.body (z-index 1800). #root stacks as auto,
           * so the scrim paints above the whole app and hides the spotlight. Raise #root while this
           * step is open so dashboard content (including #tutorial-target-home-streak) stacks above the scrim.
           */
          #root {
            position: relative;
            z-index: 1850 !important;
          }
        `}</style>
      ) : null}
      {!needsDashboardForSpotlight ? <div className="tutorial-dark-bg" aria-hidden="true" /> : null}
      {soundbarSpotlightRect && (
        <div
          className="tutorial-soundbar-spotlight-clone"
          aria-hidden="true"
          style={{
            top: `${soundbarSpotlightRect.top}px`,
            left: `${soundbarSpotlightRect.left}px`,
            width: `${soundbarSpotlightRect.width}px`,
            height: `${soundbarSpotlightRect.height}px`,
          }}
        >
          <div className="tutorial-soundbar-preview-bars">
            {soundbarPreviewBars.map((barIndex) => (
              <span
                key={barIndex}
                style={{
                  '--bar-index': barIndex,
                  '--bar-height': `${18 + (barIndex % 8) * 9}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      <style>{`
        #tutorial-target-home-journey.tutorial-spotlight-active button {
          pointer-events: none !important;
          cursor: default !important;
        }
        .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble--logo::before,
        .tutorial-overlay-wrapper.is-default-tutorial .tutorial-speech-bubble--logo::before,
        .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-3 .tutorial-speech-bubble::before {
          display: none !important;
          content: none !important;
          border: none !important;
        }
        .tutorial-bubble-title--with-brand {
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          flex-wrap: nowrap !important;
          font-weight: 400 !important;
        }
        .tutorial-bubble-title-logo {
          width: 36px !important;
          height: 36px !important;
          object-fit: contain !important;
          flex-shrink: 0 !important;
          display: block !important;
        }
        .tutorial-bubble-title--with-brand .tutorial-bubble-title-label {
          font-family: 'Fredoka', sans-serif !important;
          font-weight: 400 !important;
          color: #059669 !important;
        }
        /* Mobile activity tutorial: logo mark + bubble; dashboard steps portal above sheets */
        @media (max-width: 768px) {
          /* Automatically suppress the tutorial's standalone dark background scrim whenever the dashboard sheet is actively open */
          body:has(.dashboard-overlay-wrapper) .tutorial-dark-bg,
          body.dashboard-overlay-open .tutorial-dark-bg {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          /* Ensure targeted elements inside the dashboard sheet elevate properly into the sheet's stacking context */
          .dashboard-overlay-content .tutorial-spotlight-active {
            position: relative !important;
            z-index: 5500 !important;
            background: #ffffff !important;
            border-radius: 20px !important;
            opacity: 1 !important;
            filter: none !important;
            box-shadow: 0 0 0 4px #34D399, 0 12px 36px rgba(0, 0, 0, 0.28) !important;
          }
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-scroll-content > *:not(.tutorial-spotlight-active),
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-header {
            opacity: 0.35 !important;
            filter: brightness(0.5) !important;
            pointer-events: none !important;
            transition: opacity 0.3s ease, filter 0.3s ease !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-companion-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 0.5rem !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(calc(100vw - clamp(16px, 6vw, 32px)), 54rem) !important;
            max-width: calc(100vw - 32px) !important;
            bottom: calc(clamp(104px, 18vh, 148px) + env(safe-area-inset-bottom, 0px)) !important;
            top: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-rank-step .tutorial-companion-container {
            top: calc(16px + 2rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
          }
          /* Home streak (activity step 3): pin speech bubble to top so the streak card stays visible below */
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-3 .tutorial-companion-container {
            top: calc(16px + 0.5rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
            left: 16px !important;
            transform: none !important;
            align-items: stretch !important;
            width: min(calc(100vw - 32px), 54rem) !important;
            max-width: calc(100vw - 32px) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-practice-step .tutorial-companion-container {
            top: calc(16px + 0.5rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
          }
          /* Roadmap: Positioned at bottom with 1rem gap above bottom navigation */
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-companion-container {
            top: auto !important;
            bottom: calc(64px + 1rem + env(safe-area-inset-bottom, 0px)) !important;
            gap: 0.5rem !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-speech-bubble {
            padding-bottom: 0.65rem !important;
          }
          /* New positioning for mute button inside bubble */
          .tutorial-bubble-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            gap: 12px !important;
            margin-top: 10px !important;
            clear: both !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle {
            position: relative !important;
            inset: auto !important;
            transform: none !important;
            flex-shrink: 0 !important;
            width: clamp(3rem, 5.5vw, 3.45rem) !important;
            height: clamp(3rem, 5.5vw, 3.45rem) !important;
            min-height: 44px !important;
            min-width: 44px !important;
            border-radius: 0.95rem !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle:hover {
            transform: translateY(2px) !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-unmuted:hover {
            box-shadow: #047857 0 3px 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-muted:hover {
            box-shadow: #B91C1C 0 3px 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle:active {
            transform: translateY(5px) !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-unmuted:active {
            box-shadow: #047857 0 0 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-muted:active {
            box-shadow: #B91C1C 0 0 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-bubble-btn {
            float: none !important;
            margin: 0 !important;
            flex: 0 0 auto !important;
          }

          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-bubble-text {
            max-height: min(26vh, 132px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            max-height: 76px !important;
            max-width: 148px !important;
            width: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble {
            order: 1 !important;
            z-index: 1301 !important;
            width: 100% !important;
            max-width: min(100%, 48rem) !important;
            margin: 0 !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial .tutorial-speech-bubble--logo {
            width: 100% !important;
            max-width: min(100%, 48rem) !important;
            margin: 0 !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial .tutorial-companion-container {
            align-items: stretch !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial.is-final-step .tutorial-companion-container {
            top: calc(clamp(96px, 15vh, 128px) + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(calc(100vw - 32px), 420px) !important;
            max-width: calc(100vw - 32px) !important;
            align-items: center !important;
            justify-content: flex-start !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial.is-final-step .tutorial-speech-bubble {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-1 .tutorial-speech-bubble,
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-2 .tutorial-speech-bubble {
            transform: translateY(8rem) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial:not(.is-activity-home-step-1):not(.is-activity-home-step-2) .tutorial-speech-bubble {
            transform: translateY(0) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble::before {
            left: 50% !important;
            top: auto !important;
            bottom: -12px !important;
            border-top: 12px solid #FDFDF9 !important;
            border-bottom: 0 !important;
            border-right: 12px solid transparent !important;
            border-left: 12px solid transparent !important;
            transform: translateX(-50%) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-robot-img.tutorial-robot-img--logo {
            order: 2 !important;
            width: auto !important;
            max-width: 180px !important;
            max-height: 64px !important;
            height: auto !important;
            object-fit: contain !important;
            filter: none !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            order: 2 !important;
            width: clamp(160px, 48vw, 280px) !important;
            height: auto !important;
            filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.18)) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-1 .tutorial-robot-img:not(.tutorial-robot-img--logo),
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-2 .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            order: 2 !important;
            width: clamp(320px, 85vw, 520px) !important;
            height: auto !important;
            filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.18)) !important;
          }
        }
      `}</style>
      {needsDashboardForSpotlight && portalEl ? (
        portalEl
      ) : (
        <section className={overlaySectionClassName} aria-label="Training tutorial overlay">
          {companionInner}
        </section>
      )}
    </>
  );
}

export default memo(TutorialOverlayMobile);
