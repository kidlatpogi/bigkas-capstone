import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import questionsData from '../../assets/data/profiling_questions.json';
import waveWebm from '../../assets/Sprites/Robot Animated/Wave-webm.webm';
import waveMp4 from '../../assets/Sprites/Robot Animated/Wave-mp4.mp4';
import './UserProfilingPage.css';

const QUESTIONS = questionsData;

const INITIAL_FORM = QUESTIONS.reduce((acc, question) => {
  acc[question.key] = question.type === 'multi' ? [] : '';
  return acc;
}, {});

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

  const selectSingleAnswer = async (questionKey, option) => {
    if (isSubmitting) return;
    updateField(questionKey, option);
    if (currentIndex < totalSteps - 1) {
      setCurrentIndex((prev) => Math.min(totalSteps - 1, prev + 1));
      return;
    }
    await handleSubmit({ nextForm: { ...form, [questionKey]: option } });
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
      onboarding_stage: 'pretest',
    };

    const result = await updateUserMetadata(payload);
    setIsSubmitting(false);

    if (!result?.success) {
      setError(result?.error || 'Failed to save your profile. Please try again.');
      return;
    }

    setScreen('outro');
  };

  const continueToPretest = () => {
    navigate(ROUTES.USER_PRETEST, { replace: true });
  };

  if (isAdminAuthenticated) return null;

  return (
    <div className={`user-profiling-page ${screen !== 'questions' ? 'is-gate-screen' : ''}`}>
      {screen === 'intro' && (
        <section className="profiling-intro profiling-gate--pop">
          <article className="profiling-intro-bubble" aria-label="Welcome message">
            <p>
              Kumusta! I&apos;m <strong>B-01</strong>, your personal guide on this exciting journey to master public
              speaking with Bigkas.
            </p>
            <p>
              Before we begin, we need to assess your current speaking level. This includes 9 short profiling
              questions and one small speaking pre-test. These tests ensure I can customize your experience and guide
              you smoothly throughout your entire Bigkas journey!
            </p>
            <div className="profiling-intro-actions">
              <div className="profiling-submit-btn">
                <button type="button" onClick={() => setScreen('questions')}>
                  Continue
                </button>
              </div>
            </div>
          </article>
          <div className="profiling-intro-robot" aria-hidden="true">
            <video className="profiling-intro-video" autoPlay loop muted playsInline>
              <source src={waveWebm} type="video/webm" />
              <source src={waveMp4} type="video/mp4" />
            </video>
          </div>
        </section>
      )}

      {screen === 'questions' && (
      <div className="profiling-shell">
        <section className="profiling-survey-top">
          <div className="profiling-survey-nav">
            <button
              type="button"
              className="profiling-nav-arrow"
              onClick={goToPreviousQuestion}
              disabled={currentIndex === 0 || isSubmitting}
              aria-label="Previous question"
            >
              &#8249;
            </button>
            <button
              type="button"
              className="profiling-nav-arrow"
              onClick={goToNextQuestion}
              disabled={currentIndex >= totalSteps - 1 || isSubmitting}
              aria-label="Next question"
            >
              &#8250;
            </button>
          </div>
          <p className="profiling-survey-label">Survey name</p>
          <p className="profiling-survey-step">
            {String(currentIndex + 1).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}
          </p>
          <div className="profiling-survey-progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <h1>{currentQuestion.label}</h1>
          <p className="profiling-subtitle">
            {currentQuestion.type === 'multi' ? 'Select all that apply.' : 'Select one option to continue.'}
          </p>
        </section>

        <section className="profiling-card profiling-card--pop">
          <div className="profiling-question-list">
            <div className="profiling-question">
              <div className="profiling-question-row">
                <div className="profiling-question-left">
                  <p className="profiling-question-number">Question {currentIndex + 1}</p>
                  <h3>{currentQuestion.label}</h3>
                  <small>{currentQuestion.type === 'multi' ? 'Select all that apply' : 'Select one'}</small>
                </div>
                <div className="profiling-question-right">
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

                  {currentQuestion.type === 'single' && (
                    <div className={`profiling-options ${currentQuestion.options.length > 4 ? 'is-two-column' : ''}`}>
                      {currentQuestion.options.map((option, optionIndex) => {
                        const isActive = form[currentQuestion.key] === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`profiling-option ${isActive ? 'is-active' : ''}`}
                            onClick={() => selectSingleAnswer(currentQuestion.key, option)}
                          >
                            <span className="profiling-option-main">
                              <span className="profiling-option-badge">
                                {String.fromCharCode(65 + (optionIndex % 26))}
                              </span>
                              <span>{option}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.type === 'multi' && (
                    <div className={`profiling-options ${currentQuestion.options.length > 4 ? 'is-two-column' : ''}`}>
                      {currentQuestion.options.map((option, optionIndex) => {
                        const isActive = Array.isArray(form[currentQuestion.key]) && form[currentQuestion.key].includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`profiling-option ${isActive ? 'is-active' : ''}`}
                            onClick={() => toggleMultiValue(currentQuestion.key, option)}
                          >
                            <span className="profiling-option-main">
                              <span className="profiling-option-badge">
                                {String.fromCharCode(65 + (optionIndex % 26))}
                              </span>
                              <span>{option}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && <p className="profiling-error">{error}</p>}
        </section>
      </div>
      )}

      {screen === 'outro' && (
        <section className="profiling-gate profiling-gate--pop">
          <p className="profiling-gate-kicker">Almost there</p>
          <h1>Nearly there we will just make you complete 1 more test</h1>
          <p>
            You are all set. Complete the pre-test naturally so we can measure your true baseline performance.
          </p>
          <button type="button" className="profiling-primary" onClick={continueToPretest}>
            Continue
          </button>
        </section>
      )}
    </div>
  );
}

export default UserProfilingPage;
