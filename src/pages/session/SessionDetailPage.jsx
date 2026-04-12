import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSessionContext } from '../../context/useSessionContext';
import { formatDate, formatDuration } from '../../utils/formatters';
import { buildRoute, getScoreTier, ROUTES } from '../../utils/constants';
import { getSessionMode, getSessionSpeechType } from '../../utils/sessionFormatting';
import BackButton from '../../components/common/BackButton';
import '../main/InnerPages.css';
import './SessionPages.css';

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

function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { currentSession, fetchSessionById, isLoading, error } = useSessionContext();
  const session = locationState || currentSession;

  useEffect(() => {
    if (!locationState && sessionId) fetchSessionById(sessionId);
  }, [sessionId, fetchSessionById, locationState]);

  if (isLoading && !session) {
    return <div className="inner-page"><div className="page-loading">Loading session…</div></div>;
  }

  if (!session) {
    return (
      <div className="inner-page">
        <div className="empty-state">
          <span className="empty-icon">⚠️</span>
          <p className="empty-title">{error ? 'Session not found' : 'Session not found'}</p>
          <button className="btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  const s     = session;
  const score = s.confidence_score ?? 0;
  const tier  = getScoreTier(score);
  const durationSec = s.duration_sec ?? s.duration;
  const replayAction = buildReplayAction(s, navigate);

  return (
    <div className="inner-page">
      {/* Header */}
      <div className="inner-page-header">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="inner-page-title">Session Detail</h1>
      </div>

      {/* Score card */}
      <div className="page-card" style={{ textAlign: 'center', marginBottom: 16 }}>
        <div
          className="score-circle"
          style={{ borderColor: tier.color }}
        >
          <span className="score-circle-num">{score}</span>
          <span className="score-circle-label">/100</span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: tier.color, margin: '6px 0 0' }}>
          {tier.label}
        </p>
      </div>

      {/* Practiced text */}
      <div className="page-card" style={{ marginBottom: 16 }}>
        <p className="detail-section-title">Practiced Text</p>
        <p className="practiced-text">{s.transcript || 'No text recorded.'}</p>
      </div>

      {/* Session info */}
      <div className="page-card" style={{ marginBottom: 16 }}>
        <p className="detail-section-title">Session Info</p>
        <div className="info-row">
          <span className="info-row-key">Date</span>
          <span className="info-row-val">{formatDate(s.created_at)}</span>
        </div>
        {durationSec != null && (
          <div className="info-row">
            <span className="info-row-key">Duration</span>
            <span className="info-row-val">{formatDuration(durationSec)}</span>
          </div>
        )}
        {s.session_origin && (
          <div className="info-row">
            <span className="info-row-key">Type</span>
            <span className="info-row-val" style={{ textTransform: 'capitalize' }}>{s.session_origin}</span>
          </div>
        )}
      </div>

      {/* Feedback card */}
      {s.feedback && (
        <div className="page-card" style={{ marginBottom: 16 }}>
          <p className="detail-section-title">Feedback</p>
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: 0 }}>{s.feedback}</p>
        </div>
      )}

      {/* View detailed feedback link */}
      <div
        className="view-feedback-row"
        onClick={() => navigate(buildRoute.detailedFeedback(sessionId), { state: s })}
      >
        <span className="view-feedback-label">View Detailed Feedback</span>
        <span className="view-feedback-arrow">›</span>
      </div>

      {/* Actions */}
      <div className="btn-row" style={{ marginTop: 24 }}>
        <button className="btn-secondary" onClick={replayAction.onClick}>
          {replayAction.label}
        </button>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    </div>
  );
}

export default SessionDetailPage;
