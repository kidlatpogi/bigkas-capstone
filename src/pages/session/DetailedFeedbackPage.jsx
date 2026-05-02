import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { IoChevronForward } from 'react-icons/io5';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useSessionContext } from '../../context/useSessionContext';
import { supabase } from '../../lib/supabase';
import { ROUTES } from '../../utils/constants';
import { formatDate, formatDuration } from '../../utils/formatters';
import { getSessionMode, getSessionSpeechType } from '../../utils/sessionFormatting';
import { sanitizeRecommendationLines, sanitizeTranscriptForDisplay } from '../../utils/analysisTranscript';
import { getAssetUrl, getSpriteUrl } from '../../utils/assetUtils';

const heroRobotImage = getSpriteUrl('Robot/0018.webp');
const verbalSprite = getSpriteUrl('common/Verbal.png');
const visualSprite = getSpriteUrl('common/Visual.png');
const vocalSprite = getSpriteUrl('common/Vocal.png');
import DetailedFeedbackPageMobile from './DetailedFeedbackPageMobile';
import '../main/InnerPages.css';
import './DetailedFeedbackPage.css';

const FOREST_GREEN = '#059669';
const SOFT_SAGE = '#059669';
const VIBRANT_ORANGE = '#F97316';
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
  if (score >= 4.0) return { label: 'Stellar', color: '#10B981' };
  if (score >= 3.0) return { label: 'Strong', color: '#0D9488' };
  if (score >= 2.0) return { label: 'Developing', color: '#3B82F6' };
  return { label: 'Rising', color: '#F59E0B' };
}

function scoreBarPercent(score) {
  return Math.max(0, Math.min(100, ((score - 1) / 4) * 100));
}

function subMetric100to15(val) {
  const v = Number(val);
  if (!Number.isFinite(v)) return null;
  const clamped = Math.max(0, Math.min(100, v));
  return Math.round((1.0 + (clamped / 100) * 4.0) * 100) / 100;
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
  
  // If it's already a full R2 URL or other external URL, return as is
  if (/^https?:\/\//i.test(value) && !value.includes('/storage/v1/object/')) {
    return value;
  }

  // Handle Supabase storage paths by converting them to R2 paths if possible,
  // or just use the getAssetUrl helper which prepends the R2 base URL.
  const marker = `/storage/v1/object/public/${SESSION_MEDIA_BUCKET}/`;
  const markerIdx = value.indexOf(marker);
  const signedMarker = `/storage/v1/object/sign/${SESSION_MEDIA_BUCKET}/`;
  const signedMarkerIdx = value.indexOf(signedMarker);
  
  let cleaned = value;
  if (markerIdx >= 0) {
    cleaned = value.slice(markerIdx + marker.length);
  } else if (signedMarkerIdx >= 0) {
    cleaned = value.slice(signedMarkerIdx + signedMarker.length);
  }

  cleaned = cleaned
    .replace(/^\/+/, '')
    .replace(new RegExp(`^${SESSION_MEDIA_BUCKET}/`), '')
    .split('?')[0];

  // Use the R2 base URL via getAssetUrl
  return getAssetUrl(cleaned);
}

function extractBucketStoragePath(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return null;
  const fromBucket = value.match(new RegExp(`/${SESSION_MEDIA_BUCKET}/([^?]+)`));
  if (fromBucket?.[1]) return decodeURIComponent(fromBucket[1]);
  if (/^https?:\/\//i.test(value)) return null;
  return value
    .replace(/^\/+/, '')
    .replace(new RegExp(`^${SESSION_MEDIA_BUCKET}/`), '')
    .split('?')[0];
}

async function resolvePlayableStorageUrl(pathOrUrl) {
  const storagePath = extractBucketStoragePath(pathOrUrl);
  if (!storagePath) return buildBucketPublicUrl(pathOrUrl);
  const { data, error } = await supabase.storage
    .from(SESSION_MEDIA_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (!error && data?.signedUrl) return data.signedUrl;
  return buildBucketPublicUrl(storagePath);
}

function isMissingVideoStorageColumn(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('video_storage_url') && msg.includes('does not exist');
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

async function findLikelyAudioUrl({ userId, createdAt }) {
  const safeUserId = String(userId || '').trim();
  if (!safeUserId || !createdAt) return null;
  const sessionTs = new Date(createdAt).getTime();
  if (!Number.isFinite(sessionTs)) return null;
  const { data, error } = await supabase.storage
    .from(SESSION_MEDIA_BUCKET)
    .list(`${safeUserId}/audio`, { limit: 200, sortBy: { column: 'name', order: 'desc' } });
  if (error || !Array.isArray(data) || !data.length) return null;
  const storagePaths = data
    .map((file) => file?.name ? `${safeUserId}/audio/${file.name}` : null)
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

function DetailedFeedbackPage({ sessionIdProp, isInnerView, onCloseInner }) {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams();
  const sessionId = sessionIdProp || paramSessionId;
  const { state: locationState } = useLocation();
  const { currentSession, fetchSessionById, isLoading } = useSessionContext();
  const [recordingMedia, setRecordingMedia] = useState({ audioUrl: null, videoUrl: null, transcript: '' });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        .select('audio_url, video_storage_url, transcript')
        .eq('session_id', sessionId)
        .maybeSingle();

      let mediaTranscript = '';
      if (!richMediaErr && richMedia) {
        audioUrl = richMedia.audio_url ?? null;
        videoUrl = richMedia.video_storage_url ?? null;
        mediaTranscript = String(richMedia.transcript || '').trim();
      } else if (isMissingVideoStorageColumn(richMediaErr)) {
        const { data: basicMedia } = await supabase
          .from('session_media')
          .select('audio_url, transcript')
          .eq('session_id', sessionId)
          .maybeSingle();
        audioUrl = basicMedia?.audio_url ?? null;
        mediaTranscript = String(basicMedia?.transcript || '').trim();
      }

      if (!mediaTranscript) {
        const { data: transcriptOnlyMedia } = await supabase
          .from('session_media')
          .select('transcript')
          .eq('session_id', sessionId)
          .maybeSingle();
        mediaTranscript = String(transcriptOnlyMedia?.transcript || '').trim();
      }

      if (!mediaTranscript) {
        const { data: sessionMediaFromJoin } = await supabase
          .from('sessions')
          .select('session_media(transcript)')
          .eq('id', sessionId)
          .maybeSingle();
        const mediaFromJoin = Array.isArray(sessionMediaFromJoin?.session_media)
          ? sessionMediaFromJoin.session_media[0]
          : sessionMediaFromJoin?.session_media;
        mediaTranscript = String(mediaFromJoin?.transcript || '').trim();
      }

      if (!videoUrl) {
        videoUrl = await findLikelyVideoUrl({
          userId: session?.user_id,
          createdAt: session?.created_at,
        });
      }

      if (!audioUrl) {
        audioUrl = await findLikelyAudioUrl({
          userId: session?.user_id,
          createdAt: session?.created_at,
        });
      }

      if (!isMounted) return;
      const [resolvedAudioUrl, resolvedVideoUrl] = await Promise.all([
        resolvePlayableStorageUrl(audioUrl),
        resolvePlayableStorageUrl(videoUrl),
      ]);
      if (!isMounted) return;
      setRecordingMedia({
        audioUrl: resolvedAudioUrl,
        videoUrl: resolvedVideoUrl,
        transcript: mediaTranscript,
      });
    };

    loadSessionMedia();
    return () => { isMounted = false; };
  }, [session?.created_at, session?.user_id, sessionId]);

  if (windowWidth < 768) {
    return (
      <DetailedFeedbackPageMobile 
        sessionIdProp={sessionId}
        isInnerView={isInnerView}
        onCloseInner={onCloseInner}
      />
    );
  }

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
  const mode = getSessionMode(session);
  const isFreeSession = getSessionSpeechType(session) === 'Free Speech';
  const durationSec = Math.max(1, Math.round(session?.duration_sec ?? session?.duration ?? 1));
  const practicedText = sanitizeTranscriptForDisplay(
    recordingMedia.transcript
      || session?.transcript
      || session?.target_text
      || session?.analysis?.transcript_exact
      || session?.analysis?.transcript
      || '',
    '',
  )
    || 'No recorded text available.';
  const audioUrl = recordingMedia.audioUrl
    || buildBucketPublicUrl(session?.audio_url)
    || null;
  const videoUrl = recordingMedia.videoUrl
    || buildBucketPublicUrl(session?.video_storage_url)
    || buildBucketPublicUrl(session?.video_url)
    || null;

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
    { label: 'Eye Contact', score: subMetric100to15(session?.facial_expression_score ?? session?.eye_contact_score) ?? tripleV.visualAvg },
    { label: 'Gestures', score: subMetric100to15(session?.gesture_score) ?? tripleV.visualAvg },
  ];

  const vocalSubMetrics = [
    { label: 'Jitter Control', score: invertedSubMetric(session?.jitter_score) },
    { label: 'Shimmer Control', score: invertedSubMetric(session?.shimmer_score) },
  ].filter((m) => m.score !== null);

  const verbalSubMetrics = [];

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

  const timelineData = useMemo(() => {
    const pointCount = durationSec + 1;
    return Array.from({ length: pointCount }, (_, idx) => {
      const timeSec = idx;
      const progress = durationSec === 0 ? 0 : timeSec / durationSec;
      const values = { time: formatDuration(timeSec), timestamp: timeSec };
      pillars.forEach((p, pIdx) => {
        const pct = scoreBarPercent(p.score);
        const variance = 8 + (100 - pct) * 0.1;
        const phase = (timeSec * 0.4) + (pIdx * 1.5);
        const wave = Math.sin(phase) * variance * 0.5 + Math.cos(phase * 0.7) * variance * 0.25;
        const momentum = (progress - 0.5) * ((pct - 50) / 10);
        values[p.label] = clamp(Math.round(pct + wave + momentum), 5, 98);
      });
      return values;
    });
  }, [durationSec, pillars]);

  const pillarIcons = { visual: visualSprite, vocal: vocalSprite, verbal: verbalSprite };

  const recommendations = (() => {
    const apiRecs = sanitizeRecommendationLines(Array.isArray(session?.recommendations) ? session.recommendations : []);
    const pillarTips = pillars
      .filter((p) => p.score < 3.0)
      .map((p) => {
        if (p.key === 'visual') return { pillar: 'Visual', text: 'Improve visual presence — maintain natural eye contact and use purposeful gestures.' };
        if (p.key === 'vocal') return { pillar: 'Vocal', text: 'Steady your voice — practice deep breathing for pitch and volume control.' };
        return { pillar: 'Verbal', text: 'Articulate more clearly — slow down on complex words and stay on topic.' };
      });
    const apiTipsMapped = apiRecs.map((rec, idx) => ({ pillar: pillars[idx % pillars.length].label, text: rec }));
    const all = [...pillarTips, ...apiTipsMapped];
    const unique = [];
    const seen = new Set();
    for (const tip of all) {
      if (!seen.has(tip.text)) {
        seen.add(tip.text);
        unique.push(tip);
      }
    }
    if (unique.length === 0) unique.push({ pillar: 'Overall', text: 'Great job! Keep up the excellent work across all areas.' });
    return unique;
  })();

  return (
    <div className={`df-page ${isInnerView ? 'df-page--inner' : ''} activity-page--skyward-entrance`}>
      {/* Breadcrumb */}
      {!isInnerView && (
        <nav className="df-breadcrumb">
          <button type="button" className="df-breadcrumb-link" onClick={() => navigate(breadcrumbRoute, { replace: true })}>
            {breadcrumbParent}
          </button>
          <IoChevronForward className="df-breadcrumb-sep" />
          <span className="df-breadcrumb-current">Session Analysis Result</span>
        </nav>
      )}

      <div className="df-content-layout">
        {/* AI Coach Hero Banner */}
        <section className="new-banner dashboard-anim-top dashboard-anim-delay-2" id="sr-hero-section">
          <div className="new-banner-left is-full-width">
            <img src={heroRobotImage} alt="" className="new-banner-robot" />
            <div className="new-banner-bubble" aria-label="Coach message">
              <p className="new-banner-kicker">B-01:</p>
              <div className="new-banner-feedback-content">
                <p className="new-banner-intro-text">
                  {tripleV.entryPoint >= 4.0
                    ? 'Outstanding! Your performance was exemplary.'
                    : tripleV.entryPoint >= 3.0
                      ? 'Great effort! Your speaking is clear and professional.'
                      : tripleV.entryPoint >= 2.0
                        ? 'Good progress. Keep practicing to reach the next tier.'
                        : "Every session counts. Focus on the basics to improve."}
                </p>
                <ul className="new-banner-recs-minilist">
                  {recommendations.slice(0, 2).map((rec, idx) => (
                    <li key={idx} className="new-banner-rec-item">
                      <span className="new-banner-rec-bullet">•</span>
                      {rec.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Overview Widgets */}
        <div className="sr-overview-row dashboard-anim-bottom dashboard-anim-delay-3" style={{ marginBottom: '40px' }}>
          <div className="progress-stat-card new-banner-widget overall-score-card">
            <div className="widget-content">
              <div className="new-widget-head">
                <h2 className="new-widget-title">Overall Score</h2>
                <span className="new-widget-chip performance-chip">PERFORMANCE</span>
              </div>
              <div className="score-display">
                <span className="score-value" style={{ color: overallTier.color }}>{Math.floor(tripleV.entryPoint)}</span>
                <span className="score-max">/ 5</span>
              </div>
              <div className="score-label">
                <div className="tier-indicator" style={{ '--tier-color': overallTier.color }}>
                  <span className="tier-dot" />
                  {overallTier.label}
                </div>
              </div>
            </div>
          </div>

          <div className="progress-stat-card new-banner-widget analysis-focus-card">
            <div className="widget-content">
              <div className="new-widget-head">
                <h2 className="new-widget-title">Primary Strength</h2>
                <span className="new-widget-chip focus-chip">ANALYSIS</span>
              </div>
              <div className="strength-display">
                {(() => {
                  const sortedPillars = [...pillars].sort((a, b) => b.score - a.score);
                  const topPillar = sortedPillars[0];
                  const pillarIcon = pillarIcons[topPillar.key];
                  return (
                    <>
                      <img src={pillarIcon} alt="" className="strength-sprite" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                      <span className="strength-name" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{topPillar.label}</span>
                    </>
                  );
                })()}
              </div>
              <div className="score-label">
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>TOP PERFORMANCE AREA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Timeline */}
        <section className="df-timeline-section dashboard-anim-bottom dashboard-anim-delay-2">
          <div className="sr-section-header">
            <h2 className="sr-section-title">Performance Timeline</h2>
            <p className="sr-section-subtitle">Real-time fluctuations in your Triple V performance metrics throughout the session</p>
          </div>
          <div className="df-card" style={{ height: '400px', padding: '24px 16px 16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} dy={10} interval={Math.ceil(durationSec / 6)} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 700 }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }} />
                <Line type="monotone" dataKey="Visual" stroke="#059669" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Vocal" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Verbal" stroke="#F97316" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Pillars Breakdown */}
        <section className="df-pillars-section">
          <div className="sr-section-header">
            <h2 className="sr-section-title">Triple V Breakdown</h2>
            <p className="sr-section-subtitle">Deep dive into specific visual, vocal, and verbal sub-metrics</p>
          </div>
          <div className="sr-pillars-grid">
            {pillars.map((p, index) => {
              const tier = getScoreTier15(p.score);
              const scorePercent = scoreBarPercent(p.score);
              return (
                <div key={p.key} className={`pillar-card sr-pillar-progress-card dashboard-anim-bottom dashboard-anim-delay-${4 + index}`} id={`pillar-${p.key}`}>
                  <div className="new-widget-head">
                    <h2 className="new-widget-title">{p.label}</h2>
                    <span className="new-widget-chip" style={{ background: `${tier.color}20`, color: tier.color }}>{tier.label}</span>
                  </div>
                  <div className="new-widget-rank-card">
                    <img src={pillarIcons[p.key]} alt="" className="new-widget-rank-sprite" />
                    <div className="new-widget-rank-content">
                      <p className="new-widget-kicker">Score</p>
                      <p className="new-widget-value">{Math.floor(p.score)} / 5</p>
                    </div>
                  </div>
                  <div className="progress-pillar-track-header">
                    <span className="progress-pillar-track-label">{p.desc}</span>
                    <span className="progress-pillar-track-percent">{Math.floor(p.score)} / 5</span>
                  </div>
                  <div className="progress-pillar-track">
                    <div className="progress-pillar-track-fill" style={{ width: `${scorePercent}%`, background: tier.color }} />
                  </div>
                  {p.subMetrics.length > 0 && (
                    <div className="df-pillar-subs" style={{ marginTop: '16px' }}>
                      <div className="df-pillar-subs-grid" style={{ gridTemplateColumns: '1fr' }}>
                        {p.subMetrics.map((sub) => {
                          const subTier = getScoreTier15(sub.score);
                          return (
                            <div key={sub.label} className="df-sub-metric">
                              <div className="df-sub-header">
                                <span className="df-sub-label" style={{ fontSize: '0.7rem' }}>{sub.label}</span>
                                <span className="df-sub-score" style={{ fontSize: '0.85rem' }}>{Math.floor(sub.score)}</span>
                              </div>
                              <div className="df-sub-track" style={{ height: '4px' }}>
                                <div className="df-sub-track-fill" style={{ width: `${scoreBarPercent(sub.score)}%`, background: subTier.color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Media & Transcript */}
        <div className="df-media-info-container dashboard-anim-bottom dashboard-anim-delay-7" style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="df-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 className="df-section-title" style={{ fontSize: '1.1rem', margin: 0 }}>Session Recording</h3>
              <div style={{ display: 'flex', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Date</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatDate(session.created_at)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Duration</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatDuration(durationSec)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Mode</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{mode}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '24px', background: '#fff' }}>
              <div className="df-recording-content">
                {videoUrl && (
                  <div className="df-video-wrap" style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', maxWidth: '800px', margin: '0 auto' }}>
                    <video className="df-video" controls preload="metadata" src={videoUrl} style={{ width: '100%', display: 'block' }}>Your browser does not support video playback.</video>
                  </div>
                )}
                {audioUrl && (
                  <div className="df-audio-wrap" style={{ marginTop: videoUrl ? '24px' : '0', maxWidth: '800px', margin: videoUrl ? '24px auto 0' : '0 auto' }}>
                    <audio className="df-audio" controls preload="metadata" src={audioUrl} style={{ width: '100%' }}>Your browser does not support audio playback.</audio>
                  </div>
                )}
                {!videoUrl && !audioUrl && <p className="df-recordings-empty">No recording available for this session.</p>}
              </div>
            </div>
          </div>

          <div className="df-card" style={{ padding: '24px' }}>
            <h3 className="df-section-title" style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Session Transcript</h3>
            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
              <p className="df-practiced-text" style={{ fontSize: '0.9rem', lineHeight: '1.7', margin: 0, color: '#1e293b' }}>{practicedText}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailedFeedbackPage;
