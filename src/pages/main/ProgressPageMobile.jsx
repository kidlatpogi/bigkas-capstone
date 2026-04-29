import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';

import { ROUTES } from '../../utils/constants';
import { formatDuration } from '../../utils/formatters';
import { getSessionMode } from '../../utils/sessionFormatting';
import {
  GLOBAL_ACTIVITY_SCOPE,
  addPointsToSpeakerProgress,
  getBigkasLevelFromUser,
  getTotalActivityPoints,
  recordActivityEvent,
} from '../../utils/activityProgress';
import {
  appendSpeakerPointsHistory,
  createSpeakerPointsHistoryEntry,
} from '../../utils/speakerPointsHistory';
import heroRobotImage from '../../assets/Sprites/Robot/0018.webp';
import visualSprite from '../../assets/Sprites/common/Visual.png';
import verbalSprite from '../../assets/Sprites/common/Verbal.png';
import vocalSprite from '../../assets/Sprites/common/Vocal.png';
import HistoryPageMobile from './HistoryPageMobile';
import './ProgressPage.css'; // Reuse styles but we will override for mobile

const TIME_RANGES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

// --- Helper Functions ---
function toFivePointScore(rawScore) {
  const numeric = Number(rawScore);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric <= 5) return Math.round(Math.max(1, Math.min(5, numeric)) * 10) / 10;
  const normalized = Math.max(0, Math.min(100, numeric));
  return Math.round((1 + (normalized / 100) * 4) * 10) / 10;
}

function formatFivePointScore(rawScore) {
  return toFivePointScore(rawScore).toFixed(1);
}

function getAverageTrendScore15(sessionsList) {
  if (!Array.isArray(sessionsList) || sessionsList.length === 0) return null;
  const avg = sessionsList.reduce((sum, session) => (
    sum + toFivePointScore(session?.confidence_score)
  ), 0) / sessionsList.length;
  return Math.round(avg * 10) / 10;
}

function getScoreTier15(score) {
  if (score >= 4.0) return { label: 'Excellent', color: '#5A7863' };
  if (score >= 3.0) return { label: 'Good', color: '#90AB8B' };
  if (score >= 2.0) return { label: 'Fair', color: '#F18F01' };
  return { label: 'Needs Work', color: '#D94F3B' };
}

function clamp15(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  return Math.max(1, Math.min(5, v));
}

function score100to15(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  const bounded = Math.max(0, Math.min(100, v));
  return 1 + (bounded / 100) * 4;
}

function score15ToPercent(score15) {
  const clamped = clamp15(score15);
  if (!Number.isFinite(clamped)) return 0;
  return Math.round(((clamped - 1) / 4) * 100);
}

function resolveTripleVForProgress(session) {
  const visual = clamp15(session?.visual_avg) ?? score100to15(session?.visual_score);
  const vocal = clamp15(session?.vocal_avg) ?? score100to15(session?.acoustic_score);
  const verbal = clamp15(session?.verbal_avg) ?? score100to15(session?.context_score);
  return {
    visual: clamp15(visual),
    vocal: clamp15(vocal),
    verbal: clamp15(verbal),
  };
}

// --- Component ---
function ProgressPageMobile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessions, fetchAllSessions, isLoading } = useSessionContext();
  const { user, isInitializing, updateUserMetadata } = useAuthContext();
  const hasRequestedForUserRef = useRef('');
  const hasLoggedActivityTaskRef = useRef(false);
  const activityScopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;

  const [range, setRange] = useState('Weekly');
  const [pillarRange, setPillarRange] = useState('Weekly');
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const userSessions = useMemo(() => {
    const userId = String(user?.id || '').trim();
    if (!userId) return sessions;
    return sessions.filter((s) => {
      const sessionUserId = String(s?.user_id || '').trim();
      return !sessionUserId || sessionUserId === userId;
    });
  }, [sessions, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (hasLoggedActivityTaskRef.current) return;
    const fromTaskId = location.state?.fromActivityTaskId;
    if (fromTaskId !== 'review-feedback' && fromTaskId !== 'progress-check') return;
    hasLoggedActivityTaskRef.current = true;

    const syncProgressVisitReward = async () => {
      const remotePoints = Math.max(0, Math.floor(Number(user?.speakerPoints ?? 0) || 0));
      let before = getTotalActivityPoints(activityScopeKey);
      if (remotePoints > before) {
        addPointsToSpeakerProgress(remotePoints - before, activityScopeKey);
        before = remotePoints;
      }
      recordActivityEvent({ type: fromTaskId }, activityScopeKey);
      const after = getTotalActivityPoints(activityScopeKey);
      if (after === before) return;
      const levelProgress = getBigkasLevelFromUser(user);
      const pointsAwarded = Math.max(0, Math.floor(after - before));
      await updateUserMetadata({
        speaker_points: after,
        speaker_level: levelProgress.levelName,
        speaker_level_number: levelProgress.levelNumber,
        speaker_points_updated_at: new Date().toISOString(),
        speaker_points_history: appendSpeakerPointsHistory(
          user?.speakerPointsHistory,
          createSpeakerPointsHistoryEntry({
            source: 'activity-task',
            label: fromTaskId === 'review-feedback' ? 'Reviewed detailed feedback' : 'Visited progress check',
            pointsAwarded,
            totalPointsAfter: after,
            metadata: { task_id: fromTaskId },
          }),
        ),
      });
    };
    syncProgressVisitReward();
  }, [activityScopeKey, location.state, updateUserMetadata, user?.id, user?.speakerPoints, user?.speakerPointsHistory]);

  useEffect(() => {
    if (isInitializing) return;
    if (!user) return;
    const userId = String(user.id || '');
    if (hasRequestedForUserRef.current === userId) return;
    hasRequestedForUserRef.current = userId;
    fetchAllSessions();
  }, [fetchAllSessions, isInitializing, user]);

  const chartData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    if (range === 'Daily') {
      const result = [];
      for (let i = 23; i >= 0; i -= 1) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - i, 0, 0, 0);
        const hourSessions = userSessions.filter(s => {
          const d = new Date(s.created_at);
          return d.getTime() >= hour.getTime() && d.getTime() < hour.getTime() + 3600000;
        });
        const avg = getAverageTrendScore15(hourSessions);
        result.push({ label: `${hour.getHours()}:00`, value: avg });
      }
      return result;
    }
    if (range === 'Weekly') {
      const result = [];
      for (let i = 6; i >= 0; i -= 1) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const daySessions = userSessions.filter(s => {
          const d = new Date(s.created_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === day.getTime();
        });
        const avg = getAverageTrendScore15(daySessions);
        result.push({ label: dayNames[day.getDay()], value: avg });
      }
      return result;
    }
    if (range === 'Monthly') {
      const result = [];
      for (let i = 3; i >= 0; i -= 1) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7 + 6));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const weekSessions = userSessions.filter(s => {
          const d = new Date(s.created_at);
          return d >= weekStart && d <= weekEnd;
        });
        const avg = getAverageTrendScore15(weekSessions);
        result.push({ label: `Wk ${4-i}`, value: avg });
      }
      return result;
    }
    if (range === 'Yearly') {
      const result = [];
      for (let i = 11; i >= 0; i -= 1) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const monthSessions = userSessions.filter(s => {
          const d = new Date(s.created_at);
          return d >= monthStart && d <= monthEnd;
        });
        const avg = getAverageTrendScore15(monthSessions);
        result.push({ label: monthNames[monthStart.getMonth()], value: avg });
      }
      return result;
    }
    return [];
  }, [range, userSessions]);

  const stats = useMemo(() => {
    const now = new Date();
    const filteredSessions = userSessions.filter(s => {
      const d = new Date(s.created_at);
      if (range === 'Daily') {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        return d >= dayStart;
      }
      if (range === 'Weekly') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return d >= weekStart;
      }
      if (range === 'Monthly') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        return d >= monthStart;
      }
      if (range === 'Yearly') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        yearStart.setHours(0, 0, 0, 0);
        return d >= yearStart;
      }
      return true;
    });

    const avgScoreRaw = filteredSessions.length
      ? filteredSessions.reduce((a, b) => a + (b.confidence_score || 0), 0) / filteredSessions.length
      : 0;
    const totalTimeSec = filteredSessions.reduce((a, b) => a + (b.duration_sec || b.duration || 0), 0);
    const totalTimeMin = Math.round(totalTimeSec / 60);

    return {
      sessionsCount: filteredSessions.length,
      averageScoreLabel: formatFivePointScore(avgScoreRaw),
      totalSpeakingTime: totalTimeMin,
    };
  }, [userSessions, range]);

  const pillarStats = useMemo(() => {
    const now = new Date();
    const filteredSessions = userSessions.filter((session) => {
      const createdAt = new Date(session.created_at);
      if (pillarRange === 'Daily') {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        return createdAt >= dayStart;
      }
      if (pillarRange === 'Weekly') {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        return createdAt >= weekStart;
      }
      if (pillarRange === 'Monthly') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        return createdAt >= monthStart;
      }
      if (pillarRange === 'Yearly') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        yearStart.setHours(0, 0, 0, 0);
        return createdAt >= yearStart;
      }
      return true;
    });

    const metricConfig = [
      { key: 'visual', label: 'Visual', image: visualSprite, resolver: (session) => resolveTripleVForProgress(session).visual },
      { key: 'verbal', label: 'Verbal', image: verbalSprite, resolver: (session) => resolveTripleVForProgress(session).verbal },
      { key: 'vocal', label: 'Vocal', image: vocalSprite, resolver: (session) => resolveTripleVForProgress(session).vocal }
    ];

    return metricConfig.map((pillar) => {
      const values = filteredSessions
        .map((session) => pillar.resolver(session))
        .filter((value) => Number.isFinite(value) && value !== null);
      const avg15 = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return {
        ...pillar,
        score: clamp15(avg15) ?? 1,
        value: score15ToPercent(avg15),
      };
    });
  }, [pillarRange, userSessions]);

  return (
    <div className="progress-page-bg progress-page-bg--mobile progress-page-mobile-root no-scrollbar" style={{ height: '100dvh', overflowY: 'auto', paddingBottom: '80px' }}>
      <div className="progress-main-layout" style={{ padding: '0', maxWidth: '100%' }}>
        <div className="progress-left-content" style={{ padding: '16px' }}>
          
          {/* Immersive Mobile Banner */}
          <section 
            className="new-banner dashboard-anim-top" 
            style={{ 
              flexDirection: 'column', 
              padding: '24px', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '24px',
              marginBottom: '24px',
              minHeight: 'auto',
              boxShadow: '0 12px 32px rgba(16, 185, 129, 0.25)'
            }}
          >
            <div className="new-banner-left" style={{ width: '100%', padding: '0', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '20px', backdropFilter: 'blur(10px)' }}>
                <img src={heroRobotImage} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
              </div>
              <div className="new-banner-bubble" style={{ background: '#fff', padding: '16px', borderRadius: '20px', flex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none', position: 'relative' }}>
                <p className="new-banner-kicker" style={{ color: '#059669', marginBottom: '4px', fontWeight: 800 }}>B-01:</p>
                <p className="new-banner-copy" style={{ fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.5', margin: 0 }}>
                  You're improving fast! Keep up the good work and check your progress below.
                </p>
                <div style={{ position: 'absolute', left: '-10px', top: '20px', width: '20px', height: '20px', background: '#fff', transform: 'rotate(45deg)', borderRadius: '2px' }} />
              </div>
            </div>

            {/* Mobile Stats Grid */}
            <div className="progress-banner-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', width: '100%', marginTop: '24px' }}>
              <div className="progress-stat-card" style={{ background: '#fff', padding: '12px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Sessions</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{stats.sessionsCount}</p>
              </div>
              <div className="progress-stat-card" style={{ background: '#fff', padding: '12px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Average</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{stats.averageScoreLabel}</p>
              </div>
              <div className="progress-stat-card" style={{ background: '#fff', padding: '12px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Minutes</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{stats.totalSpeakingTime}</p>
              </div>
            </div>
          </section>

          {/* Performance Graph Section */}
          <div className="progress-graph-container dashboard-anim-bottom" style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
            <div className="progress-chart-header" style={{ marginBottom: '20px' }}>
              <h3 className="progress-chart-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Speaking Performance</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>Your delivery scores over time</p>
              <div className="progress-range-labels no-scrollbar" style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '5px', background: '#f1f5f9', borderRadius: '999px', width: 'fit-content' }}>
                {TIME_RANGES.map(r => (
                  <button
                    type="button"
                    key={r} 
                    className={`progress-range-chip ${range === r ? 'active' : ''}`}
                    onClick={() => setRange(r)}
                    style={{ 
                      padding: '6px 14px', 
                      borderRadius: '999px', 
                      fontSize: '12px', 
                      fontWeight: 700,
                      background: range === r ? '#059669' : 'transparent',
                      color: range === r ? '#fff' : '#64748b',
                      border: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: range === r ? '0 4px 12px rgba(5, 150, 105, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="progress-chart-container" style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} ticks={[1, 2, 3, 4, 5]} domain={[1, 5]} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Number.isFinite(entry.value) ? '#10b981' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pillar Trends Section */}
          <div className="progress-pillars-section dashboard-anim-bottom">
            <div className="progress-pillars-header" style={{ marginBottom: '20px' }}>
              <h3 className="progress-pillars-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>Pillar Trends ({pillarRange})</h3>
              <div className="progress-range-labels" style={{ display: 'flex', gap: '4px', padding: '5px', background: '#f1f5f9', borderRadius: '999px', width: 'fit-content' }}>
                {TIME_RANGES.map(r => (
                  <button
                    type="button"
                    key={r} 
                    className={`progress-range-chip ${pillarRange === r ? 'active' : ''}`}
                    onClick={() => setPillarRange(r)}
                    style={{ 
                      padding: '6px 14px', 
                      borderRadius: '999px', 
                      fontSize: '12px', 
                      fontWeight: 700,
                      background: pillarRange === r ? '#059669' : 'transparent',
                      color: pillarRange === r ? '#fff' : '#64748b',
                      border: 'none',
                      boxShadow: pillarRange === r ? '0 4px 12px rgba(5, 150, 105, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pillarStats.map((pillar, index) => {
                const tier = getScoreTier15(pillar.score);
                return (
                  <div 
                    key={pillar.key} 
                    className="pillar-card"
                    style={{ 
                      background: '#fff', 
                      borderRadius: '24px', 
                      padding: '20px', 
                      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={pillar.image} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{pillar.label}</h4>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, background: `${tier.color}20`, color: tier.color, padding: '4px 10px', borderRadius: '8px' }}>
                        {tier.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{pillar.score.toFixed(1)}</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>/ 5.0</span>
                    </div>
                    <div className="progress-pillar-track" style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        className="progress-pillar-track-fill"
                        style={{ width: `${pillar.value}%`, background: tier.color, height: '100%', borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Action */}
          <div style={{ marginTop: '32px', paddingBottom: '20px' }}>
            <button
              type="button"
              className="progress-show-history-btn"
              onClick={() => setShowMobileHistory(true)}
              style={{ 
                width: '100%', 
                padding: '16px', 
                borderRadius: '16px', 
                background: '#10b981', 
                color: '#fff', 
                fontSize: '1rem', 
                fontWeight: 800, 
                border: 'none',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)'
              }}
            >
              Show Session History
            </button>
          </div>
        </div>

        {/* History Sidebar Overlay */}
        <HistoryPageMobile
          isOpen={showMobileHistory}
          onClose={() => setShowMobileHistory(false)}
          userSessions={userSessions}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default ProgressPageMobile;
