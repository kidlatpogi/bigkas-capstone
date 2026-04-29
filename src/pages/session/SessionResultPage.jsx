import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Confetti from 'react-confetti';
import { IoChevronForward } from 'react-icons/io5';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';
import { buildRoute, ROUTES } from '../../utils/constants';
import { getSessionMode } from '../../utils/sessionFormatting';
import { sanitizeRecommendationLines } from '../../utils/analysisTranscript';
import verbalSprite from '../../assets/Sprites/common/Verbal.png';
import visualSprite from '../../assets/Sprites/common/Visual.png';
import vocalSprite from '../../assets/Sprites/common/Vocal.png';
import heroRobotImage from '../../assets/Sprites/Robot/0018.webp';
import '../main/InnerPages.css';
import './SessionResultPage.css';

const FOREST_GREEN = '#5A7863';
const SOFT_SAGE = '#90AB8B';
const SLATE_CHARCOAL = '#3C4952';
const VIBRANT_ORANGE = '#F18F01';

function score100to15(val) {
  const v = Math.max(0, Math.min(100, Number(val) || 0));
  if (v === 0) return 1.0;
  return Math.round((1.0 + (v / 100) * 4.0) * 100) / 100;
}

function getTripleVScores(result) {
  const visualAvg = result.visual_avg ?? score100to15(result.visual_score ?? 0);
  const vocalAvg = result.vocal_avg ?? score100to15(result.acoustic_score ?? 0);
  const verbalAvg = result.verbal_avg ?? score100to15(result.context_score ?? 0);

  const entryPoint = result.entry_point
    ?? score100to15(result.confidence_score ?? 0);

  return {
    entryPoint: Math.round(Math.max(1, Math.min(5, Number(entryPoint) || 1)) * 100) / 100,
    visualAvg: Math.round(Math.max(1, Math.min(5, Number(visualAvg) || 1)) * 100) / 100,
    vocalAvg: Math.round(Math.max(1, Math.min(5, Number(vocalAvg) || 1)) * 100) / 100,
    verbalAvg: Math.round(Math.max(1, Math.min(5, Number(verbalAvg) || 1)) * 100) / 100,
  };
}

function getScoreTier15(score) {
  if (score >= 4.0) return { label: 'Excellent', color: FOREST_GREEN };
  if (score >= 3.0) return { label: 'Good', color: SOFT_SAGE };
  if (score >= 2.0) return { label: 'Fair', color: VIBRANT_ORANGE };
  return { label: 'Needs Work', color: '#D94F3B' };
}

function scoreBarPercent(score) {
  return Math.max(0, Math.min(100, ((score - 1) / 4) * 100));
}

function shouldCelebrateScore(session) {
  const score = Number(session?.confidence_score ?? 0);
  if (!Number.isFinite(score) || score < 60) return false;
  const raw = [
    session?.session_mode, session?.mode, session?.session_type,
    session?.session_origin, session?.speaking_mode,
  ].filter((v) => typeof v === 'string' && v.trim()).join(' ').toLowerCase();
  const isPreTest = raw.includes('pre-test') || raw.includes('pretest');
  const isPracticeOrTraining = raw.includes('practice') || raw.includes('train');
  return !isPreTest && isPracticeOrTraining;
}

function buildReplayAction(session, navigate) {
  const mode = getSessionMode(session);
  const isPractice = mode === 'Practice';
  const setupRoute = isPractice ? ROUTES.PRACTICE : ROUTES.TRAINING_SETUP;
  const label = isPractice ? 'Practice Again' : 'Train Again';
  const rawSpeech = [
    session?.session_mode, session?.mode, session?.speaking_mode,
  ].filter((v) => typeof v === 'string' && v.trim()).join(' ').toLowerCase();
  const isFree = rawSpeech.includes('free');
  const focus = isFree ? 'free' : 'scripted';

  const replayState = {
    focus,
    sessionType: isPractice ? 'practice' : 'training',
    entryPoint: isPractice ? 'practice' : 'training',
    autoStartCountdown: true,
  };

  if (focus === 'scripted') {
    const content = session?.transcript || '';
    if (!content.trim()) return { label, onClick: () => navigate(setupRoute) };
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

function SessionResultPage({ sessionIdProp, isInnerView, onCloseInner, onViewDetailed }) {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams();
  const activeSessionId = sessionIdProp || paramSessionId;
  const { state } = useLocation();
  const { currentSession, fetchSessionById, isLoading } = useSessionContext();
  const { user } = useAuthContext();
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  const hasCompleteState = useMemo(() => {
    if (!state || typeof state !== 'object') return false;
    const sameSession = String(state?.id || '') === String(activeSessionId || '');
    if (!sameSession) return false;
    return Number.isFinite(Number(state?.confidence_score));
  }, [activeSessionId, state]);

  useEffect(() => {
    if (hasCompleteState) return;
    if (String(currentSession?.id || '') === String(activeSessionId || '')) return;
    fetchSessionById(activeSessionId);
  }, [currentSession, fetchSessionById, hasCompleteState, activeSessionId]);

  useEffect(() => {
    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const result = useMemo(() => {
    if (hasCompleteState) return state;
    if (String(currentSession?.id || '') === String(activeSessionId || '')) return currentSession;
    return null;
  }, [currentSession, hasCompleteState, activeSessionId, state]);

  if (!result && isLoading) {
    return (
      <div className="sr-page">
        <div className="sr-loading">Loading...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="sr-page">
        <div className="sr-empty">
          <p className="sr-empty-title">Session not found</p>
          <button className="sr-btn sr-btn-primary" onClick={() => navigate(ROUTES.DASHBOARD)}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const tripleV = getTripleVScores(result);
  const overallTier = getScoreTier15(tripleV.entryPoint);
  const sessionTitle = result?.script_title || result?.title || 'Session';
  const mode = getSessionMode(result);
  const sourceNav = state?.source;

  let breadcrumbParent = mode === 'Practice' ? 'Practice' : 'Training';
  let breadcrumbRoute = mode === 'Practice' ? ROUTES.PRACTICE : ROUTES.TRAINING_SETUP;
  if (sourceNav === 'progress') {
    breadcrumbParent = 'Progress';
    breadcrumbRoute = ROUTES.PROGRESS;
  } else if (sourceNav === 'notification') {
    breadcrumbParent = 'Dashboard';
    breadcrumbRoute = state?.backTo || ROUTES.DASHBOARD;
  }
  
  const handleBackNavigation = () => {
    if (isInnerView && onCloseInner) {
      onCloseInner();
    } else {
      navigate(breadcrumbRoute, { replace: true });
    }
  };

  const recommendations = sanitizeRecommendationLines(
    Array.isArray(result.recommendations) ? result.recommendations : [],
  );
  const pillars = [
    { key: 'visual', label: 'Visual', desc: 'Eye contact & gestures', score: tripleV.visualAvg, image: visualSprite },
    { key: 'vocal', label: 'Vocal', desc: 'Voice quality & stability', score: tripleV.vocalAvg, image: vocalSprite },
    { key: 'verbal', label: 'Verbal', desc: 'Pronunciation & clarity', score: tripleV.verbalAvg, image: verbalSprite },
  ];

  const pillarRecommendations = pillars
    .filter((p) => p.score < 3.0)
    .map((p) => {
      if (p.key === 'visual') return 'Improve visual presence — maintain natural eye contact and use purposeful gestures.';
      if (p.key === 'vocal') return 'Steady your voice — practice deep breathing for pitch and volume control.';
      return 'Articulate more clearly — slow down on complex words and stay on topic.';
    });
  const allRecommendations = Array.from(new Set([...pillarRecommendations, ...recommendations]));
  if (allRecommendations.length === 0) {
    allRecommendations.push('Great job! Keep up the excellent work across all areas.');
  }

  const replayAction = buildReplayAction(result, navigate);
  const isOnboarding = user?.onboardingStage === 'pretest' || user?.onboardingStage === 'analyzing';
  const onboardingRoute = user?.onboardingStage === 'analyzing' ? ROUTES.USER_ANALYZING : ROUTES.USER_PRETEST;
  const onboardingLabel = user?.onboardingStage === 'analyzing' ? 'Analyze Level' : 'Continue Onboarding';

  return (
    <div className={`sr-page-root ${isInnerView ? 'sr-page--inner' : ''} activity-page--skyward-entrance`}>
      {shouldCelebrateScore(result) && !isInnerView && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={260}
          gravity={0.25}
          className="score-confetti"
        />
      )}

      {/* Breadcrumb */}
      {!isInnerView && (
        <nav className="sr-breadcrumb">
          <button
            type="button"
            className="sr-breadcrumb-link"
            onClick={handleBackNavigation}
          >
            {breadcrumbParent}
          </button>
          <IoChevronForward className="sr-breadcrumb-sep" />
          <span className="sr-breadcrumb-current">
            {sessionTitle} Analysis Result
          </span>
        </nav>
      )}

      <div className="sr-content-layout">
        {/* Overall Score Hero (Banner-like) */}
        <section className="sr-hero-banner" id="sr-hero-section">
          <div className="sr-hero-banner-inner">
            <div className="sr-hero-main-content">
              <div className="sr-hero-header">
                <p className="sr-hero-kicker">Overall Speaking Score</p>
                <div className="sr-hero-tier-badge" style={{ '--tier-color': overallTier.color }}>
                  <span className="sr-hero-tier-dot" />
                  {overallTier.label}
                </div>
              </div>

              <div className="sr-hero-score-display">
                <h1 className="sr-hero-score-value">{tripleV.entryPoint.toFixed(1)}</h1>
                <span className="sr-hero-score-max">/ 5.0</span>
              </div>

              <div className="sr-hero-progress-track">
                <div
                  className="sr-hero-progress-fill"
                  style={{ width: `${scoreBarPercent(tripleV.entryPoint)}%` }}
                />
              </div>

              <p className="sr-hero-message">
                {tripleV.entryPoint >= 4.0
                  ? 'Outstanding! Your speech was clear and confident.'
                  : tripleV.entryPoint >= 3.0
                    ? 'Good job! A few areas to polish for even better results.'
                    : tripleV.entryPoint >= 2.0
                      ? 'Keep going! Regular practice will push your score higher.'
                      : "Don't give up. Every session makes you stronger."}
              </p>
            </div>
          </div>
        </section>

        {/* Triple V Breakdown (Grid of Cards) */}
        <section className="sr-pillars-section">
          <h2 className="sr-section-title">Triple V Breakdown</h2>
          <div className="sr-pillars-grid">
            {pillars.map((p) => {
              const tier = getScoreTier15(p.score);
              const scorePercent = scoreBarPercent(p.score);
              return (
                <div key={p.key} className="pillar-card sr-pillar-progress-card" id={`pillar-${p.key}`}>
                  <div className="new-widget-head">
                    <h2 className="new-widget-title">{p.label}</h2>
                    <span className="new-widget-chip" style={{ background: `${tier.color}20`, color: tier.color }}>
                      {tier.label}
                    </span>
                  </div>
                  
                  <div className="new-widget-rank-card">
                    <img src={p.image} alt="" className="new-widget-rank-sprite" />
                    <div className="new-widget-rank-content">
                      <p className="new-widget-kicker">Score</p>
                      <p className="new-widget-value">{p.score.toFixed(1)} / 5.0</p>
                    </div>
                  </div>
                  
                  <div className="progress-pillar-track-header">
                    <span className="progress-pillar-track-label">{p.desc}</span>
                    <span className="progress-pillar-track-percent">{Math.round(scorePercent)}%</span>
                  </div>
                  
                  <div className="progress-pillar-track">
                    <div
                      className="progress-pillar-track-fill"
                      style={{ 
                        width: `${scorePercent}%`, 
                        background: tier.color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recommendations & Detailed Link */}
        <div className="sr-bottom-grid">
          {allRecommendations.length > 0 && (
            <section className="sr-recs-card" id="sr-recommendations">
              <h2 className="sr-section-title">Recommendations</h2>
              <ul className="sr-recs-list-v2">
                {allRecommendations.map((text, idx) => (
                  <li key={idx} className="sr-rec-item-v2">{text}</li>
                ))}
              </ul>
              {pillarRecommendations.length > 0 && (
                <button
                  className="sr-training-hub-btn"
                  onClick={() => navigate(ROUTES.FRAMEWORKS)}
                  type="button"
                >
                  Visit Training Hub <IoChevronForward />
                </button>
              )}
            </section>
          )}

          <div className="sr-cta-column">
            <button
              type="button"
              className="sr-detailed-feedback-card"
              onClick={() => {
                if (isInnerView && onViewDetailed) {
                  onViewDetailed();
                } else {
                  navigate(ROUTES.DETAILED_FEEDBACK.replace(':sessionId', activeSessionId), {
                    state: {
                      ...result,
                      source: state?.source,
                      backTo: state?.backTo,
                    },
                  });
                }
              }}
            >
              <div className="sr-detailed-card-content">
                <span className="sr-detailed-card-kicker">Deep Dive</span>
                <h3 className="sr-detailed-card-title">Detailed Feedback</h3>
                <p className="sr-detailed-card-desc">Analyze your transcript, pacing, and word clarity in depth.</p>
              </div>
              <div className="sr-detailed-card-icon">
                <IoChevronForward />
              </div>
            </button>

            {/* Action Buttons */}
            <div className="sr-footer-actions">
              <button className="sr-btn-action sr-btn-primary-v2" onClick={replayAction.onClick}>
                {replayAction.label}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionResultPage;
