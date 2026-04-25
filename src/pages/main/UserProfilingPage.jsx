import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import questionsData from '../../assets/data/profiling_questions.json';
import waveWebm from '../../assets/Sprites/Robot Animated/Wave-webm.webm';
import waveMp4 from '../../assets/Sprites/Robot Animated/Wave-mp4.mp4';
import robotReadyImage from '../../assets/Sprites/Robot/0015.webp';
import robotQuestionImage from '../../assets/Sprites/Robot/0020.webp';
import './UserProfilingPage.css';

const QUESTIONS = questionsData;

const INITIAL_FORM = QUESTIONS.reduce((acc, question) => {
  acc[question.key] = question.type === 'multi' ? [] : '';
  return acc;
}, {});

const INTRO_MUTE_KEY = 'bigkas_profiling_intro_muted';
const INTRO_VOICE_KEY = 'bigkas_profiling_intro_voice';
const INTRO_TTS = {
  pitch: 1.9,
  rate: 1.15,
  volume: 1.0,
};

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
  const [screen, setScreen] = useState('intro');
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(INTRO_MUTE_KEY) === '1';
  });

  const totalSteps = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentIndex];
  const progress = Math.round(((currentIndex + 1) / totalSteps) * 100);

  const baselineScore = useMemo(() => computeBaselineScore(form), [form]);
  const baselineLevelNumber = useMemo(() => getSpeakerLevelNumber(baselineScore), [baselineScore]);
  const introSpeech = useMemo(
    () => [
      "Hello! I'm B-01, your personal guide on this exciting journey to master public speaking with Bigkas.",
      'Before we begin, we need to assess your current speaking level. This includes 9 short profiling questions and one small speaking pre-test. These tests ensure I can customize your experience and guide you smoothly throughout your entire Bigkas journey!',
    ],
    []
  );
  const readySpeech = useMemo(
    () => [
      "B-01: Awesome! Since you're ready, let's jump right into your 9 profiling questions!",
      "And don't worry, you can answer every single one with a simple Yes, Sometimes, or No.",
    ],
    []
  );

  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  useEffect(() => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return undefined;
    }

    const screenSpeechMap = {
      intro: introSpeech,
      ready: readySpeech,
    };
    const linesToSpeak = screenSpeechMap[screen];
    if (!Array.isArray(linesToSpeak) || linesToSpeak.length === 0) {
      return undefined;
    }

    const pickFriendlyVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices?.length) return null;

      const normalized = voices.map((voice) => ({
        voice,
        id: `${voice.name} ${voice.lang}`.toLowerCase(),
      }));

      const storedVoiceName = window.localStorage.getItem(INTRO_VOICE_KEY);
      if (storedVoiceName) {
        const stored = voices.find((voice) => voice.name === storedVoiceName);
        if (stored) return stored;
      }

      const exactPriority = ['google us english', 'samantha', 'microsoft zira'];
      for (const target of exactPriority) {
        const match = normalized.find(({ id }) => id.includes(target));
        if (match) {
          window.localStorage.setItem(INTRO_VOICE_KEY, match.voice.name);
          return match.voice;
        }
      }

      const englishFallback = normalized.find(({ id }) => id.includes('english') || id.includes('en-us'));
      const resolved = englishFallback?.voice || voices[0];
      window.localStorage.setItem(INTRO_VOICE_KEY, resolved.name);
      return resolved;
    };

    const speakCurrentScreen = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(linesToSpeak.join(' '));
      utterance.voice = pickFriendlyVoice();
      utterance.rate = INTRO_TTS.rate;
      utterance.pitch = INTRO_TTS.pitch;
      utterance.volume = INTRO_TTS.volume;
      window.speechSynthesis.speak(utterance);
    };

    speakCurrentScreen();

    const handleVoicesChanged = () => {
      // Re-speak once voices are fully available in browsers that load them lazily.
      if (!window.speechSynthesis.speaking && !isMuted) {
        speakCurrentScreen();
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      window.speechSynthesis.cancel();
    };
  }, [introSpeech, isMuted, readySpeech, screen]);

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

  const selectSingleAnswer = (questionKey, option) => {
    if (isSubmitting) return;
    updateField(questionKey, option);
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
      if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  if (isAdminAuthenticated) return null;

  return (
    <div className={`user-profiling-page ${screen !== 'questions' ? 'is-gate-screen' : ''}`}>
      {screen === 'intro' && (
        <section className="profiling-intro profiling-gate--pop">
          <article className="profiling-intro-bubble" aria-label="Welcome message">
            <p>
              Hello! I&apos;m <strong>B-01</strong>, your personal guide on this exciting journey to master public
              speaking with Bigkas.
            </p>
            <p>
              Before we begin, we need to assess your current speaking level. This includes 9 short profiling
              questions and one small speaking pre-test. These tests ensure I can customize your experience and guide
              you smoothly throughout your entire Bigkas journey!
            </p>
            <div className="profiling-intro-actions">
              <div className="profiling-submit-btn">
                <button type="button" onClick={() => setScreen('ready')}>
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
          <article className="profiling-intro-bubble profiling-intro-bubble--ready" aria-label="Ready message">
            <p className="profiling-ready-text">
              <strong>B-01:</strong>
              <br />
              Awesome! Since you&apos;re ready, let&apos;s jump right into your 9 profiling questions! And don&apos;t worry,
              you can answer every single one with a simple <strong>Yes</strong>, <strong>Sometimes</strong>, or
              <strong> No</strong>.
            </p>
            <div className="profiling-intro-actions profiling-intro-actions--split">
              <button
                type="button"
                className="profiling-ready-btn profiling-ready-btn--back"
                onClick={() => setScreen('intro')}
              >
                Back
              </button>
              <button
                type="button"
                className="profiling-ready-btn profiling-ready-btn--next"
                onClick={() => setScreen('questions')}
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
                Back
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
                        onClick={() => selectSingleAnswer(currentQuestion.key, option)}
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
        <section className="profiling-intro profiling-gate--pop">
          <article className="profiling-intro-bubble profiling-intro-bubble--pretest" aria-label="Before pre-testing message">
            <p className="profiling-pretest-text">
              <strong>B-01:</strong>
              <br />
              You&apos;ve made it to the final step! To wrap things up, let&apos;s try a quick Free Speech Pre-test.
            </p>
            <p className="profiling-pretest-text profiling-pretest-text--mission">
              <strong>Your mission:</strong>
              <br />
              Speak for at least <strong>30 seconds</strong> on the topic, <strong>&apos;Tell me about yourself.&apos;</strong> Don&apos;t
              overthink it-just be you and let your voice lead the way!
            </p>
            <div className="profiling-intro-actions profiling-intro-actions--end">
              <div className="profiling-submit-btn">
                <button type="button" onClick={continueToPretest}>
                  Continue
                </button>
              </div>
            </div>
          </article>

          <div className="profiling-intro-robot">
            <div className="profiling-intro-robot-media profiling-intro-robot-media--ready" aria-hidden="true">
              <img src={robotReadyImage} alt="" className="profiling-ready-image" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default UserProfilingPage;
