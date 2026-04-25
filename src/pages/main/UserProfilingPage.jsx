import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import questionsData from '../../assets/data/profiling_questions.json';
import waveWebm from '../../assets/Sprites/Robot Animated/Wave-webm.webm';
import waveMp4 from '../../assets/Sprites/Robot Animated/Wave-mp4.mp4';
import robotReadyImage from '../../assets/Sprites/Robot/0015.webp';
import robotQuestionImage from '../../assets/Sprites/Robot/0012.webp';
import introVoice1 from '../../assets/Voices/Introductions/Intro 1.mp3';
import introVoice2 from '../../assets/Voices/Introductions/Intro 2.mp3';
import introVoice3 from '../../assets/Voices/Introductions/Intro 3.mp3';
import beforePretestingVoice from '../../assets/Voices/Profiling and Pre-Testing/Before pre-testing.mp3';
import './UserProfilingPage.css';

const QUESTIONS = questionsData;

const INITIAL_FORM = QUESTIONS.reduce((acc, question) => {
  acc[question.key] = question.type === 'multi' ? [] : '';
  return acc;
}, {});

const INTRO_MUTE_KEY = 'bigkas_profiling_intro_muted';

function getSpeakerLevelNumber(score) {
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

function scoreMap(answer, values = {}) {
  if (!answer) return values.defaultValue ?? 0;
  return values[answer] ?? values.defaultValue ?? 0;
}

function computeBaselineScore(form) {
  const ageScore = scoreMap(form.age, { 'Under 18': 0, '18–24': 2, '25–34': 2, '35–44': 2, '45–54': 2, '55 and above': 2 });
  const socialAnxietyScore = scoreMap(form.social_anxiety, { No: 12, Sometimes: 6, Yes: 0 });
  const vocalFluencyScore = scoreMap(form.vocal_fluency, { No: 14, Sometimes: 7, Yes: 0 });
  const vocalPresenceScore = scoreMap(form.vocal_presence, { No: 12, Sometimes: 6, Yes: 0 });
  const externalDynamicsScore = scoreMap(form.external_dynamics, { No: 12, Sometimes: 6, Yes: 0 });
  const adaptabilityScore = scoreMap(form.adaptability, { Yes: 10, Sometimes: 6, No: 2 });
  const nativeScore = scoreMap(form.native_speaker, { Yes: 8, No: 4 });

  const raw =
    15 +
    ageScore +
    socialAnxietyScore +
    vocalFluencyScore +
    vocalPresenceScore +
    externalDynamicsScore +
    adaptabilityScore +
    nativeScore +
    (form.gender === 'Prefer not to say' ? 0 : 1);

  return Math.max(20, Math.min(100, Math.round(raw)));
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

function UserProfilingPage() {
  const navigate = useNavigate();
  const { updateUserMetadata, isAdminAuthenticated } = useAuthContext();
  const introFirstMessage =
    "Hello! I'm B-01, your personal guide on this exciting journey to master public speaking.";
  const introSecondMessage =
    'Before we begin, we need to assess your current speaking level. This includes 9 short profiling questions and one small speaking pre-test. These tests ensure I can customize your experience and guide you smoothly throughout your entire journey!';
  const readyMessage =
    "Awesome! Since you're ready, let's jump right into your 9 profiling questions! And don't worry, you can answer every single one with a simple Yes, Sometimes, or No.";
  const outroFirstMessage = "You've made it to the final step! To wrap things up, let's try a quick Free Speech Pre-test.";
  const outroMissionMessage =
    "Speak for at least 30 seconds on the topic, 'Tell me about yourself.' Don't overthink it-just be you and let your voice lead the way!";
  const [screen, setScreen] = useState('intro');
  const [introStep, setIntroStep] = useState(0);
  const [typedIntroText, setTypedIntroText] = useState('');
  const [isIntroTypingDone, setIsIntroTypingDone] = useState(false);
  const [typedReadyText, setTypedReadyText] = useState('');
  const [isReadyTypingDone, setIsReadyTypingDone] = useState(false);
  const [typedOutroFirstText, setTypedOutroFirstText] = useState('');
  const [typedOutroMissionText, setTypedOutroMissionText] = useState('');
  const [isOutroTypingDone, setIsOutroTypingDone] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(INTRO_MUTE_KEY) === '1';
  });
  const introAudioRef = useRef(null);
  const stepTwoAudioRef = useRef(null);
  const readyAudioRef = useRef(null);
  const outroAudioRef = useRef(null);

  const totalSteps = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentIndex];
  const progress = Math.round(((currentIndex + 1) / totalSteps) * 100);

  const baselineScore = useMemo(() => computeBaselineScore(form), [form]);
  const baselineLevelNumber = useMemo(() => getSpeakerLevelNumber(baselineScore), [baselineScore]);
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  useEffect(() => {
    if (screen !== 'intro' || introStep !== 1) {
      return undefined;
    }

    setTypedIntroText('');
    setIsIntroTypingDone(false);

    let charIndex = 0;
    const typingInterval = window.setInterval(() => {
      charIndex += 1;
      setTypedIntroText(introSecondMessage.slice(0, charIndex));
      if (charIndex >= introSecondMessage.length) {
        window.clearInterval(typingInterval);
        setIsIntroTypingDone(true);
      }
    }, 12);

    return () => {
      window.clearInterval(typingInterval);
    };
  }, [introSecondMessage, introStep, screen]);

  useEffect(() => {
    if (screen !== 'ready') {
      return undefined;
    }

    setTypedReadyText('');
    setIsReadyTypingDone(false);

    let charIndex = 0;
    const typingInterval = window.setInterval(() => {
      charIndex += 1;
      setTypedReadyText(readyMessage.slice(0, charIndex));
      if (charIndex >= readyMessage.length) {
        window.clearInterval(typingInterval);
        setIsReadyTypingDone(true);
      }
    }, 12);

    return () => {
      window.clearInterval(typingInterval);
    };
  }, [readyMessage, screen]);

  useEffect(() => {
    if (screen !== 'outro') {
      return undefined;
    }

    setTypedOutroFirstText('');
    setTypedOutroMissionText('');
    setIsOutroTypingDone(false);

    let firstIndex = 0;
    let missionIndex = 0;
    let isFirstDone = false;
    const typingInterval = window.setInterval(() => {
      if (!isFirstDone) {
        firstIndex += 1;
        setTypedOutroFirstText(outroFirstMessage.slice(0, firstIndex));
        if (firstIndex >= outroFirstMessage.length) {
          isFirstDone = true;
        }
        return;
      }

      missionIndex += 1;
      setTypedOutroMissionText(outroMissionMessage.slice(0, missionIndex));
      if (missionIndex >= outroMissionMessage.length) {
        window.clearInterval(typingInterval);
        setIsOutroTypingDone(true);
      }
    }, 12);

    return () => {
      window.clearInterval(typingInterval);
    };
  }, [outroFirstMessage, outroMissionMessage, screen]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    introAudioRef.current = new Audio(introVoice1);
    stepTwoAudioRef.current = new Audio(introVoice2);
    readyAudioRef.current = new Audio(introVoice3);
    outroAudioRef.current = new Audio(beforePretestingVoice);

    const refs = [introAudioRef.current, stepTwoAudioRef.current, readyAudioRef.current, outroAudioRef.current];
    refs.forEach((audio) => {
      audio.preload = 'auto';
      audio.muted = false;
    });

    return () => {
      refs.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      introAudioRef.current = null;
      stepTwoAudioRef.current = null;
      readyAudioRef.current = null;
      outroAudioRef.current = null;
    };
  }, [beforePretestingVoice]);

  useEffect(() => {
    const refs = [introAudioRef.current, stepTwoAudioRef.current, readyAudioRef.current, outroAudioRef.current];
    refs.forEach((audio) => {
      if (!audio) return;
      audio.muted = isMuted;
      if (isMuted) {
        audio.pause();
      }
    });
  }, [isMuted]);

  useEffect(() => {
    if (isMuted) return;

    const playClip = (audioRef) => {
      if (!audioRef?.current) return;
      [introAudioRef.current, stepTwoAudioRef.current, readyAudioRef.current, outroAudioRef.current].forEach((audio) => {
        if (audio && audio !== audioRef.current) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    };

    if (screen === 'intro' && introStep === 0) {
      playClip(introAudioRef);
    } else if (screen === 'intro' && introStep === 1) {
      playClip(stepTwoAudioRef);
    } else if (screen === 'ready') {
      playClip(readyAudioRef);
    } else if (screen === 'outro') {
      playClip(outroAudioRef);
    }
  }, [introStep, isMuted, screen]);

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
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextQuestion = () => {
    setCurrentIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  };

  const handleSingleAnswerAndAdvance = async (questionKey, option) => {
    if (isSubmitting) return;
    const nextForm = { ...form, [questionKey]: option };
    setForm(nextForm);
    if (error) setError('');

    if (currentIndex >= totalSteps - 1) {
      await handleSubmit({ nextForm });
      return;
    }
    goToNextQuestion();
  };

  const handleSubmit = async ({ nextForm = null } = {}) => {
    if (isSubmitting) return;
    const workingForm = nextForm || form;
    const pendingQuestions = QUESTIONS.filter((question) => !isQuestionAnswered(question, workingForm[question.key]));

    if (pendingQuestions.length > 0) {
      setError('Please answer all questions before finishing profiling.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const payload = {
      speaker_profile: {
        completed_at: new Date().toISOString(),
        baseline_score: baselineScore,
        baseline_level_number: baselineLevelNumber,
        responses: { ...workingForm },
      },
      profiling_completed: true,
      onboarding_stage: 'profiling',
    };

    const result = await updateUserMetadata(payload);
    setIsSubmitting(false);

    if (!result?.success) {
      setError(result?.error || 'Failed to save your profile. Please try again.');
      return;
    }

    setScreen('outro');
  };

  const continueToPretest = async () => {
    if (isSubmitting) return;
    stopAllIntroAudios();
    setIsSubmitting(true);
    const result = await updateUserMetadata({ onboarding_stage: 'pretest' });
    setIsSubmitting(false);
    if (!result?.success) {
      setError(result?.error || 'Failed to continue to pre-test. Please try again.');
      return;
    }
    navigate(ROUTES.USER_PRETEST, { replace: true });
  };
  const canProceedQuestion = isQuestionAnswered(currentQuestion, form[currentQuestion.key]);

  const handleQuestionBack = () => {
    if (isSubmitting) return;
    if (currentIndex === 0) {
      setScreen('ready');
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
      await handleSubmit();
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
        [introAudioRef.current, stepTwoAudioRef.current, readyAudioRef.current, outroAudioRef.current].forEach((audio) => {
          if (!audio) return;
          audio.pause();
          audio.currentTime = 0;
        });
      }
      return next;
    });
  };

  const stopAllIntroAudios = () => {
    [introAudioRef.current, stepTwoAudioRef.current, readyAudioRef.current, outroAudioRef.current].forEach((audio) => {
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

    if (!isIntroTypingDone) {
      setTypedIntroText(introSecondMessage);
      setIsIntroTypingDone(true);
      return;
    }

    setScreen('ready');
  };

  const handleBackToIntro = () => {
    stopAllIntroAudios();
    setIntroStep(0);
    setTypedIntroText('');
    setIsIntroTypingDone(false);
    setTypedReadyText('');
    setIsReadyTypingDone(false);
    setTypedOutroFirstText('');
    setTypedOutroMissionText('');
    setIsOutroTypingDone(false);
    setScreen('intro');
  };

  const renderReadyMessage = () => {
    if (!isReadyTypingDone) return typedReadyText;
    return (
      <>
        Awesome! Since you&apos;re ready, let&apos;s jump right into your 9 profiling questions! And don&apos;t worry, you can answer
        every single one with a simple <strong>Yes</strong>, <strong>Sometimes</strong>, or <strong>No</strong>.
      </>
    );
  };

  if (isAdminAuthenticated) return null;

  return (
    <div className={`user-profiling-page ${screen !== 'questions' ? 'is-gate-screen' : ''}`}>
      {screen === 'intro' && (
        <section className="profiling-intro profiling-gate--pop">
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
              <p>{typedIntroText}</p>
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
              <video className="profiling-intro-video" autoPlay loop muted playsInline>
                <source src={waveWebm} type="video/webm" />
                <source src={waveMp4} type="video/mp4" />
              </video>
            </div>
            <div className="profiling-intro-audio-action">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                className={`profiling-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
              >
                {isMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === 'ready' && (
        <section className="profiling-intro profiling-gate--pop">
          <article
            className="profiling-intro-bubble profiling-intro-bubble--ready profiling-intro-bubble--ready-typing"
            aria-label="Ready message"
          >
            <p className="profiling-ready-text">
              <strong>B-01:</strong>
              <br />
              {renderReadyMessage()}
            </p>
            <div className="profiling-intro-actions profiling-intro-actions--split">
              <button
                type="button"
                className="profiling-ready-btn profiling-ready-btn--back"
                onClick={handleBackToIntro}
              >
                Back
              </button>
              <button
                type="button"
                className="profiling-ready-btn profiling-ready-btn--next"
                onClick={() => {
                  stopAllIntroAudios();
                  setScreen('questions');
                }}
                disabled={!isReadyTypingDone}
              >
                Next
              </button>
            </div>
          </article>

          <div className="profiling-intro-robot">
            <div className="profiling-intro-robot-media profiling-intro-robot-media--ready" aria-hidden="true">
              <img src={robotReadyImage} alt="" className="profiling-ready-image" />
            </div>
            <div className="profiling-intro-audio-action">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                className={`profiling-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
              >
                {isMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === 'questions' && (
        <section className="profiling-question-stage profiling-gate--pop">
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
              <button type="button" className="profiling-ready-btn profiling-ready-btn--back" onClick={handleQuestionBack}>
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
                    const isActive = Array.isArray(form[currentQuestion.key]) && form[currentQuestion.key].includes(option);
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
        </section>
      )}

      {screen === 'outro' && (
        <section className="profiling-intro profiling-intro--pretest profiling-gate--pop">
          <article
            className="profiling-intro-bubble profiling-intro-bubble--pretest profiling-intro-bubble--outro-typing"
            aria-label="Before pre-testing message"
          >
            <p className="profiling-pretest-text">
              <strong>B-01:</strong>
              <br />
              {typedOutroFirstText}
            </p>
            <p className="profiling-pretest-text profiling-pretest-text--mission">
              <strong>Your mission:</strong>
              <br />
              {typedOutroMissionText}
            </p>
            <div className="profiling-intro-actions profiling-intro-actions--end">
              <div className="profiling-submit-btn">
                <button type="button" onClick={continueToPretest} disabled={!isOutroTypingDone}>
                  Continue
                </button>
              </div>
            </div>
          </article>

          <div className="profiling-intro-robot">
            <div className="profiling-intro-robot-media profiling-intro-robot-media--ready" aria-hidden="true">
              <img src={robotReadyImage} alt="" className="profiling-ready-image" />
            </div>
            <div className="profiling-intro-audio-action">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                title={isMuted ? 'Unmute B-01 voice' : 'Mute B-01 voice'}
                className={`profiling-audio-toggle ${isMuted ? 'is-muted' : 'is-unmuted'}`}
              >
                {isMuted ? <FaVolumeMute aria-hidden="true" /> : <FaVolumeUp aria-hidden="true" />}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default UserProfilingPage;
