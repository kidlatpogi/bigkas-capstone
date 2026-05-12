import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
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
const BIGKAS_LOGO_URL = 'https://assets.bigkas.site/Images/Bigkas-Logo.webp';
import './TutorialOverlay.css';

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

  const isCustomTutorial = Array.isArray(steps) && steps.length > 0;

  const [currentStep, setCurrentStep] = useState(0);
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
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  const [anchoredCompanionStyle, setAnchoredCompanionStyle] = useState(null);

  const activeStep = useMemo(() => tutorialSteps[currentStep], [tutorialSteps, currentStep]);

  const robotSrc = useMemo(() => {
    if (!activeStep) return robotImage;
    return activeStep.robot || (activeStep.id === 'step-final' ? finalRobotImage : robotImage);
  }, [activeStep, finalRobotImage, robotImage]);

  // Home steps 1–2: keep full B-01 robot art; streak step always uses Bigkas logo; other later steps use logo on narrow viewports
  const useRobotArtForHomeIntro =
    activeStep?.id === 'step-intro' || activeStep?.id === 'step-companion';
  const useLogoCompanion = Boolean(
    isCustomTutorial
      && (activeStep?.id === 'step-streak' || (isNarrowViewport && !useRobotArtForHomeIntro)),
  );

  const companionSrc = useMemo(() => {
    if (useLogoCompanion) return BIGKAS_LOGO_URL;
    return robotSrc;
  }, [useLogoCompanion, robotSrc]);

  const needsDashboardForSpotlight = Boolean(
    activeStep?.targetElementId === 'tutorial-target-home-streak'
      || activeStep?.targetElementId === 'tutorial-target-home-rank',
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
    dashboardFooterClickDoneRef.current = false;
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen || !activeStep) return undefined;
    const tid = activeStep.targetElementId;
    if (tid !== 'tutorial-target-home-streak' && tid !== 'tutorial-target-home-rank') {
      return undefined;
    }
    if (typeof document === 'undefined') return undefined;
    if (document.getElementById(tid)) return undefined;
    if (dashboardFooterClickDoneRef.current) return undefined;

    const footerSection = document.querySelector('.activity-mobile-dashboard-section:not(.is-hidden)');
    const btn = footerSection?.querySelector('button.activity-mobile-dashboard-btn');
    const label = btn?.textContent?.trim().toLowerCase();
    if (btn && label === 'dashboard') {
      btn.click();
      dashboardFooterClickDoneRef.current = true;
    }
    return undefined;
  }, [isOpen, activeStep, currentStep]);

  useEffect(() => {
    if (!isOpen || !activeStep) return undefined;

    clearAllSpotlights();
    if (activeSpotlightRef.current) {
      activeSpotlightRef.current.classList.remove('tutorial-spotlight-active');
      activeSpotlightRef.current = null;
    }

    const targetId = activeStep.targetElementId;
    const isCustom = Array.isArray(steps) && steps.length > 0;
    const spotlightZIndex =
      isCustom && targetId === 'tutorial-target-home-journey' ? '4600' : '4800';
    const needsDashboard =
      targetId === 'tutorial-target-home-streak' || targetId === 'tutorial-target-home-rank';
    const maxAttempts = needsDashboard ? 48 : 6;
    const retryMs = needsDashboard ? 80 : 60;

    let cancelled = false;
    let retryTimer = null;

    const applySpotlight = (attempt = 0) => {
      if (cancelled || !targetId) return;
      const nextEl = document.getElementById(targetId);
      if (nextEl) {
        nextEl.classList.add('tutorial-spotlight-active');
        nextEl.style.setProperty('z-index', spotlightZIndex, 'important');
        activeSpotlightRef.current = nextEl;
        return;
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
        activeSpotlightRef.current = null;
      }
    };
  }, [activeStep, isOpen, steps]);

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
  }, [activeStep, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeStep) return undefined;

    setTypedText('');
    setIsTypingDone(false);
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    let charIndex = 0;
    const fullText = activeStep.text;
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

      if (activeStep.voice) {
        const audio = new Audio(activeStep.voice);
        audio.muted = false;
        customVoiceRef.current = audio;
        audio.play().catch((err) => console.warn('[TutorialOverlayMobile] Custom voice play failed:', err));
      } else if (shouldUseAudio) {
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
  }, [currentStep, isOpen, shouldUseAudio, activeStep]);

  if (!isOpen || !activeStep) return null;

  const handleNext = () => {
    stopAllAudios();

    if (!isTypingDone) {
      setTypedText(activeStep.text);
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

  const overlaySectionClassName = `tutorial-overlay-wrapper${isCustomTutorial ? ' is-custom-tutorial' : ' is-default-tutorial'}${activeStep.id === 'step-controls' ? ' is-controls-step' : ''}${activeStep.id === 'step-soundbar' ? ' is-soundbar-step' : ''}${activeStep.id === 'step-final' ? ' is-final-step' : ''}${activeStep.robotClassName ? ` ${activeStep.robotClassName}` : ''}`;

  const companionInner = (
    <>
      <div
        className="tutorial-companion-container"
        ref={companionContainerRef}
        style={needsDashboardForSpotlight ? { ...(anchoredCompanionStyle ?? {}), pointerEvents: 'auto' } : (anchoredCompanionStyle ?? undefined)}
      >
        {!isStreakHomeStep ? (
          <img
            src={companionSrc}
            alt=""
            className={`tutorial-robot-img${useLogoCompanion ? ' tutorial-robot-img--logo' : ''}`}
            aria-hidden="true"
          />
        ) : null}
        <article className="tutorial-speech-bubble">
          <div
            className={`tutorial-bubble-title${isStreakHomeStep ? ' tutorial-bubble-title--with-brand' : ''}`}
          >
            {isStreakHomeStep ? (
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
              fullText={activeStep.text}
              isDone={isTypingDone}
              emphasis={activeStep.emphasis}
            />
          </p>
          <button type="button" className="tutorial-bubble-btn" onClick={handleNext} disabled={!isTypingDone}>
            {activeStep.button}
          </button>
        </article>
      </div>
      {showAudioToggle ? (
        <div className="tutorial-audio-action" style={needsDashboardForSpotlight ? { pointerEvents: 'auto' } : undefined}>
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
    </>
  );

  const portalEl =
    needsDashboardForSpotlight && typeof document !== 'undefined'
      ? createPortal(
          <>
            {isStreakHomeStep ? (
              <div
                className="bigkas-modal-scrim tutorial-mobile-streak-scrim"
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
      {!needsDashboardForSpotlight ? <div className="tutorial-dark-bg" aria-hidden="true" /> : null}
      <style>{`
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
          /* Ensure targeted elements inside the dashboard sheet elevate properly into the sheet's stacking context */
          .dashboard-overlay-content .tutorial-spotlight-active {
            position: relative !important;
            z-index: 4800 !important;
            background: #ffffff !important;
            box-shadow: 0 0 0 5px #34D399, 0 0 42px rgba(52, 211, 153, 0.9) !important;
          }
          /* Dim the entire dashboard overlay container when a child element inside it is targeted by the spotlight */
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-content::after {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.82) !important;
            z-index: 4000 !important;
            border-radius: 32px 32px 0 0 !important;
            pointer-events: none !important;
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
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble {
            order: 1 !important;
            z-index: 1301 !important;
            width: 100% !important;
            max-width: min(100%, 48rem) !important;
            margin: 0 !important;
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
