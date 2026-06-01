import { Suspense, lazy, useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionContext } from '../../context/useSessionContext';
import { useAuthContext } from '../../context/useAuthContext';

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
import { getSpriteUrl } from '../../utils/assetUtils';

const heroRobotImage = getSpriteUrl('Robot/0018.webp');
const visualSprite = getSpriteUrl('common/Visual.webp');
const verbalSprite = getSpriteUrl('common/Verbal.webp');
const vocalSprite = getSpriteUrl('common/Vocal.webp');
import './ProgressPage.css'; 
import './ProgressPageMobile.css';

const TIME_RANGES = ['All', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
const MobileProgressBarChart = lazy(() => import('../../components/progress/MobileProgressBarChart'));
const ProgressHistoryMobileLazy = lazy(() => import('./ProgressHistoryMobileLazy'));

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

// --- Component ---
function ProgressPageMobile() {
  const location = useLocation();
  const { sessions, fetchAllSessions, isLoading } = useSessionContext();
  const { user, isInitializing, updateUserMetadata } = useAuthContext();
  const hasRequestedForUserRef = useRef('');
  const hasLoggedActivityTaskRef = useRef(false);
  const activityScopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  const chartLoadRef = useRef(null);

  const [range, setRange] = useState('All');
  const [pillarRange, setPillarRange] = useState('All');
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [shouldLoadChart, setShouldLoadChart] = useState(false);

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
  }, [activityScopeKey, location.state, updateUserMetadata, user, user?.id, user?.speakerPoints, user?.speakerPointsHistory]);

  useEffect(() => {
    if (isInitializing) return;
    if (!user) return;
    const userId = String(user.id || '');
    if (hasRequestedForUserRef.current === userId) return;
    hasRequestedForUserRef.current = userId;
    fetchAllSessions();
  }, [fetchAllSessions, isInitializing, user]);

  useEffect(() => {
    const target = chartLoadRef.current;
    if (!target || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      const frameId = window.requestAnimationFrame(() => setShouldLoadChart(true));
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setShouldLoadChart(true);
      observer.disconnect();
    }, { rootMargin: '260px 0px' });

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

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
    if (range === 'Yearly') {
      const result = [];
      for (let i = 11; i >= 0; i -= 1) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthSessions = userSessions.filter(s => {
          const d = new Date(s.created_at);
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        });
        const avg = getAverageTrendScore15(monthSessions);
        result.push({ label: month.toLocaleString('default', { month: 'short' }), value: avg });
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
      if (pillarRange === 'All') return true;
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
    <div className="progress-page-mobile-root no-scrollbar">
      <div className="progress-mobile-layout">
        <div className="progress-mobile-content">
          
          {/* Immersive Mobile Banner */}
          <div className="activity-mobile-top-strip progress-mobile-banner dashboard-anim-top">
            <div className="activity-mobile-banner-left" id="tutorial-target-home-banner" aria-label="Coach message">
              <img src={heroRobotImage} alt="" className="activity-mobile-banner-robot" />
              <div className="activity-mobile-banner-bubble">
                <p className="activity-mobile-banner-kicker">B-01:</p>
                <p className="activity-mobile-banner-copy">
                  You're improving fast! Keep up the good work and check your progress below.
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Stats Grid */}
          <div className="progress-mobile-stats-grid">
            <div className="new-widget-rank-card progress-mobile-stat-card">
              <div className="new-widget-rank-content">
                <p className="new-widget-kicker">Sessions</p>
                <p className="new-widget-value">{stats.sessionsCount}</p>
              </div>
            </div>
            <div className="new-widget-rank-card progress-mobile-stat-card">
              <div className="new-widget-rank-content">
                <p className="new-widget-kicker">Average</p>
                <p className="new-widget-value">{stats.averageScoreLabel}</p>
              </div>
            </div>
            <div className="new-widget-rank-card progress-mobile-stat-card">
              <div className="new-widget-rank-content">
                <p className="new-widget-kicker">Minutes</p>
                <p className="new-widget-value">{stats.totalSpeakingTime}</p>
              </div>
            </div>
          </div>

          {/* Performance Graph Section */}
          <div className="progress-mobile-section progress-mobile-section--speaking-performance dashboard-anim-bottom">
            <h3 className="progress-mobile-section-title">Speaking Performance</h3>
            <p className="progress-mobile-section-desc">Your delivery scores over time</p>
            <div className="progress-mobile-range-labels no-scrollbar">
              {TIME_RANGES.map(r => (
                <button
                  type="button"
                  key={r} 
                  className={`progress-mobile-range-chip ${range === r ? 'active' : ''}`}
                  aria-label={`Speaking Performance range: ${r}`}
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            
            {chartData.some(d => d.value !== null) ? (
              <div className="progress-mobile-chart-container" ref={chartLoadRef}>
                {shouldLoadChart ? (
                  <Suspense fallback={null}>
                    <MobileProgressBarChart chartData={chartData} />
                  </Suspense>
                ) : null}
              </div>
            ) : (
              <div className="progress-mobile-empty-state">
                No sessions found for this period.
              </div>
            )}
          </div>

          {/* Pillar Trends Section */}
          <div className="progress-mobile-pillars-section dashboard-anim-bottom">
            <div className="progress-mobile-section progress-mobile-section--pillar-trends-header">
              <h3 className="progress-mobile-section-title">Pillar Trends ({pillarRange})</h3>
              <div className="progress-mobile-range-labels no-scrollbar">
                {TIME_RANGES.map(r => (
                  <button
                    type="button"
                    key={r} 
                    className={`progress-mobile-range-chip ${pillarRange === r ? 'active' : ''}`}
                    aria-label={`Pillar Trends range: ${r}`}
                    aria-pressed={pillarRange === r}
                    onClick={() => setPillarRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            
            {userSessions.filter(s => {
              const d = new Date(s.created_at);
              if (pillarRange === 'Daily') return d >= new Date(new Date().setHours(0,0,0,0));
              if (pillarRange === 'Weekly') return d >= new Date(new Date().setDate(new Date().getDate() - 7));
              if (pillarRange === 'Monthly') return d >= new Date(new Date().getFullYear(), new Date().getMonth(), 1);
              if (pillarRange === 'Yearly') return d >= new Date(new Date().getFullYear(), 0, 1);
              return true;
            }).length > 0 ? (
              <div className="progress-mobile-pillars-list">
                {pillarStats.map((pillar) => {
                  const tier = getScoreTier15(pillar.score);
                  return (
                    <div key={pillar.key} className="progress-mobile-pillar-card">
                      <div className="progress-mobile-pillar-header">
                        <div className="progress-mobile-pillar-info">
                          <img src={pillar.image} alt="" className="progress-mobile-pillar-icon" />
                          <h4 className="progress-mobile-pillar-label">{pillar.label}</h4>
                        </div>
                        <span className="progress-mobile-pillar-tier" style={{ background: `${tier.color}20`, color: tier.color }}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="progress-mobile-pillar-score-row">
                        <span className="progress-mobile-pillar-score">{pillar.score.toFixed(1)}</span>
                        <span className="progress-mobile-pillar-total">/ 5.0</span>
                      </div>
                      <div className="progress-mobile-pillar-track">
                        <div
                          className="progress-mobile-pillar-fill"
                          style={{ width: `${pillar.value}%`, background: tier.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="progress-mobile-empty-state" style={{ marginTop: '0', background: '#fff', borderRadius: '24px', padding: '40px 24px' }}>
                No sessions found for this period.
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="progress-mobile-footer">
            <button
              type="button"
              className="progress-mobile-primary-btn"
              onClick={() => setShowMobileHistory(true)}
            >
              Show Session History
            </button>
          </div>
        </div>

        {/* History Sidebar Overlay */}
        {showMobileHistory ? (
          <Suspense fallback={null}>
            <ProgressHistoryMobileLazy
              isOpen={showMobileHistory}
              onClose={() => setShowMobileHistory(false)}
              userSessions={userSessions}
              isLoading={isLoading}
            />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}

export default ProgressPageMobile;
