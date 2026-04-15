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
  IoTimeOutline, 
  IoCalendarOutline,
  IoVideocamOutline,
  IoMicOutline,
  IoChatbubbleEllipsesOutline,
  IoTrophyOutline,
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
import './ProgressPage.css';

const TIME_RANGES = ['daily', 'Weekly', 'Monthly', 'Yearly'];
const HISTORY_FILTERS = ['All', 'Today', 'This Week', 'This Month'];

function toFivePointScore(rawScore) {
  const normalized = Math.max(0, Math.min(100, Number(rawScore) || 0));
  return Math.round((1 + (normalized / 100) * 4) * 10) / 10;
}

function formatFivePointScore(rawScore) {
  return toFivePointScore(rawScore).toFixed(1);
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

function getResponsiveHistoryPageSize(viewportHeight = 0) {
  if (viewportHeight >= 1300) return 5; // 2K+ displays
  if (viewportHeight >= 900) return 4; // 1080p and similar
  return 3; // smaller heights
}

function getAdaptiveHistoryPages(pageCount, activePage) {
  if (pageCount <= 6) {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const leadingWindow = [0, 1, 2, 3].filter((index) => index < pageCount - 1);
  const trailingWindow = [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1]
    .filter((index) => index > 0);

  // Keep ellipsis on one side only: end when browsing early pages, start when browsing later pages.
  if (activePage < Math.ceil(pageCount / 2)) {
    return [...leadingWindow, 'end-ellipsis', pageCount - 1];
  }

  return [0, 'start-ellipsis', ...trailingWindow];
}

function ProgressPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessions, fetchAllSessions, isLoading } = useSessionContext();
  const { user, isInitializing, updateUserMetadata } = useAuthContext();
  const hasRequestedForUserRef = useRef('');

  const hasLoggedActivityTaskRef = useRef(false);
  const activityScopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;

  const [range, setRange] = useState('Weekly');
  const [pillarRange, setPillarRange] = useState('Weekly');
  const [historyFilter, setHistoryFilter] = useState('All');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(() =>
    getResponsiveHistoryPageSize(typeof window !== 'undefined' ? window.innerHeight : 1080),
  );

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
    if (typeof window === 'undefined') return undefined;

    const syncHistoryPageSize = () => {
      setHistoryPageSize(getResponsiveHistoryPageSize(window.innerHeight));
    };

    syncHistoryPageSize();
    window.addEventListener('resize', syncHistoryPageSize);
    return () => window.removeEventListener('resize', syncHistoryPageSize);
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
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    if (range === 'daily') {
      const result = [];
      for (let i = 23; i >= 0; i -= 1) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - i, 0, 0, 0);
        const hourSessions = userSessions.filter(s => {
          const d = new Date(s.created_at);
          return d.getTime() >= hour.getTime() && d.getTime() < hour.getTime() + 3600000;
        });
        const avg = hourSessions.length ? Math.round(hourSessions.reduce((a, b) => a + (b.confidence_score || 0), 0) / hourSessions.length) : 0;
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
        const avg = daySessions.length ? Math.round(daySessions.reduce((a, b) => a + (b.confidence_score || 0), 0) / daySessions.length) : 0;
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
        const avg = weekSessions.length ? Math.round(weekSessions.reduce((a, b) => a + (b.confidence_score || 0), 0) / weekSessions.length) : 0;
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
        const avg = monthSessions.length ? Math.round(monthSessions.reduce((a, b) => a + (b.confidence_score || 0), 0) / monthSessions.length) : 0;
        result.push({ label: monthNames[monthStart.getMonth()], value: avg });
      }
      return result;
    }

    return [];
  }, [range, userSessions]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    
    const weekSessions = userSessions.filter(s => new Date(s.created_at) >= weekStart);
    const avgScoreRaw = userSessions.length
      ? userSessions.reduce((a, b) => a + (b.confidence_score || 0), 0) / userSessions.length
      : 0;
    const totalTimeSec = userSessions.reduce((a, b) => a + (b.duration_sec || b.duration || 0), 0);
    const totalTimeMin = Math.round(totalTimeSec / 60);

    return {
      sessionsThisWeek: weekSessions.length,
      averageScoreLabel: formatFivePointScore(avgScoreRaw),
      averageScoreRaw: avgScoreRaw,
      totalSpeakingTime: totalTimeMin,
    };
  }, [userSessions]);

  const pillarStats = useMemo(() => {
    const now = new Date();
    const filteredSessions = userSessions.filter((session) => {
      const createdAt = new Date(session.created_at);
      if (pillarRange === 'daily') {
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
        label: 'Visual Presence',
        color: '#2d5a27',
        icon: IoVideocamOutline,
        iconBg: 'rgba(45, 90, 39, 0.1)',
        resolver: (session) => {
          const facial = Number(session.facial_expression_score);
          const gesture = Number(session.gesture_score);
          const pool = [facial, gesture].filter((value) => Number.isFinite(value));
          if (!pool.length) return null;
          return pool.reduce((sum, value) => sum + value, 0) / pool.length;
        },
        subMetricsConfig: [
          { label: 'Eye Contact', resolver: (s) => Number(s.facial_expression_score) },
          { label: 'Gestures', resolver: (s) => Number(s.gesture_score) }
        ]
      },
      {
        key: 'verbal',
        label: 'Verbal Flow',
        color: '#2d5a27',
        icon: IoChatbubbleEllipsesOutline,
        iconBg: 'rgba(45, 90, 39, 0.1)',
        resolver: (session) => {
          const context = Number(session.context_score);
          const fluency = Number(session.fluency_score);
          const pool = [context, fluency].filter((value) => Number.isFinite(value));
          if (!pool.length) return null;
          return pool.reduce((sum, value) => sum + value, 0) / pool.length;
        },
        subMetricsConfig: [
          { label: 'Pronunciation', resolver: (s) => Number(s.pronunciation_score) },
          { label: 'Context Awareness', resolver: (s) => Number(s.context_score) }
        ]
      },
      {
        key: 'vocal',
        label: 'Vocal Clarity',
        color: '#2d5a27',
        icon: IoMicOutline,
        iconBg: 'rgba(45, 90, 39, 0.1)',
        resolver: (session) => {
          const pronunciation = Number(session.pronunciation_score);
          const jitter = Number(session.jitter_score);
          const shimmer = Number(session.shimmer_score);
          const jitterAdjusted = Number.isFinite(jitter) ? 100 - jitter : null;
          const shimmerAdjusted = Number.isFinite(shimmer) ? 100 - shimmer : null;
          const pool = [pronunciation, jitterAdjusted, shimmerAdjusted]
            .filter((value) => Number.isFinite(value));
          if (!pool.length) return null;
          return pool.reduce((sum, value) => sum + value, 0) / pool.length;
        },
        subMetricsConfig: [
          { label: 'Shimmer', resolver: (s) => Number.isFinite(Number(s.shimmer_score)) ? Number(s.shimmer_score) : null },
          { label: 'Jitter', resolver: (s) => Number.isFinite(Number(s.jitter_score)) ? Number(s.jitter_score) : null }
        ]
      }
    ];

    return metricConfig.map((pillar) => {
      const values = filteredSessions
        .map((session) => pillar.resolver(session))
        .filter((value) => Number.isFinite(value) && value !== null);

      const avg = values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;

      const subMetrics = pillar.subMetricsConfig.map((sub) => {
        const subValues = filteredSessions
          .map((session) => sub.resolver(session))
          .filter((value) => Number.isFinite(value) && value !== null);
        
        const subAvg = subValues.length
          ? Math.round(subValues.reduce((sum, value) => sum + value, 0) / subValues.length)
          : 0;
          
        return { label: sub.label, value: subAvg };
      });

      return { ...pillar, value: avg, subMetrics };
    });
  }, [pillarRange, userSessions]);

  const historySessions = useMemo(() => {
    const startDate = historyStartDate ? new Date(`${historyStartDate}T00:00:00`) : null;
    const endDate = historyEndDate ? new Date(`${historyEndDate}T23:59:59.999`) : null;

    const filtered = userSessions.filter(s => {
      const d = new Date(s.created_at);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      if (historyFilter === 'Today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
      }
      if (historyFilter === 'This Week') {
        const week = new Date();
        week.setDate(week.getDate() - 7);
        return d >= week;
      }
      if (historyFilter === 'This Month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        return d >= monthStart;
      }
      return true;
    });

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [historyEndDate, historyFilter, historyStartDate, userSessions]);

  const historyPageCount = useMemo(
    () => Math.ceil(historySessions.length / historyPageSize),
    [historySessions.length, historyPageSize],
  );

  const safeHistoryPage = Math.min(historyPage, Math.max(0, historyPageCount - 1));

  const paginatedHistorySessions = useMemo(() => {
    const start = safeHistoryPage * historyPageSize;
    return historySessions.slice(start, start + historyPageSize);
  }, [safeHistoryPage, historySessions, historyPageSize]);

  const adaptiveHistoryPages = useMemo(
    () => getAdaptiveHistoryPages(historyPageCount, safeHistoryPage),
    [historyPageCount, safeHistoryPage],
  );

  return (
    <div className="progress-page-bg no-scrollbar" style={{ height: '100dvh', overflowY: 'auto' }}>
      <div className="progress-main-layout">
        <div className="progress-left-content">
          {/* Graph Card */}
          <div className="progress-trend-card dashboard-anim-bottom">
            <div className="progress-chart-header">
              <div className="progress-range-labels">
                {TIME_RANGES.map(r => (
                  <span 
                    key={r} 
                    style={{ cursor: 'pointer', color: range === r ? '#F18F01' : '#666' }}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </span>
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
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={range === 'daily' ? 10 : 30}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#F18F01' : '#f0f0f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Row */}
          <div className="progress-stats-row">
            <div className="stat-block dashboard-anim-bottom dashboard-anim-delay-1">
              <div className="stat-icon-wrap">
                <IoCalendarOutline />
              </div>
              <p className="stat-title">Sessions This Week</p>
              <p className={`stat-num ${stats.sessionsThisWeek > 0 ? 'glow-text' : ''}`}>{stats.sessionsThisWeek}</p>
              <p className="stat-desc">Attempts</p>
            </div>
            <div className="stat-block dashboard-anim-bottom dashboard-anim-delay-2">
              <div className="stat-icon-wrap">
                <IoTrophyOutline />
              </div>
              <p className="stat-title">Average Score</p>
              <p className={`stat-num ${stats.averageScoreRaw > 0 ? 'glow-text' : ''}`}>{stats.averageScoreLabel}</p>
              <p className="stat-desc">/5.0</p>
            </div>
            <div className="stat-block dashboard-anim-bottom dashboard-anim-delay-3">
              <div className="stat-icon-wrap">
                <IoTimeOutline />
              </div>
              <p className="stat-title">Total Speaking Time</p>
              <p className={`stat-num ${stats.totalSpeakingTime > 0 ? 'glow-text' : ''}`}>{stats.totalSpeakingTime}</p>
              <p className="stat-desc">Minutes</p>
            </div>
          </div>

          {/* Pillars Grid */}
          <div className="progress-pillars-header dashboard-anim-bottom dashboard-anim-delay-4">
            <h3 className="progress-pillars-title">Pillar Trends</h3>
            <div className="progress-range-labels">
              {TIME_RANGES.map((r) => (
                <span
                  key={`pillar-${r}`}
                  style={{ cursor: 'pointer', color: pillarRange === r ? '#F18F01' : '#666' }}
                  onClick={() => setPillarRange(r)}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="progress-pillars-grid">
            {pillarStats.map((pillar, index) => (
              <div key={pillar.key} className={`pillar-card dashboard-anim-bottom dashboard-anim-delay-${5 + index}`}>
                <div className="pillar-main-section">
                  <div className="pillar-info">
                    <span className="pillar-icon" style={{ background: pillar.iconBg, color: pillar.color }}>
                      <pillar.icon />
                    </span>
                    <div className="pillar-label-group">
                      <span className="pillar-label">{pillar.label}</span>
                    </div>
                  </div>
                  <div className="pillar-progress-container">
                    <div className="pillar-progress-header" style={{ width: `${pillar.value}%` }}>
                      <span className="pillar-value">{pillar.value}%</span>
                    </div>
                    <div className="pillar-track">
                      <div 
                        className={`pillar-fill ${pillar.value > 80 ? 'mastery-pulse' : ''}`} 
                        style={{ width: `${pillar.value}%` }} 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pillar-divider" />
                
                <div className="pillar-sub-section">
                  {pillar.subMetrics.map((sub, i) => (
                    <div key={i} className="sub-metric">
                      <div className="sub-metric-header">
                        <span>{sub.label}</span>
                        <span>{sub.value}%</span>
                      </div>
                      <div className="sub-metric-track">
                        <div className="sub-metric-fill" style={{ width: `${sub.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* History Sidebar */}
        <div className="progress-history-sidebar">
          <div className="history-container">
            <div className="history-sticky-header dashboard-anim-top dashboard-anim-delay-1">
              <h2 className="history-title">History</h2>
              <div className="history-filters">
                {HISTORY_FILTERS.map(f => (
                  <button 
                    key={f}
                    className={`history-filter-btn ${historyFilter === f ? 'active' : ''}`}
                    onClick={() => {
                      setHistoryFilter(f);
                      setHistoryPage(0);
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="history-date-range">
                <div className="history-sort-label">Date range</div>
                <div className="history-date-grid">
                  <label className="history-date-field">
                    <span>Start date</span>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(event) => {
                        setHistoryStartDate(event.target.value);
                        setHistoryPage(0);
                      }}
                    />
                  </label>
                  <label className="history-date-field">
                    <span>End date</span>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(event) => {
                        setHistoryEndDate(event.target.value);
                        setHistoryPage(0);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="history-list">
            {paginatedHistorySessions.map((s, index) => {
              const mode = getSessionMode(s);
              const delay = Math.min(index + 2, 9);
              return (
                <div 
                  key={s.id} 
                  className={`history-item dashboard-anim-bottom dashboard-anim-delay-${delay}`}
                  onClick={() => navigate(buildRoute.sessionResult(s.id), { state: { ...s, source: 'progress' } })}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="history-item-top">
                    <h3 className="history-item-title">{buildSessionTitleOrTopic(s)}</h3>
                    <span className={`history-item-tag ${mode.toLowerCase().replace(' ', '-')}`}>
                      {mode}
                    </span>
                  </div>
                  <div className="history-item-meta">
                    <div className="history-item-meta-row">
                      <IoCalendarOutline /> {formatDate(s.created_at)}
                    </div>
                    <div className="history-item-meta-row">
                      <IoTimeOutline /> {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="history-item-meta">
                    <div className="history-item-meta-row">
                      <IoTimeOutline /> {formatDuration(s.duration_sec || s.duration || 0)}
                    </div>
                  </div>
                  <div className="history-item-bottom">
                    <span className="history-item-score-label">Score:</span>
                    <span className="history-item-score">{formatFivePointScore(s.confidence_score)} / 5.0</span>
                  </div>
                </div>
              );
            })}
            {isLoading && historySessions.length === 0 && (
              <p style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>Loading history...</p>
            )}
            {!isLoading && historySessions.length === 0 && (
              <p style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No sessions found.</p>
            )}
            </div>
            {!isLoading && historyPageCount > 1 && (
              <div className="history-pagination-shell">
                <ul className="history-pagination" aria-label="History pagination">
                  <li className={`history-pagination-page history-pagination-nav ${safeHistoryPage <= 0 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="history-pagination-link"
                      onClick={() => setHistoryPage((current) => Math.max(0, current - 1))}
                      disabled={safeHistoryPage <= 0}
                      aria-label="Previous history page"
                    >
                      <IoChevronBack aria-hidden="true" />
                    </button>
                  </li>

                  {adaptiveHistoryPages.map((entry, idx) => {
                    if (entry === 'start-ellipsis' || entry === 'end-ellipsis') {
                      return (
                        <li key={`${entry}-${idx}`} className="history-pagination-break" aria-hidden="true">
                          ...
                        </li>
                      );
                    }

                    const isActive = entry === safeHistoryPage;
                    return (
                      <li key={`page-${entry}`} className={`history-pagination-page ${isActive ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="history-pagination-link"
                          onClick={() => setHistoryPage(entry)}
                          aria-label={`Go to history page ${entry + 1}`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {entry + 1}
                        </button>
                      </li>
                    );
                  })}

                  <li className={`history-pagination-page history-pagination-nav ${safeHistoryPage >= historyPageCount - 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="history-pagination-link"
                      onClick={() => setHistoryPage((current) => Math.min(historyPageCount - 1, current + 1))}
                      disabled={safeHistoryPage >= historyPageCount - 1}
                      aria-label="Next history page"
                    >
                      <IoChevronForward aria-hidden="true" />
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
        </div>
    </div>
  );
}

export default ProgressPage;
