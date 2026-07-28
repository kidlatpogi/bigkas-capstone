import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import questionsData from '../../assets/data/profiling_questions.json';
import { getAssetUrl, getSpriteUrl, getVoiceUrl } from '../../utils/assetUtils';

const waveWebm = getAssetUrl('Sprites/Robot Animated/Wave-webm.webm');
const waveMp4 = getAssetUrl('Sprites/Robot Animated/Wave-mp4.mp4');
const robotWaveImage = getSpriteUrl('Robot/0001.webp');
const robotQuestionImage = getSpriteUrl('Robot/0012.webp');

const introVoice1 = getVoiceUrl('Introductions/Intro 1.mp3');
const introVoice2 = getVoiceUrl('Introductions/Intro 2.mp3');
const introVoice3 = getVoiceUrl('Introductions/Intro 3.mp3');
const beforePretestingVoice = getVoiceUrl('Profiling and Pre-Testing/Before pre-testing.mp3');
const profilingQuestion1Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 1.mp3');
const profilingQuestion2Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 2.mp3');
const profilingQuestion3Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 3.mp3');
const profilingQuestion4Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 4.mp3');
const profilingQuestion5Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 5.mp3');
const profilingQuestion6Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 6.mp3');
const profilingQuestion7Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 7.mp3');
const profilingQuestion8Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 8.mp3');
const profilingQuestion9Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 9.mp3');
const profilingQuestion10Voice = getVoiceUrl('Profiling and Pre-Testing/Profiling Questions/Profiling Question 10.mp3');
const demographicGenderVoice = getVoiceUrl('Demographic/Gender.mp3');
const demographicAgeVoice = getVoiceUrl('Demographic/Age.mp3');
import './UserProfilingPage.css';

const QUESTIONS = questionsData;

const DEMOGRAPHIC_QUESTIONS = [
  {
    key: 'gender',
    label: 'Please specify your gender identity.',
    type: 'single',
    options: ['Male', 'Female', 'Others', 'Prefer not to say'],
  },
  {
    key: 'age_range',
    label: 'Which age group do you currently belong to?',
    type: 'single',
    options: ['16-17', '18-22', '23 and above'],
  },
];

const INITIAL_FORM = {
  gender: '',
  age_range: '',
  ...QUESTIONS.reduce((acc, question) => {
    acc[question.key] = question.type === 'multi' ? [] : '';
    return acc;
  }, {}),
};

const INTRO_MUTE_KEY = 'bigkas_profiling_intro_muted';
const DEVELOPER_PREVIEW_SESSION_KEY = 'bigkas_developer_onboarding_preview_v1';
const QUESTION_VOICE_SOURCES = [
  profilingQuestion1Voice,
  profilingQuestion2Voice,
  profilingQuestion3Voice,
  profilingQuestion4Voice,
  profilingQuestion5Voice,
  profilingQuestion6Voice,
  profilingQuestion7Voice,
  profilingQuestion8Voice,
  profilingQuestion9Voice,
  profilingQuestion10Voice,
];

function getSpeakerLevelNumber(score) {
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

function computeBaselineScore(form) {
  const scoring = { Yes: 2, Sometimes: 6, No: 10 };
  let total = 0;

  const keys = [
    'visual_eye_contact', 'visual_gestures', 'visual_energy', 'visual_posture',
    'vocal_projection', 'vocal_expression', 'vocal_pacing',
    'verbal_fillers', 'verbal_vocabulary', 'verbal_anxiety'
  ];

  keys.forEach((key) => {
    total += scoring[form[key]] || 0;
  });

  return Math.max(20, Math.min(100, Math.round(total)));
}

function isQuestionAnswered(question, value) {
  if (question.type === 'multi') {
    return Array.isArray(value) && value.length > 0;
  }
  if (question.type === 'number') {
    return String(value || '').trim().length > 0;
  }
  return String(value || '').trim().length > 0;
}

/**
 * Stable typewriter component. Keeping this outside UserProfilingPage prevents
 * parent state updates from remounting the animation after it completes.
 */
function Typewriter({ text, onComplete, delay = 18, charsPerTick = 2 }) {
  const [displayed, setDisplayed] = useState('');
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let index = 0;
    hasCompletedRef.current = false;

    if (!text) {
      hasCompletedRef.current = true;
      onCompleteRef.current?.();
      return undefined;
    }

    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + charsPerTick);
      setDisplayed(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }
    }, delay);

    return () => window.clearInterval(timer);
  }, [text, delay, charsPerTick]);

  return <>{displayed}</>;
}

function UserProfilingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateUserMetadata, user, isAdminAuthenticated } = useAuthContext();
  const isDeveloperPreview =
    location.state?.developerPreview === true ||
    (typeof window !== 'undefined' && window.sessionStorage.getItem(DEVELOPER_PREVIEW_SESSION_KEY) === '1');
  const introSecondMessage =
    'Before we begin, we need to assess your current Public Speaking Level. This includes 2 demographic questions, 10 short profiling questions and one small speaking pre-test. These tests ensure I can customize your experience and guide you smoothly throughout your entire journey!';
  const readyMessage =
    "Awesome! Since you're ready, let's jump right into your 10 profiling questions! And don't worry, you can answer every single one with a simple Yes, Sometimes, or No.";
  const [selectedVoice, setSelectedVoice] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('bigkas_b01_voice') || 'voice1';
    }
    return 'voice1';
  });

  const handleSelectVoice = (voiceKey) => {
    setSelectedVoice(voiceKey);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bigkas_b01_voice', voiceKey);
    }
  };

  const [screen, setScreen] = useState('voice_select');
  const [introStep, setIntroStep] = useState(0);
  const [isIntroTypingDone, setIsIntroTypingDone] = useState(false);
  const [isReadyTypingDone, setIsReadyTypingDone] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [demographicIndex, setDemographicIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileSaved, setIsProfileSaved] = useState(() => Boolean(user?.profilingCompleted && !isDeveloperPreview));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(INTRO_MUTE_KEY) === '1';
  });
  const audioMap = useRef({});
  const hasSubmittedProfileRef = useRef(false);

  const totalSteps = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentIndex] || QUESTIONS[0];

  const currentDemographicQuestion = DEMOGRAPHIC_QUESTIONS[demographicIndex] || DEMOGRAPHIC_QUESTIONS[0];
  const canProceedDemographic = currentDemographicQuestion
    ? isQuestionAnswered(currentDemographicQuestion, form[currentDemographicQuestion.key])
    : false;
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  useEffect(() => {
    if (user?.profilingCompleted && !isDeveloperPreview) {
      navigate(ROUTES.USER_PRETEST, { replace: true });
    }
  }, [user?.profilingCompleted, isDeveloperPreview, navigate]);

  /**
   * Helper to get or create an audio instance for a source
   */
  const getAudio = (src) => {
    if (!src) return null;
    if (!audioMap.current[src]) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.muted = isMuted;
      audioMap.current[src] = audio;
    }
    return audioMap.current[src];
  };

  /**
   * Preload audios for the current and next screen
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const toPreload = [];

    // Initial intro audios
    if (screen === 'intro') {
      toPreload.push(introVoice1, introVoice2);
      // Next potential step
      toPreload.push(demographicGenderVoice);
    }
    else if (screen === 'demographics') {
      toPreload.push(demographicGenderVoice, demographicAgeVoice);
      // Next potential step
      toPreload.push(introVoice3);
    }
    else if (screen === 'ready') {
      toPreload.push(introVoice3);
      // Preload first few questions
      toPreload.push(QUESTION_VOICE_SOURCES[0], QUESTION_VOICE_SOURCES[1]);
    }
    else if (screen === 'questions') {
      toPreload.push(QUESTION_VOICE_SOURCES[currentIndex]);
      if (currentIndex + 1 < QUESTION_VOICE_SOURCES.length) {
        toPreload.push(QUESTION_VOICE_SOURCES[currentIndex + 1]);
      }
    }

    toPreload.forEach(src => getAudio(src));

    return () => {
      Object.values(audioMap.current).forEach((audio) => {
        if (!audio) return;
        audio.pause();
        audio.src = '';
        audio.load();
      });
      audioMap.current = {};
    };
  }, [screen, currentIndex, isMuted]);

  const playSample = (voiceKey) => {
    const sampleUrl = voiceKey === 'voice2'
      ? 'https://assets.bigkas.site/Voices/Voice%202%20-%20Sample.mp3'
      : 'https://assets.bigkas.site/Voices/Voice%201%20-%20Sample.mp3';
    stopAllIntroAudios();
    const audio = new Audio(sampleUrl);
    audio.muted = isMuted;
    audio.play().catch(() => { });
    audioMap.current[sampleUrl] = audio;
  };

  /**
   * BF-Cache & Resource Cleanup
   * Pauses all media when the page is hidden to allow the browser to cache the state.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        Object.values(audioMap.current).forEach(audio => audio?.pause());
        // Also find and pause any video elements
        const videos = document.querySelectorAll('video');
        videos.forEach(v => v.pause());
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, []);

  // Handle mute state across all active audios
  useEffect(() => {
    Object.values(audioMap.current).forEach((audio) => {
      if (!audio) return;
      audio.muted = isMuted;
      if (isMuted) {
        audio.pause();
      }
    });
  }, [isMuted]);

  useEffect(() => {
    if (isMuted) return;

    const playClip = (src) => {
      const audio = getAudio(src);
      if (!audio) return;

      Object.values(audioMap.current).forEach((a) => {
        if (a && a !== audio) {
          a.pause();
          a.currentTime = 0;
        }
      });

      audio.currentTime = 0;
      audio.play().catch(() => { });
    };

    if (screen === 'intro' && introStep === 0) {
      playClip(introVoice1);
    } else if (screen === 'intro' && introStep === 1) {
      playClip(introVoice2);
    } else if (screen === 'demographics') {
      playClip(demographicIndex === 0 ? demographicGenderVoice : demographicAgeVoice);
    } else if (screen === 'ready') {
      playClip(introVoice3);
    }
  }, [introStep, isMuted, screen, demographicIndex]);

  useEffect(() => {
    if (screen !== 'questions' || isMuted) return;
    const currentQuestionVoice = QUESTION_VOICE_SOURCES[currentIndex];
    const audio = getAudio(currentQuestionVoice);
    if (!audio) return;

    Object.values(audioMap.current).forEach((a) => {
      if (a && a !== audio) {
        a.pause();
        a.currentTime = 0;
      }
    });

    audio.currentTime = 0;
    audio.play().catch(() => { });
  }, [currentIndex, isMuted, screen]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const toggleMultiValue = (key, option) => {
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
    if (error) setError('');
  };

  const goToPreviousQuestion = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      setIsTransitioning(false);
    }, 400);
  };

  const goToNextQuestion = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => Math.min(totalSteps - 1, prev + 1));
      setIsTransitioning(false);
    }, 400);
  };

  const handleSingleAnswerAndAdvance = async (questionKey, option) => {
    if (isSubmitting || isTransitioning) return;
    const nextForm = { ...form, [questionKey]: option };
    setForm(nextForm);
    if (error) setError('');

    if (screen === 'demographics') {
      if (demographicIndex >= DEMOGRAPHIC_QUESTIONS.length - 1) {
        setTimeout(() => {
          setIsTransitioning(true);
          setTimeout(() => {
            setScreen('questions');
            setIsTransitioning(false);
          }, 400);
        }, 450);
        return;
      }
      setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setDemographicIndex((prev) => prev + 1);
          setIsTransitioning(false);
        }, 400);
      }, 450);
      return;
    }

    if (currentIndex >= totalSteps - 1) {
      setTimeout(async () => {
        await handleSubmit({ nextForm });
      }, 500);
      return;
    }

    setTimeout(() => {
      goToNextQuestion();
    }, 450);
  };

  const handleSubmit = async ({ nextForm = null } = {}) => {
    if (isSubmitting) return;

    // Use the provided form (for immediate updates) or the current state
    const workingForm = nextForm || form;

    // Identify exactly what is missing for better debugging and user feedback
    const pendingProfiling = QUESTIONS.filter((q) => !isQuestionAnswered(q, workingForm[q.key]));
    const pendingDemographics = DEMOGRAPHIC_QUESTIONS.filter((q) => !isQuestionAnswered(q, workingForm[q.key]));

    if (pendingProfiling.length > 0 || pendingDemographics.length > 0) {
      console.warn('[Profiling] Validation failed. Missing data:', {
        profiling: pendingProfiling.map(q => q.key),
        demographics: pendingDemographics.map(q => q.key),
        currentForm: workingForm
      });

      const missingLabels = [
        ...pendingDemographics.map(q => q.label.split('?')[0] + '?'),
        ...pendingProfiling.map(q => `Question ${QUESTIONS.findIndex(pq => pq.key === q.key) + 1}`)
      ];

      setError(`Please answer all questions before finishing. Missing: ${missingLabels.join(', ')}`);

      // If profiling questions are missing, jump to the first missing one
      if (pendingProfiling.length > 0) {
        const firstMissingIdx = QUESTIONS.findIndex(q => q.key === pendingProfiling[0].key);
        if (firstMissingIdx !== -1) {
          setCurrentIndex(firstMissingIdx);
          setScreen('questions');
        }
      } else if (pendingDemographics.length > 0) {
        // If demographics are missing, jump there
        const firstMissingDemIdx = DEMOGRAPHIC_QUESTIONS.findIndex(q => q.key === pendingDemographics[0].key);
        if (firstMissingDemIdx !== -1) {
          setDemographicIndex(firstMissingDemIdx);
          setScreen('demographics');
        }
      }

      return;
    }

    if (hasSubmittedProfileRef.current) return;

    hasSubmittedProfileRef.current = true;
    setError('');
    stopAllIntroAudios();
    setIsProfileSaved(false);
    setIsSubmitting(true);
    console.log('[Profiling] Validation passed. Submitting profile...');

    if (isDeveloperPreview) {
      setIsSubmitting(false);
      console.log('[Profiling] Developer preview mode: profile was not saved.');
      setIsProfileSaved(true);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('bigkas_current_training_session');
        window.sessionStorage.removeItem('bigkas_pretest_tutorial_seen');
      }
      navigate(ROUTES.USER_PRETEST, {
        replace: true,
        state: {
          developerPreview: true,
        },
      });
      return;
    }

    const submittedBaselineScore = computeBaselineScore(workingForm);
    const submittedBaselineLevelNumber = getSpeakerLevelNumber(submittedBaselineScore);
    const payload = {
      demographic_profile: {
        gender: workingForm.gender,
        age_range: workingForm.age_range,
        completed_at: new Date().toISOString(),
      },
      speaker_profile: {
        completed_at: new Date().toISOString(),
        baseline_score: submittedBaselineScore,
        baseline_level_number: submittedBaselineLevelNumber,
        responses: { ...workingForm },
      },
      profiling_completed: true,
      pretest_completed: false,
      pretest_scripted_completed: false,
      pretest_free_completed: false,
      pretest_completed_at: null,
      pretest_scripted_session_id: null,
      pretest_free_session_id: null,
      pretest_session_id: null,
      pretest_scripted_score: null,
      pretest_free_score: null,
      onboarding_completed: false,
      onboarding_level_analysis: null,
      onboarding_stage: 'pretest',
    };

    const result = await updateUserMetadata(payload);
    setIsSubmitting(false);

    if (!result?.success) {
      hasSubmittedProfileRef.current = false;
      setError(result?.error || 'Failed to save your profile. Please try again.');
      setScreen('questions');
      return;
    }

    console.log('[Profiling] Profile saved. Redirecting to pre-test...');
    setIsProfileSaved(true);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('bigkas_current_training_session');
      window.sessionStorage.removeItem('bigkas_pretest_tutorial_seen');
    }
    navigate(ROUTES.USER_PRETEST, { replace: true });
  };
  const canProceedQuestion = currentQuestion
    ? isQuestionAnswered(currentQuestion, form[currentQuestion.key])
    : false;

  const handleQuestionBack = () => {
    if (isSubmitting) return;
    if (screen === 'demographics') {
      if (demographicIndex === 0) {
        setScreen('intro');
        setIntroStep(1);
        return;
      }
      setIsTransitioning(true);
      setTimeout(() => {
        setDemographicIndex((prev) => prev - 1);
        setIsTransitioning(false);
      }, 400);
      return;
    }
    if (currentIndex === 0) {
      setScreen('demographics');
      setDemographicIndex(DEMOGRAPHIC_QUESTIONS.length - 1);
      return;
    }
    goToPreviousQuestion();
  };

  const handleQuestionNext = async () => {
    if (isSubmitting) return;
    stopAllIntroAudios();
    const currentValue = form[currentQuestion.key];
    if (!isQuestionAnswered(currentQuestion, currentValue)) {
      setError('Please select an answer before proceeding.');
      return;
    }

    if (currentIndex >= totalSteps - 1) {
      // Pass the current form explicitly to avoid stale state issues during quick clicks
      await handleSubmit({ nextForm: form });
      return;
    }
    setError('');
    goToNextQuestion();
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(INTRO_MUTE_KEY, next ? '1' : '0');
      }
      if (next) {
        Object.values(audioMap.current).forEach((audio) => {
          if (!audio) return;
          audio.pause();
          audio.currentTime = 0;
        });
      }
      return next;
    });
  };

  const stopAllIntroAudios = () => {
    Object.values(audioMap.current).forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
  };


  const handleIntroContinue = () => {
    stopAllIntroAudios();
    if (introStep === 0) {
      setIntroStep(1);
      return;
    }

    if (!isIntroTypingDone && introStep === 1) {
      setIsIntroTypingDone(true);
      return;
    }

    setScreen('demographics');
    setDemographicIndex(0);
  };

  const renderAudioToggle = (className = '') => (
    <div className={`profiling-intro-audio-action ${className}`.trim()}>
      <button
        type="button"
        onClick={handleToggleMute}
        aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
        title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
        className={`profiling-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
      >
        {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      </button>
    </div>
  );

  if (isAdminAuthenticated) return null;

  return (
    <div className={`user-profiling-page user-profiling-page--${screen} ${screen !== 'questions' ? 'is-gate-screen' : ''}`}>
      {screen === 'voice_select' && (
        <section className="profiling-intro profiling-gate--pop">
          <div className="profiling-unit">
            <article className="profiling-intro-bubble profiling-intro-bubble--voice-select" aria-label="Voice selection">
              <p>
                Welcome! Before we dive into mastering public speaking, let’s choose my voice. Listen to the samples below and select your favorite!
              </p>

              <div style={{ display: 'flex', gap: '20px', margin: '24px 0', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectVoice('voice1');
                    playSample('voice1');
                  }}
                  className={`profiling-voice-square-btn ${selectedVoice === 'voice1' ? 'is-selected' : 'is-unselected'}`}
                >
                  <Volume2 size={24} />
                  <span>Voice 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectVoice('voice2');
                    playSample('voice2');
                  }}
                  className={`profiling-voice-square-btn ${selectedVoice === 'voice2' ? 'is-selected' : 'is-unselected'}`}
                >
                  <Volume2 size={24} />
                  <span>Voice 2</span>
                </button>
              </div>

              <div className="profiling-intro-actions">
                <div className="profiling-submit-btn">
                  <button
                    type="button"
                    onClick={() => {
                      stopAllIntroAudios();
                      setScreen('intro');
                      setIntroStep(0);
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </article>
            <div className="profiling-intro-robot">
              <div className="profiling-intro-robot-media" aria-hidden="true">
                <img src={robotWaveImage} alt="B-01" className="profiling-ready-image" style={{ objectFit: 'contain', width: '100%', maxHeight: '42vh' }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'intro' && (
        <section className="profiling-intro profiling-gate--pop">
          <div className="profiling-unit">
            <article
              className={`profiling-intro-bubble ${introStep === 1 ? 'profiling-intro-bubble--intro-typing' : ''}`}
              aria-label="Welcome message"
            >
              {introStep === 0 ? (
                <p>
                  Hello! I&apos;m <strong>B-01</strong>, your personal guide on this exciting journey to master public
                  speaking.
                </p>
              ) : (
                <p>
                  {isIntroTypingDone ? (
                    introSecondMessage
                  ) : (
                    <Typewriter text={introSecondMessage} onComplete={() => setIsIntroTypingDone(true)} />
                  )}
                </p>
              )}
              <div className="profiling-intro-actions">
                <div className="profiling-submit-btn">
                  <button
                    type="button"
                    onClick={handleIntroContinue}
                    disabled={introStep === 1 && !isIntroTypingDone}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </article>
            <div className="profiling-intro-robot">
              <div className="profiling-intro-robot-media" aria-hidden="true">
                <img src={robotWaveImage} alt="B-01" className="profiling-ready-image" style={{ objectFit: 'contain', width: '100%', maxHeight: '42vh' }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'ready' && (
        <section className="profiling-intro profiling-gate--pop">
          <div className="profiling-unit">
            <article
              className="profiling-intro-bubble profiling-intro-bubble--ready profiling-intro-bubble--ready-typing"
              aria-label="Ready message"
            >
              <p className="profiling-ready-text">
                <strong>B-01:</strong>
                <br />
                {isReadyTypingDone ? (
                  <>
                    Awesome! Since you&apos;re ready, let&apos;s jump right into your 10 profiling questions! And
                    don&apos;t worry, you can answer every single one with a simple{' '}
                    <strong className="profiling-answer-yes">Yes</strong>,{' '}
                    <strong className="profiling-answer-sometimes">Sometimes</strong>, or{' '}
                    <strong className="profiling-answer-no">No</strong>.
                  </>
                ) : (
                  <Typewriter text={readyMessage} onComplete={() => setIsReadyTypingDone(true)} />
                )}
              </p>
              <div className="profiling-intro-actions">
                <div className="profiling-submit-btn">
                  <button
                    type="button"
                    onClick={() => {
                      stopAllIntroAudios();
                      setScreen('questions');
                    }}
                    disabled={!isReadyTypingDone}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </article>

            <div className="profiling-intro-robot">
              <div className="profiling-intro-robot-media profiling-intro-robot-media--ready" aria-hidden="true">
                <img src={robotWaveImage} alt="B-01" className="profiling-ready-image" style={{ objectFit: 'contain', width: '100%', maxHeight: '42vh' }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'demographics' && (
        <section className={`profiling-question-stage profiling-gate--pop ${isTransitioning ? 'is-transitioning' : ''}`}>
          <div className="profiling-unit">
            <article className="profiling-question-bubble">
              <h2 className="profiling-question-count">
                <span>Step:</span> {demographicIndex + 1}/{DEMOGRAPHIC_QUESTIONS.length}
              </h2>
              <p className="profiling-question-text">
                <strong>B-01:</strong>
                <br />
                {currentDemographicQuestion.label}
              </p>
              <div className="profiling-intro-actions profiling-intro-actions--split">
                <button
                  type="button"
                  className="profiling-ready-btn profiling-ready-btn--back"
                  onClick={handleQuestionBack}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="profiling-ready-btn profiling-ready-btn--next"
                  onClick={() => {
                    if (demographicIndex >= DEMOGRAPHIC_QUESTIONS.length - 1) {
                      setScreen('ready');
                      return;
                    }
                    setDemographicIndex((prev) => prev + 1);
                  }}
                  disabled={!canProceedDemographic}
                >
                  Next
                </button>
              </div>
            </article>

            <div className="profiling-question-lower">
              <div className="profiling-question-robot-wrap" aria-hidden="true">
                <img src={robotQuestionImage} alt="" className="profiling-question-robot-image" />
              </div>

              <div className={`profiling-question-options-wrap ${currentDemographicQuestion.options.length > 3 ? 'is-demographics' : ''}`}>
                <div className={`profiling-question-options ${currentDemographicQuestion.options.length > 3 ? 'is-demographics' : ''}`}>
                  {currentDemographicQuestion.options.map((option) => {
                    const isActive = form[currentDemographicQuestion.key] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`profiling-question-option ${isActive ? 'is-active' : ''}`}
                        onClick={() => handleSingleAnswerAndAdvance(currentDemographicQuestion.key, option)}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {error && <p className="profiling-error">{error}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'questions' && (
        <section className={`profiling-question-stage profiling-gate--pop ${isTransitioning ? 'is-transitioning' : ''}`}>
          <div className="profiling-unit">
            <article className="profiling-question-bubble">
              <h2 className="profiling-question-count">
                <span>Question:</span> {currentIndex + 1}/{totalSteps}
              </h2>
              <p className="profiling-question-text">
                <strong>B-01:</strong>
                <br />
                {currentQuestion.label}
              </p>
              <div className="profiling-intro-actions profiling-intro-actions--split">
                <button
                  type="button"
                  className="profiling-ready-btn profiling-ready-btn--back"
                  onClick={handleQuestionBack}
                  disabled={currentIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="profiling-ready-btn profiling-ready-btn--next"
                  onClick={handleQuestionNext}
                  disabled={!canProceedQuestion || isSubmitting}
                >
                  {currentIndex >= totalSteps - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </article>

            <div className="profiling-question-lower">
              <div className="profiling-question-robot-wrap" aria-hidden="true">
                <img src={robotQuestionImage} alt="" className="profiling-question-robot-image" />
              </div>

              <div className="profiling-question-options-wrap">
                {currentQuestion.type === 'single' && (
                  <div className="profiling-question-options">
                    {currentQuestion.options.map((option) => {
                      const isActive = form[currentQuestion.key] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`profiling-question-option ${isActive ? 'is-active' : ''}`}
                          onClick={() => handleSingleAnswerAndAdvance(currentQuestion.key, option)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'multi' && (
                  <div className="profiling-question-options">
                    {currentQuestion.options.map((option) => {
                      const isActive =
                        Array.isArray(form[currentQuestion.key]) && form[currentQuestion.key].includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`profiling-question-option ${isActive ? 'is-active' : ''}`}
                          onClick={() => toggleMultiValue(currentQuestion.key, option)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'number' && (
                  <input
                    className="profiling-input"
                    type="number"
                    min="1"
                    max="120"
                    value={form[currentQuestion.key]}
                    onChange={(e) => updateField(currentQuestion.key, e.target.value)}
                    placeholder={currentQuestion.placeholder}
                  />
                )}

                {error && <p className="profiling-error">{error}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {renderAudioToggle()}
    </div>
  );
}

export default UserProfilingPage;
