import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Confetti from 'react-confetti';
import { IoChevronForward, IoPulse, IoStar, IoRepeat } from 'react-icons/io5';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';
import { buildRoute, ROUTES } from '../../utils/constants';
import { getSessionMode } from '../../utils/sessionFormatting';
import { sanitizeRecommendationLines } from '../../utils/analysisTranscript';
import { getSpriteUrl } from '../../utils/assetUtils';

const verbalSprite = getSpriteUrl('common/Verbal.png');
const visualSprite = getSpriteUrl('common/Visual.png');
const vocalSprite = getSpriteUrl('common/Vocal.png');
const heroRobotImage = getSpriteUrl('Robot/0018.webp');
import './SessionResultPageMobile.css';

// --- Helpers ---
function score100to15(val) {
  const v = Math.max(0, Math.min(100, Number(val) || 0));
  if (v === 0) return 1.0;
  return Math.round((1.0 + (v / 100) * 4.0) * 100) / 100;
}

function getTripleVScores(result) {
  const visualAvg = result.visual_avg ?? score100to15(result.visual_score ?? 0);
  const vocalAvg = result.vocal_avg ?? score100to15(result.acoustic_score ?? 0);
  const verbalAvg = result.verbal_avg ?? score100to15(result.context_score ?? 0);
  const entryPoint = result.entry_point ?? score100to15(result.confidence_score ?? 0);

  return {
    entryPoint: Math.round(Math.max(1, Math.min(5, Number(entryPoint) || 1)) * 100) / 100,
    visualAvg: Math.round(Math.max(1, Math.min(5, Number(visualAvg) || 1)) * 100) / 100,
    vocalAvg: Math.round(Math.max(1, Math.min(5, Number(vocalAvg) || 1)) * 100) / 100,
    verbalAvg: Math.round(Math.max(1, Math.min(5, Number(verbalAvg) || 1)) * 100) / 100,
  };
}

function getScoreTier15(score) {
  if (score >= 4.0) return { label: 'Excellent', color: '#059669' };
  if (score >= 3.0) return { label: 'Good', color: '#059669' };
  if (score >= 2.0) return { label: 'Fair', color: '#F97316' };
  return { label: 'Needs Work', color: '#FF0000' };
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
  const isPracticeOrTraining = raw.includes('practice') || raw.includes('train');
  return isPracticeOrTraining;
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

// --- Component ---
function SessionResultPageMobile({ sessionIdProp, isInnerView, onCloseInner, onViewDetailed }) {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams();
  const activeSessionId = sessionIdProp || paramSessionId;
  const { state } = useLocation();
  const { currentSession, fetchSessionById, isLoading } = useSessionContext();
  const { user } = useAuthContext();
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const hasCompleteState = useMemo(() => {
    if (!state || typeof state !== 'object') return false;
    const sameSession = String(state?.id || '') === String(activeSessionId || '');
    if (!sameSession) return false;
    return Number.isFinite(Number(state?.confidence_score));
  }, [activeSessionId, state]);

  useEffect(() => {
    if (!hasCompleteState && String(currentSession?.id || '') !== String(activeSessionId || '')) {
      fetchSessionById(activeSessionId);
    }
  }, [currentSession, fetchSessionById, hasCompleteState, activeSessionId]);

  useEffect(() => {
    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const result = useMemo(() => {
    if (hasCompleteState) return state;
    if (String(currentSession?.id || '') === String(activeSessionId || '')) return currentSession;
    return null;
  }, [currentSession, hasCompleteState, activeSessionId, state]);

  if (!result && isLoading) {
    return <div className="sr-mobile-root"><div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div></div>;
  }

  if (!result) {
    return (
      <div className="sr-mobile-root">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h3>Session not found</h3>
          <button onClick={() => navigate(ROUTES.DASHBOARD)}>Go Home</button>
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
  }

  const handleBackNavigation = () => {
    if (isInnerView && onCloseInner) onCloseInner();
    else navigate(breadcrumbRoute, { replace: true });
  };

  const recommendations = sanitizeRecommendationLines(
    Array.isArray(result.recommendations) ? result.recommendations : []
  );

  const pillars = [
    { key: 'visual', label: 'Visual', desc: 'Eye contact & gestures', score: tripleV.visualAvg, image: visualSprite },
    { key: 'vocal', label: 'Vocal', desc: 'Voice quality & stability', score: tripleV.vocalAvg, image: vocalSprite },
    { key: 'verbal', label: 'Verbal', desc: 'Pronunciation & clarity', score: tripleV.verbalAvg, image: verbalSprite },
  ];

  const pillarRecommendations = pillars
    .filter((p) => p.score < 3.0)
    .map((p) => {
      let text = '';
      if (p.key === 'visual') text = 'Maintain natural eye contact and use purposeful gestures.';
      else if (p.key === 'vocal') text = 'Practice deep breathing for pitch and volume control.';
      else text = 'Slow down on complex words and stay on topic.';
      return { text, pillar: p.key };
    });

  const allRecommendations = [...pillarRecommendations, ...recommendations.map(text => ({ text, pillar: 'general' }))];
  if (allRecommendations.length === 0) {
    allRecommendations.push({ text: 'Great job! Keep up the excellent work.', pillar: 'general' });
  }

  const replayAction = buildReplayAction(result, navigate);

  return (
    <div className="sr-mobile-root no-scrollbar">
      {shouldCelebrateScore(result) && !isInnerView && (
        <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} gravity={0.3} />
      )}

      {/* Mobile Breadcrumb */}
      {!isInnerView && (
        <nav className="sr-mobile-breadcrumb">
          <button type="button" className="sr-mobile-breadcrumb-btn" onClick={handleBackNavigation}>
            {breadcrumbParent}
          </button>
          <IoChevronForward className="sr-mobile-breadcrumb-sep" />
          <span className="sr-mobile-breadcrumb-current">{sessionTitle}</span>
        </nav>
      )}

      <div className="sr-mobile-content">
        
        {/* Immersive Coach Hero */}
        <section className="activity-mobile-top-strip sr-mobile-hero dashboard-anim-top">
          <div className="activity-mobile-banner-left">
            <img src={heroRobotImage} alt="" className="activity-mobile-banner-robot" />
            <div className="activity-mobile-banner-bubble">
              <p className="activity-mobile-banner-kicker">B-01:</p>
              <p className="activity-mobile-banner-copy">
                {tripleV.entryPoint >= 4.0 ? 'Outstanding! Clear and confident delivery.' : 
                 tripleV.entryPoint >= 3.0 ? 'Good job! A few areas to polish but very natural.' :
                 'Keep going! Regular practice is key to steady improvement.'}
              </p>
              
              {allRecommendations.length > 0 && (
                <ul className="sr-mobile-hero-recs">
                  {allRecommendations.slice(0, 2).map((rec, idx) => (
                    <li key={idx} className="sr-mobile-hero-rec-item">
                      <span className="sr-mobile-hero-rec-bullet">•</span>
                      {rec.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Overview Widgets */}
        <div className="sr-mobile-overview-grid dashboard-anim-bottom">
          <div className="sr-mobile-widget">
            <div className="sr-mobile-widget-header">
              <span className="sr-mobile-widget-title">Overall Score</span>
              <span className="sr-mobile-widget-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>PERFORMANCE</span>
            </div>
            <div className="sr-mobile-score-row">
              <span className="sr-mobile-score-value" style={{ color: overallTier.color }}>{Math.round(scoreBarPercent(tripleV.entryPoint))}%</span>
              <span className="sr-mobile-score-max">Confidence</span>
            </div>
            <div className="sr-mobile-tier-row">
              <span className="sr-mobile-tier-dot" style={{ background: overallTier.color }} />
              <span className="sr-mobile-tier-label" style={{ color: overallTier.color }}>{overallTier.label}</span>
            </div>
          </div>

          <div className="sr-mobile-widget">
            <div className="sr-mobile-widget-header">
              <span className="sr-mobile-widget-title">Primary Strength</span>
              <span className="sr-mobile-widget-badge" style={{ background: '#f0fdf4', color: '#059669' }}>ANALYSIS</span>
            </div>
            {(() => {
              const topPillar = [...pillars].sort((a, b) => b.score - a.score)[0];
              return (
                <div className="sr-mobile-strength-row">
                  <img src={topPillar.image} alt="" className="sr-mobile-strength-icon" />
                  <span className="sr-mobile-strength-name" style={{ color: '#059669' }}>{topPillar.label}</span>
                </div>
              );
            })()}
            <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, marginTop: '8px', textTransform: 'uppercase' }}>Top Performance Area</p>
          </div>
        </div>

        {/* Triple V Breakdown */}
        <section className="sr-mobile-pillars-section dashboard-anim-bottom">
          <div className="sr-mobile-section-header">
            <h2 className="sr-mobile-section-title">Analysis Pillars</h2>
            <p className="sr-mobile-section-subtitle">Visual, Vocal, and Verbal breakdown</p>
          </div>

          <div className="sr-mobile-pillars-list">
            {pillars.map((p) => {
              const tier = getScoreTier15(p.score);
              const percent = scoreBarPercent(p.score);
              return (
                <div key={p.key} className="sr-mobile-pillar-card">
                  <div className="sr-mobile-pillar-header">
                    <div className="sr-mobile-pillar-info">
                      <img src={p.image} alt="" className="sr-mobile-pillar-icon" />
                      <h4 className="sr-mobile-pillar-label">{p.label}</h4>
                    </div>
                    <span className="sr-mobile-pillar-tier" style={{ background: `${tier.color}15`, color: tier.color }}>
                      {tier.label}
                    </span>
                  </div>
                  <div className="sr-mobile-pillar-score-row">
                    <span className="sr-mobile-pillar-score">{Math.round(percent)}% <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Overall</span></span>
                  </div>
                  <div className="sr-mobile-pillar-track">
                    <div className="sr-mobile-pillar-fill" style={{ width: `${percent}%`, background: tier.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer Actions */}
        <footer className="sr-mobile-footer dashboard-anim-bottom">
          <button
            type="button"
            className="sr-mobile-detailed-card"
            onClick={onViewDetailed}
          >
            <div className="sr-mobile-detailed-icon-box">
              <IoChevronForward />
            </div>
            <div className="sr-mobile-detailed-text">
              <span className="sr-mobile-detailed-kicker">ANALYTICS INSIGHTS</span>
              <h3 className="sr-mobile-detailed-title">Detailed Feedback</h3>
            </div>
          </button>

          <button
            type="button"
            className="sr-mobile-action-btn"
            onClick={replayAction.onClick}
          >
            {replayAction.label}
          </button>

          {!isInnerView && (
            <button
              type="button"
              className="sr-mobile-exit-btn"
              onClick={() => navigate(ROUTES.DASHBOARD)}
            >
              Return to Dashboard
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default SessionResultPageMobile;
