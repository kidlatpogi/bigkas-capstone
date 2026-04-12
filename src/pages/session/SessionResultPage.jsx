import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';
import { getScoreTier, buildRoute, ROUTES } from '../../utils/constants';
import { getSessionMode, getSessionSpeechType } from '../../utils/sessionFormatting';
import BackButton from '../../components/common/BackButton';
import '../main/InnerPages.css';
import './SessionPages.css';

function scoreWord(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

function getMetricEffectivenessScore(metricKey, rawScore) {
  const clamped = Math.max(0, Math.min(100, Number(rawScore) || 0));
  if (metricKey === 'jitter' || metricKey === 'shimmer') {
    return 100 - clamped;
  }
  return clamped;
}

function buildReplayAction(session, navigate) {
  const mode = getSessionMode(session);
  const isPractice = mode === 'Practice';
  const isFree = getSessionSpeechType(session) === 'Free Speech';

  const setupRoute = isPractice ? ROUTES.PRACTICE : ROUTES.TRAINING_SETUP;
  const label = isPractice ? 'Practice Again' : 'Train Again';
  const focus = isFree ? 'free' : 'scripted';

  const replayState = {
    focus,
    sessionType: isPractice ? 'practice' : 'training',
    entryPoint: isPractice ? 'practice' : 'training',
    autoStartCountdown: true,
  };

  if (focus === 'scripted') {
    const content = session?.transcript || '';
    if (!content.trim()) {
      return { label, onClick: () => navigate(setupRoute) };
    }

    replayState.script = {
      id: session?.script_id || `replay-${session?.id || 'session'}`,
      title: session?.script_title || session?.title || `${mode} Script`,
      content,
    };
  } else {
    replayState.freeTopic = session?.transcript || 'Free speech session';
  }

  return {
    label,
    onClick: () => navigate(`${ROUTES.TRAINING}?autostart=1`, { state: replayState }),
  };
}

function shouldCelebrateScore(session) {
  const score = Number(session?.confidence_score ?? 0);
  if (!Number.isFinite(score) || score < 60) return false;

  const raw = [
    session?.session_mode,
    session?.mode,
    session?.session_type,
    session?.session_origin,
    session?.speaking_mode,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();

  const isPreTest = raw.includes('pre-test') || raw.includes('pretest');
  const isPracticeOrTraining = raw.includes('practice') || raw.includes('train') || raw.includes('training');
  return !isPreTest && isPracticeOrTraining;
}

function SessionResultPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { state } = useLocation();
  const { currentSession, fetchSessionById, isLoading } = useSessionContext();
  const { user } = useAuthContext();
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  const hasCompleteState = useMemo(() => {
    if (!state || typeof state !== 'object') return false;
    const sameSession = String(state?.id || '') === String(sessionId || '');
    if (!sameSession) return false;
    return Number.isFinite(Number(state?.confidence_score));
  }, [sessionId, state]);

  useEffect(() => {
    if (hasCompleteState) return;
    if (String(currentSession?.id || '') === String(sessionId || '')) return;
    fetchSessionById(sessionId);
  }, [currentSession, fetchSessionById, hasCompleteState, sessionId]);

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const result = useMemo(() => {
    if (hasCompleteState) return state;
    if (String(currentSession?.id || '') === String(sessionId || '')) {
      return currentSession;
    }
    return null;
  }, [currentSession, hasCompleteState, sessionId, state]);

  if (!result && isLoading) {
    return <div className="inner-page"><div className="page-loading">Loading...</div></div>;
  }

  if (!result) {
    return (
      <div className="inner-page">
        <div className="empty-state">
          <span className="empty-icon">&#9888;&#65039;</span>
          <p className="empty-title">Session not found</p>
          <button className="btn-primary" onClick={() => navigate(ROUTES.DASHBOARD)}>Go Home</button>
        </div>
      </div>
    );
  }

  const score = Number(result.confidence_score ?? 0);
  const roundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const tier = getScoreTier(roundedScore);
  const scoreDisplay = `${roundedScore}`;

  const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
  const rawMode = [
    result?.session_mode,
    result?.mode,
    result?.session_type,
    result?.session_origin,
    result?.speaking_mode,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();
  const isFreeSession = rawMode.includes('free');

  const pillars = [
    { key: 'facial', label: 'Facial Expression', value: result.facial_expression_score },
    { key: 'gesture', label: 'Gestures', value: result.gesture_score },
    { key: 'pronunciation', label: 'Pronunciation', value: result.pronunciation_score },
    { key: 'jitter', label: 'Jitter', value: result.jitter_score },
    { key: 'shimmer', label: 'Shimmer', value: result.shimmer_score },
    ...(isFreeSession ? [{ key: 'context', label: 'Context', value: result.context_score }] : []),
  ].map((p) => {
    const scoreVal = Number.isFinite(p.value) ? p.value : 0;
    const score = Math.max(0, Math.min(100, Math.round(scoreVal)));
    return {
      ...p,
      score,
      effectivenessScore: getMetricEffectivenessScore(p.key, score),
    };
  });
  
  const pillarBasedRecommendations = pillars
    .filter((p) => p.effectivenessScore < 85)
    .map((cat) => {
      if (cat.key === 'facial') return 'Improve facial expressions — maintain natural, engaging eye contact.';
      if (cat.key === 'gesture') return 'Use more purposeful hand gestures to emphasize key points.';
      if (cat.key === 'jitter') return 'Steady your vocal pitch — practice deep breathing for control.';
      if (cat.key === 'shimmer') return 'Maintain consistent volume — focus on diaphragm breathing.';
      if (cat.key === 'pronunciation') return 'Articulate more clearly — slow down on complex words.';
      if (cat.key === 'context') return 'Stay aligned with your chosen topic and connect examples back to your main message.';
      return '';
    })
    .filter(Boolean);

  const allRecommendations = Array.from(new Set([...pillarBasedRecommendations, ...recommendations]));

  if (allRecommendations.length === 0) {
    allRecommendations.push('Great job! Keep up the excellent work across all areas.');
  }
  const replayAction = buildReplayAction(result, navigate);
  const isOnboardingInProgress = user?.onboardingStage === 'pretest' || user?.onboardingStage === 'analyzing';
  const onboardingActionLabel = user?.onboardingStage === 'analyzing'
    ? 'Analyze Level'
    : 'Continue Onboarding';
  const onboardingActionRoute = user?.onboardingStage === 'analyzing'
    ? ROUTES.USER_ANALYZING
    : ROUTES.USER_PRETEST;

  const backTarget = (state?.source === 'notification')
    ? (state?.backTo || ROUTES.DASHBOARD)
    : ROUTES.TRAINING_SETUP;

  const pillarColors = {
    facial: '#21C26A',
    gesture: '#15B8A6',
    jitter: '#FCBA04',
    shimmer: '#F59E0B',
    pronunciation: '#EF4444',
    context: '#3B82F6',
  };

  return (
    <div className="inner-page feedback-figma-page">
      {shouldCelebrateScore(result) && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={260}
          gravity={0.25}
          className="score-confetti"
        />
      )}

      {/* Header */}
      <div className="inner-page-header centered-header">
        <BackButton onClick={() => navigate(backTarget, { replace: true })} />
        <h1 className="inner-page-title">Analysis Result</h1>
      </div>

      {/* Overall score */}
      <div className="page-card result-hero-card">
        <p className="result-hero-kicker">Speaking Confidence Score</p>
        <div className="result-hero-score-row">
          <p className="result-hero-score">
            {scoreDisplay}
            <span>/100</span>
          </p>
          <span className="result-hero-tier" style={{ background: `${tier.color}1A`, color: tier.color }}>
            {tier.label}
          </span>
        </div>
        <div className="result-hero-track">
          <div
            className="result-hero-track-fill"
            style={{ width: `${roundedScore}%`, background: tier.color }}
          />
        </div>
        <p className="result-summary">
          {score >= 85 ? 'Outstanding! Your speech was clear and fluent.'
            : score >= 65 ? 'Good job! A few areas to polish for even better results.'
              : score >= 45 ? 'Keep going! Regular practice will push your score higher.'
                : 'Don\'t give up. Every session makes you stronger.'}
        </p>
      </div>

      {/* Five scoring pillars */}
      <div className="feedback-metrics-grid" style={{ marginTop: 0, marginBottom: 16 }}>
        {pillars.map((p) => {
          const color = pillarColors[p.key] || '#FCBA04';
          return (
            <div key={p.key} className={`page-card feedback-score-card ${p.key}`}>
              <p className="feedback-score-title">{p.label}</p>
              <p className="feedback-score-main">{p.score}%</p>
              <p className="feedback-score-sub">{scoreWord(p.effectivenessScore).toUpperCase()}</p>
              <div className="feedback-score-track"><div style={{ width: `${p.score}%`, background: color }} /></div>
            </div>
          );
        })}
      </div>

      {allRecommendations.length > 0 && (
        <div className="page-card result-recs-card" style={{ marginBottom: 16 }}>
          <p className="section-label" style={{ marginBottom: 8 }}>Recommendations</p>
          <ul className="result-recs-list">
            {allRecommendations.map((text, idx) => (
              <li key={idx} className="result-rec-item">{text}</li>
            ))}
          </ul>
          {pillarBasedRecommendations.length > 0 && (
            <button
              className="result-recs-hub-link"
              onClick={() => navigate(ROUTES.FRAMEWORKS)}
              type="button"
            >
              Visit Training Hub →
            </button>
          )}
        </div>
      )}

      {/* View detailed feedback row */}
      <div
        className="view-feedback-row"
        onClick={() => navigate(buildRoute.detailedFeedback(sessionId), { state: result })}
      >
        <span className="view-feedback-label">View Detailed Feedback</span>
        <span className="view-feedback-arrow">›</span>
      </div>

      {/* Actions */}
      <div className="btn-row" style={{ marginTop: 24 }}>
        <button className="btn-secondary" onClick={() => navigate(isOnboardingInProgress ? onboardingActionRoute : ROUTES.DASHBOARD)}>
          {isOnboardingInProgress ? onboardingActionLabel : 'Back to Dashboard'}
        </button>
        <button className="btn-primary" onClick={replayAction.onClick}>
          {replayAction.label}
        </button>
      </div>
    </div>
  );
}

export default SessionResultPage;

