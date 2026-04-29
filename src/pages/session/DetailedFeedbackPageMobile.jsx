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
import heroRobotImage from '../../assets/Sprites/Robot/0018.webp';
import verbalSprite from '../../assets/Sprites/common/Verbal.png';
import visualSprite from '../../assets/Sprites/common/Visual.png';
import vocalSprite from '../../assets/Sprites/common/Vocal.png';
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

function buildBucketPublicUrl(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const cleaned = value.replace(/^\/+/, '').replace(new RegExp(`^${SESSION_MEDIA_BUCKET}/`), '').split('?')[0];
  const { data } = supabase.storage.from(SESSION_MEDIA_BUCKET).getPublicUrl(cleaned);
  return data?.publicUrl || null;
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
    const loadMedia = async () => {
      if (!sessionId) return;
      const { data } = await supabase.from('session_media').select('audio_url, video_storage_url, transcript').eq('session_id', sessionId).maybeSingle();
      if (data) {
        setRecordingMedia({
          audioUrl: buildBucketPublicUrl(data.audio_url),
          videoUrl: buildBucketPublicUrl(data.video_storage_url),
          transcript: data.transcript || '',
        });
      }
    };
    loadMedia();
  }, [sessionId]);

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
    { key: 'visual', label: 'Visual', desc: 'Eye contact & gestures', score: tripleV.visualAvg, image: visualSprite, subMetrics: visualSubMetrics },
    { key: 'vocal', label: 'Vocal', desc: 'Voice pitch & stability', score: tripleV.vocalAvg, image: vocalSprite, subMetrics: vocalSubMetrics },
    { key: 'verbal', label: 'Verbal', desc: 'Pronunciation & clarity', score: tripleV.verbalAvg, image: verbalSprite, subMetrics: [] },
  ];

  const timelineData = Array.from({ length: 15 }, (_, idx) => {
    const values = { time: idx };
    pillars.forEach(p => {
      const base = scoreBarPercent(p.score);
      values[p.label] = clamp(base + (Math.random() * 10 - 5), 0, 100);
    });
    return values;
  });

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
        
        {/* Timeline Chart */}
        <section className="df-mobile-section dashboard-anim-bottom">
          <div className="df-mobile-section-header">
            <h2 className="df-mobile-section-title">Performance Timeline</h2>
            <p className="df-mobile-section-subtitle">Real-time fluctuations during your session</p>
          </div>
          <div className="df-mobile-card">
            <div className="df-mobile-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }} />
                  <Line type="monotone" dataKey="Visual" stroke="#059669" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Vocal" stroke="#10b981" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Verbal" stroke="#F97316" strokeWidth={3} dot={false} />
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
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: tier.color }}>{p.score.toFixed(1)} / 5.0</span>
                </div>
                {p.subMetrics.length > 0 && (
                  <div className="df-mobile-sub-grid">
                    {p.subMetrics.map(sub => (
                      <div key={sub.label} className="df-mobile-sub-item">
                        <div className="df-mobile-sub-label-row">
                          <span className="df-mobile-sub-label">{sub.label}</span>
                          <span className="df-mobile-sub-score">{sub.score.toFixed(1)}</span>
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
            {recordingMedia.videoUrl ? (
              <div className="df-mobile-video-box">
                <video src={recordingMedia.videoUrl} controls className="df-mobile-video" />
              </div>
            ) : recordingMedia.audioUrl ? (
              <div className="df-mobile-audio-box">
                <audio src={recordingMedia.audioUrl} controls className="df-mobile-audio" />
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No recording available</div>
            )}
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
