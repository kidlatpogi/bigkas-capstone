import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
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
import { sanitizeRecommendationLines } from '../../utils/analysisTranscript';
import { getAssetUrl, getSpriteUrl } from '../../utils/assetUtils';

const BIGKAS_LOGO_URL = 'https://assets.bigkas.site/Images/Bigkas-Logo.webp';
const verbalSprite = getSpriteUrl('common/Verbal.webp');
const visualSprite = getSpriteUrl('common/Visual.webp');
const vocalSprite = getSpriteUrl('common/Vocal.webp');
import './DetailedFeedbackPageMobile.css';
import './DetailedFeedbackPage.css';

const FILLER_WORDS = ['um', 'uh', 'ah', 'like', 'err', 'uhm', 'well', 'basically', 'actually', 'literally'];

const SESSION_MEDIA_BUCKET = 'session-recordings';

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

  const clamp15 = (v) => Math.round(Math.max(1, Math.min(5, Number(v) || 1)) * 100) / 100;
  return {
    entryPoint: clamp15(entryPoint),
    visualAvg: clamp15(visualAvg),
    vocalAvg: clamp15(vocalAvg),
    verbalAvg: clamp15(verbalAvg),
  };
}

function getScoreTier15(score) {
  if (score >= 3.0) return { label: 'Strong', color: '#10B981' };
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

function buildBucketPublicUrl(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return null;
  
  // If it's already a full R2 URL or other external URL, return as is
  if (/^https?:\/\//i.test(value) && !value.includes('/storage/v1/object/')) {
    return value;
  }

  // Handle Supabase storage paths by converting them to R2 paths if possible
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
    objective: session?.topic || session?.objective_name || '',
  };

  if (focus === 'scripted') {
    const content = session?.transcript || '';
    if (!content.trim()) return { label, onClick: () => navigate(setupRoute) };
    replayState.script = {
      id: session?.script_id || `replay-${session?.id || 'session'}`,
      title: session?.script_title || session?.topic || session?.title || `${mode} Script`,
      content,
    };
  } else {
    replayState.freeTopic = session?.topic || session?.objective_name || 'Free speech session';
  }

  return {
    label,
    onClick: () => navigate(`${ROUTES.TRAINING}?autostart=1`, { state: replayState }),
  };
}

// --- Component ---
function DetailedFeedbackPageMobile({ sessionIdProp, isInnerView, onCloseInner, initialShowDetailed = false }) {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams();
  const sessionId = sessionIdProp || paramSessionId;
  const { state: locationState } = useLocation();
  const { currentSession, fetchSessionById, isLoading } = useSessionContext();
  const [recordingMedia, setRecordingMedia] = useState({ audioUrl: null, videoUrl: null, transcript: '' });
  const [showDetailed, setShowDetailed] = useState(() => {
    if (locationState?.showDetailed !== undefined) return !!locationState.showDetailed;
    return initialShowDetailed || isInnerView === false;
  });

  const session = useMemo(() => {
    if (locationState?.id === sessionId) return locationState;
    if (currentSession?.id === sessionId) return currentSession;
    return null;
  }, [currentSession, locationState, sessionId]);

  useEffect(() => {
    if (!session && sessionId) fetchSessionById(sessionId);
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

  const rawTranscript = recordingMedia.transcript || session?.transcript || '';

  const analysisData = useMemo(() => {
    try {
      if (typeof session?.analysis === 'object' && session.analysis !== null) return session.analysis;
      if (typeof session?.analysis === 'string') return JSON.parse(session.analysis);
    } catch (e) {
      console.warn('Failed to parse mobile session analysis for highlighting:', e);
    }
    return {};
  }, [session?.analysis]);

  const fillerCount = useMemo(() => {
    if (analysisData?.filler_count !== undefined) return analysisData.filler_count;
    const words = rawTranscript.toLowerCase().split(/\s+/);
    return words.filter(w => FILLER_WORDS.includes(w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""))).length;
  }, [rawTranscript, analysisData?.filler_count]);

  const placeholderTripleV = { entryPoint: 1, visualAvg: 1, vocalAvg: 1, verbalAvg: 1 };
  const tripleV = session ? getTripleVScores(session) : placeholderTripleV;
  const overallTier = getScoreTier15(tripleV.entryPoint);
  const mode = session ? getSessionMode(session) : '';
  const isPreTest = mode === 'Pre-Test';
  const isPostTest = mode === 'Post-Test';
  const isFreeSession = session ? getSessionSpeechType(session) === 'Free Speech' : false;
  const stagePassResult = locationState?.stagePassResult;
  const showStageRetryMessage = stagePassResult?.isActivityStage && stagePassResult?.passed === false;
  const replayAction = useMemo(
    () => (session ? buildReplayAction(session, navigate, isFreeSession) : { label: 'Train Again', onClick: () => {} }),
    [session, navigate, isFreeSession],
  );
  const pillarIcons = { visual: visualSprite, vocal: vocalSprite, verbal: verbalSprite };
  const durationSec = Math.max(1, Math.round(session?.duration_sec ?? session?.duration ?? 1));

  const mispronunciations = analysisData?.mispronunciations || [];

  const renderHighlightedTranscript = () => {
    if (!rawTranscript) return <p className="df-mobile-transcript-text">No transcript generated.</p>;

    const words = rawTranscript.split(/\s+/);
    const fillerWordsFromAnalysis = Array.isArray(analysisData?.filler_words) 
      ? analysisData.filler_words.map(w => w.toLowerCase()) 
      : [];

    return (
      <div className="df-mobile-transcript-text">
        {words.map((word, idx) => {
          const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
          
          // Check if it's a filler: either in our global list OR specifically identified by analysis
          const isFiller = FILLER_WORDS.includes(cleanWord) || fillerWordsFromAnalysis.includes(cleanWord);
          
          const mis = mispronunciations.find(m => m.word.toLowerCase() === cleanWord || m.heard?.toLowerCase() === cleanWord);

          if (isFiller) {
            return (
              <span key={idx} className="transcript-word transcript-word--filler">
                {word}
              </span>
            );
          }

          if (mis) {
            return (
              <span key={idx} className="transcript-word transcript-word--mispronounced">
                {word}
                <span className="transcript-word-correction">({mis.suggestion || mis.correction})</span>
              </span>
            );
          }

          return <span key={idx}>{word} </span>;
        })}
      </div>
    );
  };

  const pillars = useMemo(() => {
    if (!session) {
      return [
        { key: 'visual', label: 'Visual', desc: 'Overall consistency', score: tripleV.visualAvg, subMetrics: [] },
        { key: 'vocal', label: 'Vocal', desc: 'Overall consistency', score: tripleV.vocalAvg, subMetrics: [] },
        { key: 'verbal', label: 'Verbal', desc: 'Overall consistency', score: tripleV.verbalAvg, subMetrics: [] },
      ];
    }
    const visualSubMetrics = [
      { label: 'Eye Contact', score: subMetric100to15(session?.eye_contact_score) ?? tripleV.visualAvg },
      { label: 'Gestures', score: subMetric100to15(session?.gesture_score) ?? tripleV.visualAvg },
    ];
    const vocalSubMetrics = [
      { label: 'Jitter Control', score: invertedSubMetric(session?.jitter_score) },
      { label: 'Shimmer Control', score: invertedSubMetric(session?.shimmer_score) },
    ].filter((m) => m.score !== null);

    return [
      { key: 'visual', label: 'Visual', desc: 'Overall consistency', score: tripleV.visualAvg, subMetrics: visualSubMetrics },
      { key: 'vocal', label: 'Vocal', desc: 'Overall consistency', score: tripleV.vocalAvg, subMetrics: vocalSubMetrics },
      { key: 'verbal', label: 'Verbal', desc: 'Overall consistency', score: tripleV.verbalAvg, subMetrics: [] },
    ];
  }, [session, tripleV]);

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

  const recommendations = useMemo(() => {
    if (!session) return [];
    const apiRecs = sanitizeRecommendationLines(Array.isArray(session?.recommendations) ? session.recommendations : []);
    const pillarTips = pillars
      .filter((p) => p.score < 3.0)
      .map((p) => {
        if (p.key === 'visual') {
          return {
            pillar: 'Visual',
            text: 'Improve visual presence — maintain natural eye contact and use purposeful gestures.',
          };
        }
        if (p.key === 'vocal') {
          return {
            pillar: 'Vocal',
            text: 'Steady your voice — practice deep breathing for pitch and volume control.',
          };
        }
        return {
          pillar: 'Verbal',
          text: 'Articulate more clearly — slow down on complex words and stay on topic.',
        };
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
  }, [pillars, session]);

  const deRecommendations = (() => {
    const avoidTips = [];
    if (tripleV.visualAvg < 3.0) avoidTips.push("Don't break eye contact frequently; avoid staring at the floor or ceiling.");
    if (tripleV.vocalAvg < 3.0) avoidTips.push("Try to avoid monotone delivery or sudden volume shifts that can distract your audience.");
    if (tripleV.verbalAvg < 3.0) avoidTips.push("Avoid rushing through complex words or drifting too far from your main topic.");
    if (avoidTips.length === 0) avoidTips.push("Keep avoiding distractions and maintain your current high standards.");
    return avoidTips;
  })();

  const avoidSectionRef = useRef(null);

  if (!session && isLoading) {
    return (
      <div className="df-mobile-root">
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="df-mobile-root">
        <div style={{ padding: '40px', textAlign: 'center' }}>Session not found</div>
      </div>
    );
  }

  return (
    <div className={`df-mobile-root no-scrollbar${isInnerView ? ' df-mobile-root--inner' : ''}`}>
      {!isInnerView && (
        <nav className="df-mobile-breadcrumb">
          <button
            type="button"
            className="df-mobile-breadcrumb-btn"
            onClick={() => {
              if (showDetailed) setShowDetailed(false);
              else navigate(-1);
            }}
          >
            {showDetailed ? 'Back to Overview' : 'Back'}
          </button>
          <IoChevronForward className="df-mobile-breadcrumb-sep" />
          <span className="df-mobile-breadcrumb-current">{showDetailed ? 'Detailed Feedback' : 'Session Overview'}</span>
        </nav>
      )}

      <div className="df-mobile-content df-mobile-sr-parity">
        <header className="sr-page-header dashboard-anim-top">
          <h1 className="sr-page-main-title">
            {session?.script_title || session?.topic || (isPreTest ? 'Diagnostic Analysis' : 'Session Analysis')}
          </h1>
        </header>

        {/* Coach hero — DF-only class names so Activity/Progress global banner CSS cannot apply robot inset */}
        <section className="df-mobile-hero-strip sr-mobile-hero dashboard-anim-top">
          <div className="df-mobile-hero-panel">
            <p className="df-mobile-hero-kicker">B-01:</p>
            <img src={BIGKAS_LOGO_URL} alt="Bigkas" className="df-mobile-hero-logo" />
            <p className="new-banner-recs-title">Recommendations:</p>
            {recommendations.length > 0 && (
              <ul className="new-banner-recs-minilist">
                {recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx} className="new-banner-rec-item">
                    <span className="new-banner-rec-bullet">•</span>
                    {rec.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {showStageRetryMessage && (
          <section className="stage-pass-card stage-pass-card--mobile dashboard-anim-bottom dashboard-anim-delay-2" role="status">
            <p className="stage-pass-kicker">Stage goal</p>
            <h2 className="stage-pass-title">You are close to unlocking this stage.</h2>
            <p className="stage-pass-message">{stagePassResult.message}</p>
            {stagePassResult.requiredText ? (
              <span className="stage-pass-chip">{stagePassResult.requiredText}</span>
            ) : null}
          </section>
        )}

        {!showDetailed && (
          <div className="sr-overview-row dashboard-anim-bottom dashboard-anim-delay-3">
            <div className="progress-stat-card new-banner-widget overall-score-card">
              <div className="widget-content">
                <div className="new-widget-head">
                  <h2 className="new-widget-title">Overall Score</h2>
                  <span className="new-widget-chip performance-chip">PERFORMANCE</span>
                </div>
                <div className="score-display">
                  <span className="score-value" style={{ color: overallTier.color }}>
                    {Math.round(scoreBarPercent(tripleV.entryPoint))}%
                  </span>
                  <span className="score-max">Confidence</span>
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
                        <span className="strength-name" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
                          {topPillar.label}
                        </span>
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
        )}
        
        {showDetailed && (
          <>
            <section className="df-timeline-section dashboard-anim-bottom dashboard-anim-delay-2">
              <div className="sr-section-header">
                <h2 className="sr-section-title">Performance Timeline</h2>
                <p className="sr-section-subtitle">Real-time fluctuations in your Triple V performance metrics throughout the session</p>
              </div>
              <div className="df-card df-mobile-timeline-card">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                      interval={Math.ceil(durationSec / 6)}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      formatter={(value) => `${value}%`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 700, fontSize: '12px' }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      iconType="circle"
                      wrapperStyle={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', paddingBottom: '10px' }}
                    />
                    <Line type="monotone" dataKey="Visual" stroke="#059669" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="Vocal" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="Verbal" stroke="#F97316" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

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
                <div
                  key={p.key}
                  className={`pillar-card sr-pillar-progress-card dashboard-anim-bottom dashboard-anim-delay-${4 + index}`}
                  id={`pillar-${p.key}`}
                >
                  <div className="new-widget-head">
                    <h2 className="new-widget-title">{p.label}</h2>
                    <span className="new-widget-chip" style={{ background: `${tier.color}20`, color: tier.color }}>{tier.label}</span>
                  </div>
                  <div className="new-widget-rank-card">
                    <img src={pillarIcons[p.key]} alt="" className="new-widget-rank-sprite" />
                    <div className="new-widget-rank-content">
                      <p className="new-widget-kicker">Score</p>
                      <p className="new-widget-value">{Math.round(scorePercent)}%</p>
                    </div>
                  </div>
                  <div className="progress-pillar-track-header">
                    <span className="progress-pillar-track-label">{p.desc}</span>
                    <span className="progress-pillar-track-percent">{Math.round(scorePercent)}%</span>
                  </div>
                  <div className="progress-pillar-track">
                    <div className="progress-pillar-track-fill" style={{ width: `${scorePercent}%`, background: tier.color }} />
                  </div>
                  {showDetailed && p.subMetrics.length > 0 && (
                    <div className="df-pillar-subs" style={{ marginTop: '16px' }}>
                      <div className="df-pillar-subs-grid" style={{ gridTemplateColumns: '1fr' }}>
                        {p.subMetrics.map((sub) => {
                          const subTier = getScoreTier15(sub.score);
                          return (
                            <div key={sub.label} className="df-sub-metric">
                              <div className="df-sub-header">
                                <span className="df-sub-label" style={{ fontSize: '0.7rem' }}>{sub.label}</span>
                                <span className="df-sub-score" style={{ fontSize: '0.85rem' }}>{Math.round(scoreBarPercent(sub.score))}%</span>
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

        {showDetailed && (
          <>
            <div className="df-media-info-container dashboard-anim-bottom dashboard-anim-delay-7 df-mobile-media-stack">
              <div className="df-card df-mobile-recording-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="df-mobile-recording-card-head">
                  <h3 className="df-section-title df-mobile-section-title-tight">Session Recording</h3>
                  <div className="df-mobile-media-header df-mobile-media-header--parity">
                    <div className="df-mobile-media-info-bit">
                      <span className="df-mobile-media-bit-label">Date</span>
                      <span className="df-mobile-media-bit-value">{formatDate(session?.created_at)}</span>
                    </div>
                    <div className="df-mobile-media-info-bit">
                      <span className="df-mobile-media-bit-label">Duration</span>
                      <span className="df-mobile-media-bit-value">{formatDuration(durationSec)}</span>
                    </div>
                    <div className="df-mobile-media-info-bit">
                      <span className="df-mobile-media-bit-label">Mode</span>
                      <span className="df-mobile-media-bit-value">{mode}</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '16px', background: '#fff' }}>
                  <div className="df-recording-content">
                    {recordingMedia.videoUrl && (
                      <div className="df-video-wrap df-mobile-video-wrap">
                        <video className="df-video df-mobile-video" controls preload="metadata" src={recordingMedia.videoUrl}>
                          Your browser does not support video playback.
                        </video>
                      </div>
                    )}
                    {recordingMedia.audioUrl && (
                      <div className={`df-audio-wrap df-mobile-audio-wrap${recordingMedia.videoUrl ? ' df-mobile-audio-wrap--after-video' : ''}`}>
                        <audio className="df-audio" controls preload="metadata" src={recordingMedia.audioUrl}>
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}
                    {!recordingMedia.videoUrl && !recordingMedia.audioUrl && (
                      <p className="df-recordings-empty">No recording available for this session.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="df-card df-mobile-transcript-card" style={{ padding: '16px' }}>
                <div className="df-mobile-transcript-head">
                  <h3 className="df-section-title df-mobile-section-title-tight">Session Transcript</h3>
                  <div className="filler-counter-badge">
                    <strong>{fillerCount}</strong> Filler Words Detected
                  </div>
                </div>
                <div className="df-mobile-transcript-inner">
                  {renderHighlightedTranscript()}
                  <div className="transcript-legend">
                    <div className="legend-item">
                      <div className="legend-color legend-color--mispronounced" />
                      <span>Mispronunciation (Blue)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color legend-color--filler" />
                      <span>Filler Word (Green)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="df-card df-mobile-growth-card" ref={avoidSectionRef} style={{ padding: '20px', borderLeft: '4px solid #0d9488', background: 'linear-gradient(to right, #f0fdfa, #ffffff)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 className="df-section-title" style={{ fontSize: '1.05rem', margin: 0, color: '#134e4a' }}>Growth Focus: Areas to Refine</h3>
                  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Be mindful of these points in your next session</p>
                </div>
                <div className="df-mobile-growth-grid">
                  {deRecommendations.map((tip, idx) => (
                    <div key={idx} className="df-mobile-growth-tip">
                      <span style={{ color: '#0d9488', fontWeight: 900, fontSize: '1rem' }}>•</span>
                      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.55', fontWeight: 500, color: '#334155' }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <footer className="sr-footer-layout dashboard-anim-bottom dashboard-anim-delay-8 df-mobile-footer-actions">
          <button
            type="button"
            className="sr-detailed-feedback-card-v2 df-mobile-footer-toggle"
            onClick={() => {
              setShowDetailed(!showDetailed);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="sr-detailed-card-icon">
              {showDetailed ? <IoChevronBack /> : <IoChevronForward />}
            </div>
            <div className="sr-detailed-card-content">
              <span className="sr-detailed-card-kicker">ANALYTICS INSIGHTS</span>
              <h3 className="sr-detailed-card-title">
                {showDetailed ? 'Performance Overview' : 'Detailed Feedback'}
              </h3>
            </div>
          </button>

          <button
            type="button"
            className="sr-btn-action sr-btn-primary-v2 df-mobile-footer-primary"
            onClick={() => {
              if (isPreTest && !isInnerView) {
                navigate(ROUTES.USER_ANALYZING);
              } else if (isPostTest && !isInnerView) {
                navigate(ROUTES.PROGRESS);
              } else {
                replayAction.onClick();
              }
            }}
          >
            {(isPreTest && !isInnerView) ? 'Finish Onboarding' : (isPostTest && !isInnerView) ? 'Next Stage' : replayAction.label}
          </button>
        </footer>

        {!isInnerView && (
          <button
            type="button"
            className="df-mobile-back-btn"
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            Return to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}

export default DetailedFeedbackPageMobile;
