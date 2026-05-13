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
import { 
  IoChevronBack, 
  IoChevronForward, 
} from 'react-icons/io5';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';

import { ROUTES, buildRoute } from '../../utils/constants';
import { formatDate, formatDuration } from '../../utils/formatters';
import {
  getSessionMode,
} from '../../utils/sessionFormatting';
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
import { sanitizeTranscriptForDisplay } from '../../utils/analysisTranscript';
import { getSpriteUrl } from '../../utils/assetUtils';

const heroRobotImage = getSpriteUrl('Robot/0018.webp');
const visualSprite = getSpriteUrl('common/Visual.webp');
const verbalSprite = getSpriteUrl('common/Verbal.webp');
const vocalSprite = getSpriteUrl('common/Vocal.webp');
import HistoryPage from './HistoryPage';
import HistoryPageMobile from './HistoryPageMobile';
import { generateCoachInsights } from '../../utils/coachInsights';
import './ProgressPage.css';

const TIME_RANGES = ['All', 'Daily', 'Weekly', 'Monthly', 'Yearly'];

import { toFivePointScore } from '../../utils/sessionFormatting';

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
  if (score >= 3.0) return { label: 'Strong', color: '#10B981' };
  if (score >= 2.0) return { label: 'Developing', color: '#3B82F6' };
  return { label: 'Rising', color: '#F59E0B' };
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

function resolveSubMetric15(session, key) {
  const raw = Number(session?.[key]);
  if (!Number.isFinite(raw)) return null;
  if (raw > 5) return score100to15(raw);
  return clamp15(raw);
}

function buildSessionTitleOrTopic(session) {
  const candidates = [
    session?.activity_title,
    session?.script_title,
    session?.title,
    session?.topic,
    session?.objective_name,
    session?.objective,
    session?.prompt,
    session?.free_topic,
    session?.target_text,
  ];

  const firstMatch = candidates.find((value) => typeof value === 'string' && value.trim());
  if (firstMatch) return firstMatch.trim();

  const transcript = sanitizeTranscriptForDisplay(session?.transcript, '');
  if (transcript) {
    return transcript.length > 64 ? `${transcript.slice(0, 61)}...` : transcript;
  }

  const mode = getSessionMode(session);
  if (mode === 'Pre-Test') return 'Pre-Test Session';
  if (mode === 'Practice') return 'Practice Session';
  return 'Training Session';
}

function ProgressPage({ isMobile = false, renderVariant = 'desktop' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessions, fetchAllSessions, isLoading } = useSessionContext();
  const { user, isInitializing, updateUserMetadata } = useAuthContext();
  const hasRequestedForUserRef = useRef('');

  const hasLoggedActivityTaskRef = useRef(false);
  const activityScopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;

  const [range, setRange] = useState('All');
  const [pillarRange, setPillarRange] = useState('All');
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const graphRef = useRef(null);
  const [graphWidth, setGraphWidth] = useState(0);

  useEffect(() => {
    if (!graphRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setGraphWidth(entry.contentRect.width);
      }
    });
    observer.observe(graphRef.current);
    return () => observer.disconnect();
  }, []);

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
            label: fromTaskId === 'review-feedback'
              ? 'Reviewed detailed feedback'
              : 'Visited progress check',
            pointsAwarded,
            totalPointsAfter: after,
            metadata: {
              task_id: fromTaskId,
            },
          }),
        ),
      });
    };

    syncProgressVisitReward();
  }, [activityScopeKey, location.state, updateUserMetadata, user?.id, user?.speakerPoints, user?.speakerPointsHistory]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.add('progress-page-active');
    document.body.classList.add('progress-page-active');

    return () => {
      document.documentElement.classList.remove('progress-page-active');
      document.body.classList.remove('progress-page-active');
    };
  }, []);

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

    if (range === 'All') {
      const result = [];
      const recentSessions = [...userSessions].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10).reverse();
      recentSessions.forEach((s) => {
        const d = new Date(s.created_at);
        result.push({ 
          label: `${d.getMonth() + 1}/${d.getDate()}`, 
          value: toFivePointScore(s.confidence_score) 
        });
      });
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
      if (range === 'All') return true;
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
      averageScoreRaw: avgScoreRaw,
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
      {
        key: 'visual',
        label: 'Visual',
        image: visualSprite,
        desc: 'Eye contact & gestures',
        resolver: (session) => resolveTripleVForProgress(session).visual,
      },
      {
        key: 'verbal',
        label: 'Verbal',
        image: verbalSprite,
        desc: 'Pronunciation & clarity',
        resolver: (session) => resolveTripleVForProgress(session).verbal,
      },
      {
        key: 'vocal',
        label: 'Vocal',
        image: vocalSprite,
        desc: 'Voice quality & stability',
        resolver: (session) => resolveTripleVForProgress(session).vocal,
      }
    ];

    return metricConfig.map((pillar) => {
      const values = filteredSessions
        .map((session) => pillar.resolver(session))
        .filter((value) => Number.isFinite(value) && value !== null);

      const avg15 = values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;

      return {
        ...pillar,
        score: clamp15(avg15) ?? 1,
        value: score15ToPercent(avg15),
      };
    });
  }, [pillarRange, userSessions]);

  const coachInsights = useMemo(() => generateCoachInsights(userSessions), [userSessions]);

/* history session logic removed */

  return (
    <div
      className={`progress-page-bg no-scrollbar${isMobile ? ' progress-page-bg--mobile progress-page-mobile-root' : ''}`}
      data-progress-variant={renderVariant}
      style={{
        height: '100dvh',
        overflowY: 'auto',
      }}
    >
      <div className="progress-main-layout">
        <div className="progress-left-content">
          {isMobile ? (
            <div className="progress-mobile-top-strip">
              <div className="progress-mobile-banner-left" aria-label="Coach message">
                <img src={heroRobotImage} alt="" className="progress-mobile-banner-robot" />
                <div className="progress-mobile-banner-bubble">
                  <p className="progress-mobile-banner-kicker">B-01:</p>
                  <p className="progress-mobile-banner-copy">
                    {coachInsights.growthUpdate}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Banner Section (1:1 with Activity Page layout feel) */}
          <section className="progress-banner dashboard-anim-top dashboard-anim-delay-2">
            <div className="progress-banner-left" id="tutorial-target-home-banner">
              <img src={heroRobotImage} alt="" className="progress-banner-robot" />
              <div className="progress-banner-bubble" aria-label="Coach message">
                <p className="progress-banner-kicker">B-01:</p>
                <p className="progress-banner-copy">{coachInsights.growthUpdate}</p>
              </div>
            </div>

            <div className="progress-banner-right">
              <div className="progress-banner-stats">
                <div className="progress-stat-card">
                  <div className="progress-stat-content">
                    <p className="progress-stat-kicker">Sessions ({range})</p>
                    <p className="progress-stat-value">{stats.sessionsCount}</p>
                  </div>
                </div>

                <div className="progress-stat-card">
                  <div className="progress-stat-content">
                    <p className="progress-stat-kicker">Average Score</p>
                    <p className="progress-stat-value">{stats.averageScoreLabel}</p>
                  </div>
                </div>

                <div className="progress-stat-card">
                  <div className="progress-stat-content">
                    <p className="progress-stat-kicker">Total Speaking</p>
                    <p className="progress-stat-value">{stats.totalSpeakingTime}m</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Graph Section */}
          <div 
            className="progress-graph-container dashboard-anim-bottom dashboard-anim-delay-3"
            ref={graphRef}
          >
            <div className="progress-chart-header">
              <div className="progress-chart-title-group">
                <h3 className="progress-chart-title">Speaking Performance</h3>
                <p className="progress-chart-explanation">Track your average delivery scores across different time intervals.</p>
              </div>
              <div className="progress-range-labels">
                {TIME_RANGES.map(r => (
                  <button
                    type="button"
                    key={r} 
                    className={`progress-range-chip ${range === r ? 'active' : ''}`}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="progress-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#888' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#888' }}
                    ticks={[1, 2, 3, 4, 5]}
                    tickFormatter={(value) => Number(value).toFixed(1)}
                    domain={[1, 5]}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${Number(value).toFixed(1)} / 5.0`, 'Score']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={range === 'daily' ? 10 : 26} minPointSize={4}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Number.isFinite(entry.value) ? '#34D399' : '#f0f0f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pillars Grid */}
          <div className="progress-pillars-section dashboard-anim-bottom dashboard-anim-delay-4">
            <div className="progress-pillars-header dashboard-anim-bottom dashboard-anim-delay-4">
              <h3 className="progress-pillars-title">Pillar Trends ({pillarRange === 'daily' ? 'Today' : pillarRange})</h3>
              <div className="progress-range-labels">
                {TIME_RANGES.map(r => (
                  <button
                    type="button"
                    key={r} 
                    className={`progress-range-chip ${pillarRange === r ? 'active' : ''}`}
                    onClick={() => setPillarRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            
            {userSessions.filter(s => {
              const d = new Date(s.created_at);
              const now = new Date();
              if (pillarRange === 'Daily') {
                const dayStart = new Date(now);
                dayStart.setHours(0, 0, 0, 0);
                return d >= dayStart;
              }
              if (pillarRange === 'Weekly') {
                const weekStart = new Date(now);
                weekStart.setDate(weekStart.getDate() - 7);
                return d >= weekStart;
              }
              if (pillarRange === 'Monthly') {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                monthStart.setHours(0, 0, 0, 0);
                return d >= monthStart;
              }
              if (pillarRange === 'Yearly') {
                const yearStart = new Date(now.getFullYear(), 0, 1);
                yearStart.setHours(0, 0, 0, 0);
                return d >= yearStart;
              }
              return true;
            }).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontWeight: 600 }}>
                No sessions found for this period.
              </p>
            ) : (
              <div className="progress-pillars-grid">
                {pillarStats.map((pillar, index) => {
                  const tier = getScoreTier15(pillar.score);
                  return (
                    <div 
                      key={pillar.key} 
                      className={`pillar-card dashboard-anim-bottom dashboard-anim-delay-${5 + index}`}
                    >
                      <div className="progress-pillar-head">
                        <h2 className="progress-pillar-title">{pillar.label}</h2>
                        <span className="progress-pillar-chip" style={{ background: `${tier.color}20`, color: tier.color }}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="progress-pillar-rank-card">
                        <img src={pillar.image} alt="" className="progress-pillar-sprite" />
                        <div className="progress-pillar-content">
                          <p className="progress-pillar-kicker">Score</p>
                          <p className="progress-pillar-value">{Math.round(pillar.value)}%</p>
                        </div>
                      </div>
                      <div className="progress-pillar-track-header">
                        <span className="progress-pillar-track-label">Overall consistency</span>
                        <span className="progress-pillar-track-percent">{Math.round(pillar.value)}%</span>
                      </div>
                      <div className="progress-pillar-track">
                        <div
                          className="progress-pillar-track-fill"
                          style={{ width: `${pillar.value}%`, background: tier.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="progress-footer-actions dashboard-anim-bottom dashboard-anim-delay-5">
            <button
              type="button"
              className="progress-show-history-btn"
              onClick={() => setShowMobileHistory(true)}
            >
              Show History
            </button>
          </div>
        </div>

        {/* History Sidebar Overlay */}
        {isMobile ? (
          <HistoryPageMobile
            isOpen={showMobileHistory}
            onClose={() => setShowMobileHistory(false)}
            userSessions={userSessions}
            isLoading={isLoading}
          />
        ) : (
          <HistoryPage
            isOpen={showMobileHistory}
            onClose={() => setShowMobileHistory(false)}
            userSessions={userSessions}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default ProgressPage;
