import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { IoChevronForward, IoChevronDown } from 'react-icons/io5';
import { useSessionContext } from '../../context/useSessionContext';
import { supabase } from '../../lib/supabase';
import { ROUTES } from '../../utils/constants';
import { formatDate, formatDuration } from '../../utils/formatters';
import { getSessionMode, getSessionSpeechType } from '../../utils/sessionFormatting';
import { sanitizeRecommendationLines, sanitizeTranscriptForDisplay } from '../../utils/analysisTranscript';
import '../main/InnerPages.css';
import './DetailedFeedbackPage.css';

const FOREST_GREEN = '#5A7863';
const SOFT_SAGE = '#90AB8B';
const VIBRANT_ORANGE = '#F18F01';
const SESSION_MEDIA_BUCKET = 'session-recordings';

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

  const clamp15 = (v) => Math.round(Math.max(1, Math.min(5, Number(v) || 1)) * 100) / 100;
  return {
    entryPoint: clamp15(entryPoint),
    visualAvg: clamp15(visualAvg),
    vocalAvg: clamp15(vocalAvg),
    verbalAvg: clamp15(verbalAvg),
  };
}

function getScoreTier15(score) {
  if (score >= 4.0) return { label: 'Excellent', color: FOREST_GREEN };
  if (score >= 3.0) return { label: 'Good', color: SOFT_SAGE };
  if (score >= 2.0) return { label: 'Fair', color: VIBRANT_ORANGE };
  return { label: 'Needs Work', color: '#D94F3B' };
}

function getLevelFromScore(score) {
  if (score >= 5.0) return { level: 5, label: 'Demonstrating Expertise' };
  if (score >= 4.0) return { level: 4, label: 'Building Skills' };
  if (score >= 3.0) return { level: 3, label: 'Increasing Knowledge' };
  if (score >= 2.0) return { level: 2, label: 'Learning Your Style' };
  return { level: 1, label: 'Mastering Fundamentals' };
}

function scoreBarPercent(score) {
  return Math.max(0, Math.min(100, ((score - 1) / 4) * 100));
}

function subMetric100to15(val) {
  const v = Number(val);
  if (!Number.isFinite(v) || v === 0) return null;
  return Math.round(Math.max(1, Math.min(5, 1.0 + (Math.max(0, Math.min(100, v)) / 100) * 4.0)) * 100) / 100;
}

function invertedSubMetric(val) {
  const v = Number(val);
  if (!Number.isFinite(v)) return null;
  const clamped = Math.max(0, Math.min(100, v));
  const inverted = 100 - clamped;
  return Math.round(Math.max(1, Math.min(5, 1.0 + (inverted / 100) * 4.0)) * 100) / 100;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function buildBucketPublicUrl(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return null;
  if (value.includes('/storage/v1/object/public/')) return value;
  const cleaned = value.replace(/^\/+/, '');
  const { data } = supabase.storage.from(SESSION_MEDIA_BUCKET).getPublicUrl(cleaned);
  return data?.publicUrl || null;
}

function parseRecordingTimestamp(path) {
  const value = String(path || '').trim();
  if (!value) return null;
  const match = value.match(/\/(\d{13})-[^/]+\.[a-z0-9]+$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickClosestRecordingPath(paths, targetMs) {
  if (!Array.isArray(paths) || !paths.length || !Number.isFinite(targetMs)) return null;
  let bestPath = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const path of paths) {
    const ts = parseRecordingTimestamp(path);
    if (!Number.isFinite(ts)) continue;
    const delta = Math.abs(ts - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestPath = path;
    }
  }
  return bestPath;
}

async function findLikelyVideoUrl({ userId, createdAt }) {
  const safeUserId = String(userId || '').trim();
  if (!safeUserId || !createdAt) return null;
  const sessionTs = new Date(createdAt).getTime();
  if (!Number.isFinite(sessionTs)) return null;
  const { data, error } = await supabase.storage
    .from(SESSION_MEDIA_BUCKET)
    .list(`${safeUserId}/video`, { limit: 200, sortBy: { column: 'name', order: 'desc' } });
  if (error || !Array.isArray(data) || !data.length) return null;
  const storagePaths = data
    .map((file) => file?.name ? `${safeUserId}/video/${file.name}` : null)
    .filter(Boolean);
  const closestPath = pickClosestRecordingPath(storagePaths, sessionTs);
  if (!closestPath) return null;
  return buildBucketPublicUrl(closestPath);
}

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

function DetailedFeedbackPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { state: locationState } = useLocation();
  const { currentSession, fetchSessionById, isLoading } = useSessionContext();
  const [isRecordingsOpen, setIsRecordingsOpen] = useState(true);
  const [isSessionInfoOpen, setIsSessionInfoOpen] = useState(false);
  const [recordingMedia, setRecordingMedia] = useState({ audioUrl: null, videoUrl: null });

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

  useEffect(() => {
    let isMounted = true;

    const loadSessionMedia = async () => {
      if (!sessionId) return;

      let audioUrl = null;
      let videoUrl = null;

      const { data: richMedia, error: richMediaErr } = await supabase
        .from('session_media')
        .select('audio_url')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (!richMediaErr && richMedia) {
        audioUrl = richMedia.audio_url ?? null;
      } else {
        const { data: basicMedia } = await supabase
          .from('session_media')
          .select('audio_url')
          .eq('session_id', sessionId)
          .maybeSingle();
        audioUrl = basicMedia?.audio_url ?? null;
      }

      if (!videoUrl) {
        videoUrl = await findLikelyVideoUrl({
          userId: session?.user_id,
          createdAt: session?.created_at,
        });
      }

      if (!isMounted) return;
      setRecordingMedia({
        audioUrl: buildBucketPublicUrl(audioUrl),
        videoUrl: buildBucketPublicUrl(videoUrl),
      });
    };

    loadSessionMedia();
    return () => { isMounted = false; };
  }, [session?.created_at, session?.user_id, sessionId]);

  if (isLoading && !session) {
    return (
      <div className="df-page">
        <div className="df-loading">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="df-page">
        <div className="df-empty">
          <p className="df-empty-title">Session not found</p>
          <button className="df-btn df-btn-primary" onClick={() => navigate(ROUTES.DASHBOARD)}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const tripleV = getTripleVScores(session);
  const overallTier = getScoreTier15(tripleV.entryPoint);
  const levelInfo = session.level_label
    ? { level: session.level, label: session.level_label }
    : getLevelFromScore(tripleV.entryPoint);

  const mode = getSessionMode(session);
  const isFreeSession = getSessionSpeechType(session) === 'Free Speech';
  const durationSec = Math.max(1, Math.round(session?.duration_sec ?? session?.duration ?? 1));
  const practicedText = sanitizeTranscriptForDisplay(session?.transcript, '')
    || 'No recorded text available.';
  const audioUrl = recordingMedia.audioUrl
    || buildBucketPublicUrl(session?.audio_url)
    || null;
  const videoUrl = recordingMedia.videoUrl
    || buildBucketPublicUrl(session?.video_url)
    || buildBucketPublicUrl(session?.video_storage_url)
    || null;
  const replayAction = buildReplayAction(session, navigate, isFreeSession);

  const sourceNav = locationState?.source;
  let breadcrumbParent = mode === 'Practice' ? 'Practice' : 'Training';
  let breadcrumbRoute = mode === 'Practice' ? ROUTES.PRACTICE : ROUTES.TRAINING_SETUP;
  if (sourceNav === 'progress') {
    breadcrumbParent = 'Progress';
    breadcrumbRoute = ROUTES.PROGRESS;
  } else if (sourceNav === 'notification') {
    breadcrumbParent = 'Dashboard';
    breadcrumbRoute = locationState?.backTo || ROUTES.DASHBOARD;
  }

  const visualSubMetrics = [
    { label: 'Eye Contact', score: subMetric100to15(session?.facial_expression_score ?? session?.eye_contact_score) },
    { label: 'Gestures', score: subMetric100to15(session?.gesture_score) },
  ].filter((m) => m.score !== null);

  const vocalSubMetrics = [
    { label: 'Jitter Control', score: invertedSubMetric(session?.jitter_score) },
    { label: 'Shimmer Control', score: invertedSubMetric(session?.shimmer_score) },
  ].filter((m) => m.score !== null);

  const verbalSubMetrics = [
    { label: 'Pronunciation', score: subMetric100to15(session?.pronunciation_score) },
    ...(isFreeSession
      ? [{ label: 'Context Relevance', score: subMetric100to15(session?.context_score) }]
      : []),
  ].filter((m) => m.score !== null);

  const pillars = [
    {
      key: 'visual',
      label: 'Visual',
      desc: 'Eye contact, facial expressions, and body gestures',
      score: tripleV.visualAvg,
      subMetrics: visualSubMetrics,
    },
    {
      key: 'vocal',
      label: 'Vocal',
      desc: 'Voice pitch stability, volume consistency, and clarity',
      score: tripleV.vocalAvg,
      subMetrics: vocalSubMetrics,
    },
    {
      key: 'verbal',
      label: 'Verbal',
      desc: 'Pronunciation accuracy and topical relevance',
      score: tripleV.verbalAvg,
      subMetrics: verbalSubMetrics,
    },
  ];

  const timelinePoints = (() => {
    const pointCount = clamp(Math.floor(durationSec / 15) + 1, 4, 8);
    return Array.from({ length: pointCount }, (_, idx) => {
      const progress = pointCount === 1 ? 1 : idx / (pointCount - 1);
      const timeSec = idx === pointCount - 1 ? durationSec : Math.round(durationSec * progress);

      const values = {};
      pillars.forEach((p, pIdx) => {
        const pct = scoreBarPercent(p.score);
        const variance = 8 + (100 - pct) * 0.08;
        const phase = progress * Math.PI * 1.6 + pIdx * 0.75;
        const wave = Math.sin(phase) * variance * 0.5 + Math.cos(phase * 0.7) * variance * 0.25;
        const momentum = (progress - 0.5) * ((pct - 50) / 12);
        values[p.key] = clamp(Math.round(pct + wave + momentum));
      });

      return { idx, timeSec, label: formatDuration(timeSec), values };
    });
  })();

  const pillarColors = { visual: FOREST_GREEN, vocal: SOFT_SAGE, verbal: VIBRANT_ORANGE };

  const recommendations = (() => {
    const apiRecs = sanitizeRecommendationLines(
      Array.isArray(session?.recommendations) ? session.recommendations : [],
    );

    const pillarTips = pillars
      .filter((p) => p.score < 3.0)
      .map((p) => {
        if (p.key === 'visual') return { pillar: 'Visual', text: 'Improve visual presence — maintain natural eye contact and use purposeful gestures.' };
        if (p.key === 'vocal') return { pillar: 'Vocal', text: 'Steady your voice — practice deep breathing for pitch and volume control.' };
        return { pillar: 'Verbal', text: 'Articulate more clearly — slow down on complex words and stay on topic.' };
      });

    const apiTipsMapped = apiRecs.map((rec, idx) => {
      const p = pillars[idx % pillars.length];
      return { pillar: p.label, text: rec };
    });

    const all = [...pillarTips, ...apiTipsMapped];
    const unique = [];
    const seen = new Set();
    for (const tip of all) {
      if (!seen.has(tip.text)) {
        seen.add(tip.text);
        unique.push(tip);
      }
    }

    if (unique.length === 0) {
      unique.push({ pillar: 'Overall', text: 'Great job! Keep up the excellent work across all areas.' });
    }

    return unique;
  })();

  return (
    <div className="df-page">
      {/* Breadcrumb */}
      <nav className="df-breadcrumb">
        <button
          type="button"
          className="df-breadcrumb-link"
          onClick={() => navigate(breadcrumbRoute, { replace: true })}
        >
          {breadcrumbParent}
        </button>
        <IoChevronForward className="df-breadcrumb-sep" />
        <button
          type="button"
          className="df-breadcrumb-link"
          onClick={() => navigate(`/session/${sessionId}/result`, {
            state: {
              ...session,
              source: locationState?.source,
              backTo: locationState?.backTo,
            },
          })}
        >
          Session Analysis Result
        </button>
        <IoChevronForward className="df-breadcrumb-sep" />
        <span className="df-breadcrumb-current">Detailed Feedback</span>
      </nav>

      {/* Overall Score Hero */}
      <section className="df-hero">
        <div className="df-hero-top">
          <p className="df-hero-kicker">Overall Speaking Score</p>
          <span
            className="df-hero-tier"
            style={{ background: `${overallTier.color}1A`, color: overallTier.color }}
          >
            {overallTier.label}
          </span>
        </div>
        <div className="df-hero-score-wrap">
          <p className="df-hero-score">{tripleV.entryPoint.toFixed(1)}</p>
          <span className="df-hero-max">/ 5.0</span>
        </div>
        <div className="df-hero-track">
          <div
            className="df-hero-track-fill"
            style={{ width: `${scoreBarPercent(tripleV.entryPoint)}%` }}
          />
        </div>
        <p className="df-hero-level">
          Level {levelInfo.level} — {levelInfo.label}
        </p>
      </section>

      {/* Performance Timeline */}
      <section className="df-timeline-section">
        <h2 className="df-section-title">Performance Timeline</h2>
        <div className="df-card">
          <div className="df-timeline">
            {timelinePoints.map((point) => (
              <div key={point.idx} className="df-timeline-col">
                <div className="df-timeline-col-bg" />
                <div
                  className="df-timeline-col-bars"
                  style={{ '--timeline-bar-count': pillars.length }}
                >
                  {pillars.map((p) => (
                    <div key={`${point.idx}-${p.key}`} className="df-timeline-bar-wrap">
                      <div
                        className="df-timeline-bar"
                        style={{ height: `${point.values[p.key]}%`, background: pillarColors[p.key] }}
                      />
                    </div>
                  ))}
                </div>
                <span className="df-timeline-time">{point.label}</span>
              </div>
            ))}
          </div>
          <div className="df-timeline-legend">
            {pillars.map((p) => (
              <span key={p.key} className="df-legend-item">
                <i className="df-legend-dot" style={{ background: pillarColors[p.key] }} />
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Triple V Pillar Detail Cards */}
      <section className="df-pillars-section">
        <h2 className="df-section-title">Triple V Breakdown</h2>
        <div className="df-pillars-list">
          {pillars.map((p) => {
            const tier = getScoreTier15(p.score);
            return (
              <div key={p.key} className="df-pillar-card">
                <div className="df-pillar-main">
                  <div className="df-pillar-info">
                    <span className="df-pillar-label">{p.label}</span>
                    <span className="df-pillar-tier" style={{ color: tier.color }}>{tier.label}</span>
                  </div>
                  <div className="df-pillar-score-row">
                    <p className="df-pillar-score">{p.score.toFixed(1)}<span>/5.0</span></p>
                  </div>
                  <p className="df-pillar-desc">{p.desc}</p>
                  <div className="df-pillar-track">
                    <div
                      className="df-pillar-track-fill"
                      style={{ width: `${scoreBarPercent(p.score)}%`, background: tier.color }}
                    />
                  </div>
                </div>

                {p.subMetrics.length > 0 && (
                  <div className="df-pillar-subs">
                    {p.subMetrics.map((sub) => {
                      const subTier = getScoreTier15(sub.score);
                      return (
                        <div key={sub.label} className="df-sub-metric">
                          <div className="df-sub-header">
                            <span className="df-sub-label">{sub.label}</span>
                            <span className="df-sub-score">{sub.score.toFixed(1)}</span>
                          </div>
                          <div className="df-sub-track">
                            <div
                              className="df-sub-track-fill"
                              style={{ width: `${scoreBarPercent(sub.score)}%`, background: subTier.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recommendations */}
      <section className="df-recs-section">
        <h2 className="df-section-title">Coaching Recommendations</h2>
        <div className="df-recs-list">
          {recommendations.map((tip, idx) => (
            <div key={idx} className="df-rec-card">
              <span className="df-rec-pillar">{tip.pillar}</span>
              <p className="df-rec-text">{tip.text}</p>
            </div>
          ))}
        </div>
        {recommendations.some((t) => t.pillar !== 'Overall') && (
          <button
            className="df-hub-link"
            onClick={() => navigate(ROUTES.FRAMEWORKS)}
            type="button"
          >
            Visit Training Hub →
          </button>
        )}
      </section>

      {/* Session Recordings — always show; media loaded from session_media + session row */}
      <div className="df-collapsible">
        <button
          className="df-collapsible-toggle"
          onClick={() => setIsRecordingsOpen((o) => !o)}
          type="button"
          aria-expanded={isRecordingsOpen}
        >
          <span className="df-collapsible-label">Session Recordings</span>
          <IoChevronDown className={`df-collapsible-icon${isRecordingsOpen ? ' open' : ''}`} />
        </button>
        {isRecordingsOpen && (
          <div className="df-collapsible-body">
            {videoUrl && (
              <div className="df-video-wrap">
                <video className="df-video" controls preload="metadata" src={videoUrl}>
                  Your browser does not support video playback.
                </video>
              </div>
            )}
            {audioUrl && (
              <audio className="df-audio" controls preload="metadata" src={audioUrl}>
                Your browser does not support audio playback.
              </audio>
            )}
            {!videoUrl && !audioUrl && (
              <p className="df-recordings-empty">
                No video or voice recording is stored for this session. New sessions save recordings when
                session persistence and storage are enabled.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Session Information */}
      <div className="df-collapsible">
        <button
          className="df-collapsible-toggle"
          onClick={() => setIsSessionInfoOpen((o) => !o)}
          type="button"
          aria-expanded={isSessionInfoOpen}
        >
          <span className="df-collapsible-label">Session Information</span>
          <IoChevronDown className={`df-collapsible-icon${isSessionInfoOpen ? ' open' : ''}`} />
        </button>
        {isSessionInfoOpen && (
          <div className="df-collapsible-body">
            {session.created_at && (
              <div className="df-info-row">
                <span className="df-info-key">Date</span>
                <span className="df-info-val">{formatDate(session.created_at)}</span>
              </div>
            )}
            <div className="df-info-row">
              <span className="df-info-key">Duration</span>
              <span className="df-info-val">{formatDuration(durationSec)}</span>
            </div>
            <div className="df-info-row">
              <span className="df-info-key">Mode</span>
              <span className="df-info-val">{mode}</span>
            </div>
            <div className="df-info-row">
              <span className="df-info-key">Type</span>
              <span className="df-info-val">{isFreeSession ? 'Free Speech' : 'Scripted'}</span>
            </div>
            <div className="df-practiced-section">
              <p className="df-practiced-label">Practiced Text</p>
              <p className="df-practiced-text">{practicedText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="df-actions">
        <button className="df-btn df-btn-secondary" onClick={() => navigate(-1)}>
          Back
        </button>
        <button className="df-btn df-btn-primary" onClick={replayAction.onClick}>
          {replayAction.label}
        </button>
      </div>
    </div>
  );
}

export default DetailedFeedbackPage;
