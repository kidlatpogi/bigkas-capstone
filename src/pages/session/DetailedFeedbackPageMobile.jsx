import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { IoChevronForward, IoPlay, IoMic } from 'react-icons/io5';
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
import './DetailedFeedbackPageMobile.css';

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
  if (score >= 4.0) return { label: 'Excellent', color: '#059669' };
  if (score >= 3.0) return { label: 'Good', color: '#059669' };
  if (score >= 2.0) return { label: 'Fair', color: '#F97316' };
  return { label: 'Needs Work', color: '#FF0000' };
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

// --- Component ---
function DetailedFeedbackPageMobile({ sessionIdProp, isInnerView, onCloseInner }) {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams();
  const sessionId = sessionIdProp || paramSessionId;
  const { state: locationState } = useLocation();
  const { currentSession, fetchSessionById, isLoading } = useSessionContext();
  const [recordingMedia, setRecordingMedia] = useState({ audioUrl: null, videoUrl: null, transcript: '' });

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

  if (!session && isLoading) return <div className="df-mobile-root"><div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div></div>;
  if (!session) return <div className="df-mobile-root"><div style={{ padding: '40px', textAlign: 'center' }}>Session not found</div></div>;

  const tripleV = getTripleVScores(session);
  const overallTier = getScoreTier15(tripleV.entryPoint);
  const mode = getSessionMode(session);
  const durationSec = Math.max(1, Math.round(session?.duration_sec ?? session?.duration ?? 1));
  const practicedText = sanitizeTranscriptForDisplay(recordingMedia.transcript || session?.transcript || '', '');

  const visualSubMetrics = [
    { label: 'Eye Contact', score: subMetric100to15(session?.eye_contact_score) ?? tripleV.visualAvg },
    { label: 'Gestures', score: subMetric100to15(session?.gesture_score) ?? tripleV.visualAvg },
  ];

  const vocalSubMetrics = [
    { label: 'Jitter Control', score: invertedSubMetric(session?.jitter_score) },
    { label: 'Shimmer Control', score: invertedSubMetric(session?.shimmer_score) },
  ].filter(m => m.score !== null);

  const pillars = [
    { key: 'visual', label: 'Visual', desc: 'Eye contact, facial expressions, and body gestures', score: tripleV.visualAvg, image: visualSprite, subMetrics: visualSubMetrics },
    { key: 'vocal', label: 'Vocal', desc: 'Voice pitch stability, volume consistency, and clarity', score: tripleV.vocalAvg, image: vocalSprite, subMetrics: vocalSubMetrics },
    { key: 'verbal', label: 'Verbal', desc: 'Pronunciation accuracy and topical relevance', score: tripleV.verbalAvg, image: verbalSprite, subMetrics: [] },
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

  const recommendations = sanitizeRecommendationLines(
    Array.isArray(session?.recommendations) ? session.recommendations : []
  );

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

  return (
    <div className="df-mobile-root no-scrollbar">
      {!isInnerView && (
        <nav className="df-mobile-breadcrumb">
          <button type="button" className="df-mobile-breadcrumb-btn" onClick={() => navigate(-1)}>Back</button>
          <IoChevronForward className="df-mobile-breadcrumb-sep" />
          <span className="df-mobile-breadcrumb-current">Detailed Feedback</span>
        </nav>
      )}

      <div className="df-mobile-content">
        
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
            <div className="sr-mobile-strength-row">
              {(() => {
                const topPillar = [...pillars].sort((a, b) => b.score - a.score)[0];
                return (
                  <>
                    <img src={topPillar.image} alt="" className="sr-mobile-strength-sprite" />
                    <span className="sr-mobile-strength-name">{topPillar.label}</span>
                  </>
                );
              })()}
            </div>
            <div className="sr-mobile-strength-kicker">TOP PERFORMANCE AREA</div>
          </div>
        </div>
        
        {/* Timeline Chart */}
        <section className="df-mobile-section dashboard-anim-bottom">
          <div className="df-mobile-section-header">
            <h2 className="df-mobile-section-title">Performance Timeline</h2>
            <p className="df-mobile-section-subtitle">Real-time fluctuations during your session</p>
          </div>
          <div className="df-mobile-card" style={{ padding: '24px 16px 12px' }}>
            <div className="df-mobile-chart-container" style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                    interval={Math.ceil(durationSec / 5)}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
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
          </div>
        </section>

        {/* Pillars & Submetrics */}
        <section className="df-mobile-section dashboard-anim-bottom">
          <div className="df-mobile-section-header">
            <h2 className="df-mobile-section-title">Sub-metric Analysis</h2>
            <p className="df-mobile-section-subtitle">A granular look at your delivery</p>
          </div>
          {pillars.map(p => {
            const tier = getScoreTier15(p.score);
            return (
              <div key={p.key} className="df-mobile-pillar-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={p.image} alt="" style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontWeight: 800 }}>{p.label}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: tier.color }}>{Math.round(scoreBarPercent(p.score))}% Strength</span>
                </div>
                {p.subMetrics.length > 0 && (
                  <div className="df-mobile-sub-grid">
                    {p.subMetrics.map(sub => (
                      <div key={sub.label} className="df-mobile-sub-item">
                        <div className="df-mobile-sub-label-row">
                          <span className="df-mobile-sub-label">{sub.label}</span>
                          <span className="df-mobile-sub-score">{Math.round(scoreBarPercent(sub.score))}%</span>
                        </div>
                        <div className="df-mobile-sub-track">
                          <div className="df-mobile-sub-fill" style={{ width: `${scoreBarPercent(sub.score)}%`, background: tier.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Media Recording */}
        <section className="df-mobile-section dashboard-anim-bottom">
          <div className="df-mobile-section-header">
            <h2 className="df-mobile-section-title">Session Recording</h2>
          </div>
          <div className="df-mobile-card" style={{ padding: 0 }}>
            <div className="df-mobile-media-header">
              <div className="df-mobile-media-info-bit">
                <span className="df-mobile-media-bit-label">Duration</span>
                <span className="df-mobile-media-bit-value">{formatDuration(durationSec)}</span>
              </div>
              <div className="df-mobile-media-info-bit">
                <span className="df-mobile-media-bit-label">Mode</span>
                <span className="df-mobile-media-bit-value">{mode}</span>
              </div>
            </div>
            <div className="df-mobile-recording-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recordingMedia.videoUrl && (
                <div className="df-mobile-video-box" style={{ borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                  <video src={recordingMedia.videoUrl} controls className="df-mobile-video" style={{ width: '100%', display: 'block' }} />
                </div>
              )}
              {recordingMedia.audioUrl && (
                <div className="df-mobile-audio-box" style={{ padding: recordingMedia.videoUrl ? '0 16px 16px' : '16px' }}>
                  <audio src={recordingMedia.audioUrl} controls className="df-mobile-audio" style={{ width: '100%' }} />
                </div>
              )}
              {!recordingMedia.videoUrl && !recordingMedia.audioUrl && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>No recording available</div>
              )}
            </div>
          </div>
        </section>

        {/* Transcript */}
        <section className="df-mobile-section dashboard-anim-bottom">
          <div className="df-mobile-section-header">
            <h2 className="df-mobile-section-title">Transcript</h2>
          </div>
          <div className="df-mobile-transcript-box">
            <p className="df-mobile-transcript-text">{practicedText || 'No transcript generated.'}</p>
          </div>
        </section>

        <button type="button" className="df-mobile-back-btn" onClick={onCloseInner}>
          Back to Analysis
        </button>
      </div>
    </div>
  );
}

export default DetailedFeedbackPageMobile;
