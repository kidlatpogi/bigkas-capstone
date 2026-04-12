import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSessionContext } from '../../context/useSessionContext';
import { ROUTES, getScoreTier } from '../../utils/constants';
import { formatDate, formatDuration } from '../../utils/formatters';
import BackButton from '../../components/common/BackButton';
import { getSessionMode, getSessionSpeechType } from '../../utils/sessionFormatting';
import '../main/InnerPages.css';
import './SessionPages.css';

function buildReplayAction(session, navigate, isFree) {
  const mode = getSessionMode(session);
  const isPractice = mode === 'Practice';

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

function toPct(value, fallback = 50) {
  const n = Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

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

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function formatRecommendationTime(startSec, endSec) {
  const hasStart = Number.isFinite(startSec);
  const hasEnd = Number.isFinite(endSec);
  if (!hasStart || !hasEnd || endSec <= startSec) return 'Session-wide';
  return `${formatDuration(startSec)} - ${formatDuration(endSec)}`;
}

function DetailedFeedbackPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { state: locationState } = useLocation();
  const { currentSession, fetchSessionById, isLoading } = useSessionContext();
  const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);
  const [isSessionInfoOpen, setIsSessionInfoOpen] = useState(false);

  const hasCompleteLocationState = useMemo(() => {
    if (!locationState || typeof locationState !== 'object') return false;
    const sameSession = String(locationState?.id || '') === String(sessionId || '');
    if (!sameSession) return false;
    return Number.isFinite(Number(locationState?.confidence_score));
  }, [locationState, sessionId]);

  const session = useMemo(() => {
    if (hasCompleteLocationState) return locationState;
    if (String(currentSession?.id || '') === String(sessionId || '')) return currentSession;
    return null;
  }, [currentSession, hasCompleteLocationState, locationState, sessionId]);

  useEffect(() => {
    if (session) return;
    fetchSessionById(sessionId);
  }, [fetchSessionById, session, sessionId]);

  const durationSec = Math.max(1, Math.round(session?.duration_sec ?? session?.duration ?? 1));
  const rawScore = Number(session?.confidence_score ?? 0);
  const total = toPct(rawScore, 0);
  const tier = getScoreTier(total);
  const scoreDisplay = `${total}`;
  
  const isFreeSession = getSessionSpeechType(session) === 'Free Speech';
  
  const replayAction = buildReplayAction(session, navigate, isFreeSession);
  const audioUrl = session?.audio_url || null;
  const videoUrl = session?.video_url || session?.video_storage_url || null;
  const modeLabel = getSessionMode(session);
  const practicedText = session?.transcript || 'No recorded text available.';

  const categories = useMemo(() => {
    return [
      {
        id: 'facial',
        label: 'Facial Expression',
        score: toPct(session?.facial_expression_score ?? session?.eye_contact_score, total),
        color: '#21C26A',
      },
      {
        id: 'gesture',
        label: 'Gestures',
        score: toPct(session?.gesture_score ?? session?.visual_score, total),
        color: '#15B8A6',
      },
      {
        id: 'pronunciation',
        label: 'Pronunciation',
        score: toPct(session?.pronunciation_score ?? session?.acoustic_score ?? total, total),
        color: '#EF4444',
      },
      {
        id: 'jitter',
        label: 'Jitter',
        score: toPct(session?.jitter_score ?? session?.acoustic_score, total),
        color: '#FCBA04',
      },
      {
        id: 'shimmer',
        label: 'Shimmer',
        score: toPct(session?.shimmer_score ?? session?.acoustic_score, total),
        color: '#F59E0B',
      },
      ...(isFreeSession
        ? [{
          id: 'context',
          label: 'Context',
          score: toPct(session?.context_score, total),
          color: '#3B82F6',
        }]
        : []),
    ].map((cat) => ({
      ...cat,
      effectivenessScore: getMetricEffectivenessScore(cat.id, cat.score),
    }));
  }, [isFreeSession, session, total]);

  const timelinePoints = useMemo(() => {
    const pointCount = clamp(Math.floor(durationSec / 15) + 1, 4, 8);
    return Array.from({ length: pointCount }, (_, idx) => {
      const progress = pointCount === 1 ? 1 : idx / (pointCount - 1);
      const timeSec = idx === pointCount - 1 ? durationSec : Math.round(durationSec * progress);

      const values = categories.reduce((acc, cat, catIndex) => {
        const variance = 8 + (100 - cat.score) * 0.08;
        const phase = progress * Math.PI * 1.6 + catIndex * 0.75;
        const wave = Math.sin(phase) * variance * 0.5 + Math.cos(phase * 0.7) * variance * 0.25;
        const momentum = (progress - 0.5) * ((cat.score - 50) / 12);
        acc[cat.id] = clamp(Math.round(cat.score + wave + momentum));
        return acc;
      }, {});

      return {
        idx,
        timeSec,
        label: formatDuration(timeSec),
        values,
      };
    });
  }, [categories, durationSec]);

  const timelineFeedback = useMemo(() => {
    const apiRecs = Array.isArray(session?.recommendations) ? session.recommendations : [];
    const timedRecs = Array.isArray(session?.recommendation_timestamps)
      ? session.recommendation_timestamps
      : [];
    const timeByText = new Map();
    timedRecs.forEach((item) => {
      const text = String(item?.text || '').trim();
      if (!text || timeByText.has(text)) return;
      timeByText.set(text, {
        start_sec: Number.isFinite(Number(item?.start_sec)) ? Number(item.start_sec) : null,
        end_sec: Number.isFinite(Number(item?.end_sec)) ? Number(item.end_sec) : null,
      });
    });

    const byPriority = [...categories].sort((a, b) => a.effectivenessScore - b.effectivenessScore);
    const mistakes = byPriority.filter((cat) => cat.effectivenessScore < 85);
    
    const result = [];

    // Always include weak-pillar guidance so recommendation count scales with weaknesses.
    mistakes.forEach((cat, idx) => {
      let text = '';
      if (cat.id === 'facial') text = 'Improve facial expressions — maintain natural, engaging eye contact.';
      else if (cat.id === 'gesture') text = 'Use more purposeful hand gestures to emphasize key points.';
      else if (cat.id === 'jitter') text = 'Steady your vocal pitch — practice deep breathing for control.';
      else if (cat.id === 'shimmer') text = 'Maintain consistent volume — focus on diaphragm breathing.';
      else if (cat.id === 'pronunciation') text = 'Articulate more clearly — slow down on complex words.';
      else if (cat.id === 'context') text = 'Stay on-topic by linking each point back to your declared speaking topic.';

      result.push({
        key: `${cat.id}-${idx}`,
        title: `${cat.label} Focus`,
        text,
        time: 'Session-wide',
        color: cat.id,
      });
    });

    apiRecs.forEach((rec, idx) => {
      const cat = byPriority[idx % byPriority.length];
      const recTime = timeByText.get(String(rec || '').trim()) || null;
      result.push({
        key: `api-${idx}`,
        title: `${cat.label} Coaching`,
        text: rec,
        time: formatRecommendationTime(recTime?.start_sec, recTime?.end_sec),
        color: cat.id,
      });
    });

    if (result.length === 0) {
      result.push({
        key: 'perfect',
        title: 'Outstanding Performance',
        text: 'Great job! Keep up the excellent work across all areas.',
        time: '00:00',
        color: 'facial'
      });
    }

    return result;
  }, [categories, session]);

  if (isLoading && !session) {
    return <div className="inner-page"><div className="page-loading">Loading...</div></div>;
  }

  if (!session) {
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

  return (
    <div className="inner-page feedback-figma-page">
      <div className="inner-page-header centered-header">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="inner-page-title">Detailed Feedback</h1>
      </div>

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
            style={{ width: `${Math.max(0, Math.min(100, Number(total) || 0))}%`, background: tier.color }}
          />
        </div>
      </div>

      <div className="page-card feedback-flow-card">
        <p className="feedback-flow-label">Performance Flow</p>
        <h2 className="feedback-flow-title">Timeline</h2>

        <div className="feedback-timeline">
          {timelinePoints.map((point) => (
            <div key={point.idx} className="feedback-col">
              <div className="feedback-col-bg" />
              <div
                className="feedback-col-bars"
                style={{ '--timeline-bar-count': categories.length }}
              >
                {categories.map((cat) => (
                  <div key={`${point.idx}-${cat.id}`} className="feedback-mini-bar-wrap">
                    <div
                      className="feedback-mini-bar"
                      style={{ height: `${point.values[cat.id]}%`, background: cat.color }}
                    />
                  </div>
                ))}
              </div>
              <span className="feedback-timeline-time">{point.label}</span>
            </div>
          ))}
        </div>

        <div className="feedback-legend-row">
          {categories.map((cat) => (
            <span key={cat.id} className="feedback-legend">
              <i className="dot" style={{ background: cat.color }} /> {cat.label}
            </span>
          ))}
        </div>
      </div>

      <div className="feedback-metrics-grid">
        {categories.map((cat) => (
          <div key={cat.id} className={`page-card feedback-score-card ${cat.id}`}>
            <p className="feedback-score-title">{cat.label}</p>
            <p className="feedback-score-main">{cat.score}%</p>
            <p className="feedback-score-sub">{scoreWord(cat.effectivenessScore).toUpperCase()}</p>
            <div className="feedback-score-track"><div style={{ width: `${cat.score}%`, background: cat.color }} /></div>
          </div>
        ))}
      </div>

      <p className="section-label" style={{ marginBottom: 8 }}>Recommendations</p>
      <div className="feedback-tips-list" style={{ marginBottom: 12 }}>
        {timelineFeedback.map((tip) => (
          <div key={tip.key} className={`feedback-tip-card ${tip.color}`}>
            <div className="feedback-tip-top">
              <h3>{tip.title}</h3>
              <span>{tip.time}</span>
            </div>
            <p>{tip.text}</p>
          </div>
        ))}
        {timelineFeedback.some(t => t.key !== 'perfect') && (
          <button
            className="result-recs-hub-link"
            onClick={() => navigate(ROUTES.FRAMEWORKS)}
            type="button"
            style={{ marginTop: 8 }}
          >
            Visit Training Hub →
          </button>
        )}
      </div>

      <div className="feedback-section-divider" aria-hidden="true" />

      {(audioUrl || videoUrl) && (
        <div className="page-card" style={{ marginBottom: 12 }}>
          <button
            className="result-collapse-toggle"
            onClick={() => setIsRecordingsOpen((open) => !open)}
            type="button"
            aria-expanded={isRecordingsOpen}
            aria-controls="session-recordings-body"
          >
            <span className="section-label" style={{ marginBottom: 0 }}>Session Recordings</span>
            <span className={`result-collapse-chevron${isRecordingsOpen ? ' open' : ''}`}>▼</span>
          </button>

          {isRecordingsOpen && (
            <div id="session-recordings-body" className="result-collapse-body">
              {videoUrl ? (
                <div className="session-video-wrap" style={{ marginBottom: audioUrl ? 10 : 0 }}>
                  <video className="session-video" controls preload="metadata" src={videoUrl}>
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : null}
              {audioUrl ? (
                <audio className="session-audio" controls preload="metadata" src={audioUrl}>
                  Your browser does not support audio playback.
                </audio>
              ) : null}
            </div>
          )}
        </div>
      )}

      <div className="page-card" style={{ marginBottom: 12 }}>
        <button
          className="result-collapse-toggle"
          onClick={() => setIsSessionInfoOpen((open) => !open)}
          type="button"
          aria-expanded={isSessionInfoOpen}
          aria-controls="detailed-session-information-body"
        >
          <span className="section-label" style={{ marginBottom: 0 }}>Session Information</span>
          <span className={`result-collapse-chevron${isSessionInfoOpen ? ' open' : ''}`}>▼</span>
        </button>

        {isSessionInfoOpen && (
          <div id="detailed-session-information-body" className="result-collapse-body">
            {session.created_at && (
              <div className="info-row">
                <span className="info-row-key">Date</span>
                <span className="info-row-val">{formatDate(session.created_at)}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-row-key">Duration</span>
              <span className="info-row-val">{formatDuration(durationSec || 0)}</span>
            </div>
            <div className="info-row">
              <span className="info-row-key">Mode</span>
              <span className="info-row-val">{modeLabel}</span>
            </div>

            <p className="detail-section-title" style={{ marginTop: 14 }}>Practiced Text</p>
            <p className="practiced-text">{practicedText}</p>
          </div>
        )}
      </div>

      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="btn-primary" onClick={replayAction.onClick}>
          {replayAction.label}
        </button>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default DetailedFeedbackPage;
