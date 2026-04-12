import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoArrowForward, IoCheckmarkCircle, IoLockClosed } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import CalendarHeatmap from 'react-calendar-heatmap';
import axios from 'axios';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessions } from '../../hooks/useSessions';
import { ROUTES } from '../../utils/constants';
import { ENV } from '../../config/env';
import Button from '../../components/common/Button';
import {
  GLOBAL_ACTIVITY_SCOPE,
  deriveLevelProgress,
  getActivityCompletionHistory,
  getActivityMetrics,
  getActivityTaskProgress,
  isActivityTaskCompleted,
  getTaskXp,
  getTotalActivityPoints,
} from '../../utils/activityProgress';
import 'react-calendar-heatmap/dist/styles.css';
import './DashboardPage.css';

import iconFire from '../../assets/icons/Icon-Fire.svg';

const DAY_MS = 86_400_000;

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DASHBOARD_STORAGE_KEYS = {
  DAILY_QUOTE: 'bigkas_dashboard_daily_quote',
  QUOTE_EXPIRY: 'bigkas_dashboard_quote_expiry',
};

function getStoredDailyQuote() {
  try {
    const stored = localStorage.getItem(DASHBOARD_STORAGE_KEYS.DAILY_QUOTE);
    const expiry = localStorage.getItem(DASHBOARD_STORAGE_KEYS.QUOTE_EXPIRY);
    if (!stored || !expiry) return null;

    const now = new Date().getTime();
    if (now > Number(expiry)) {
      localStorage.removeItem(DASHBOARD_STORAGE_KEYS.DAILY_QUOTE);
      localStorage.removeItem(DASHBOARD_STORAGE_KEYS.QUOTE_EXPIRY);
      return null;
    }
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function setStoredDailyQuote(quote) {
  try {
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);
    localStorage.setItem(DASHBOARD_STORAGE_KEYS.DAILY_QUOTE, JSON.stringify(quote));
    localStorage.setItem(DASHBOARD_STORAGE_KEYS.QUOTE_EXPIRY, nextMidnight.getTime().toString());
  } catch {
    // Ignore storage errors
  }
}

function getLocalDayIndex(dateInput) {
  const date = new Date(dateInput);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function getSessionDate(session) {
  const rawDate = session?.created_at ?? session?.createdAt;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDayKeyFromDate(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  return getLocalDateKey(date);
}

function buildDayActivityMap(sessions = []) {
  const dayCounts = new Map();

  const addCount = (dateInput, seconds = 0) => {
    const key = getDayKeyFromDate(dateInput);
    if (!key) return;
    const current = dayCounts.get(key) || 0;
    dayCounts.set(key, current + seconds);
  };

  sessions.forEach((session) => {
    if (isPreTestSession(session)) return;
    const sessionDate = getSessionDate(session);
    if (!sessionDate) return;
    const sessionSeconds = Math.max(0, Number(session?.duration_sec ?? session?.duration ?? 0) || 0);
    addCount(sessionDate, sessionSeconds);
  });

  return dayCounts;
}

function isPreTestSession(session) {
  const raw = [
    session?.session_mode,
    session?.mode,
    session?.session_type,
    session?.session_origin,
    session?.speaking_mode,
    session?.entry_point,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();

  return raw.includes('pre-test') || raw.includes('pretest');
}

function buildStreakStats(sessions = [], historyEntries = []) {
  const dayIndexes = new Set();

  const addDate = (dateInput) => {
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) return;
    dayIndexes.add(getLocalDayIndex(parsed));
  };

  sessions.forEach((session) => {
    if (isPreTestSession(session)) return;
    const sessionDate = getSessionDate(session);
    if (sessionDate) {
      addDate(sessionDate);
    }
  });

  historyEntries.forEach((entry) => {
    if (entry?.completedAt) {
      addDate(entry.completedAt);
    }
  });

  const activeDays = [...dayIndexes].sort((a, b) => a - b);
  if (!activeDays.length) {
    return { currentStreak: 0, longestStreak: 0, activeDays: 0 };
  }

  const todayIndex = getLocalDayIndex(new Date());
  const lastActiveDayIndex = activeDays[activeDays.length - 1];
  const daysSinceLastActive = todayIndex - lastActiveDayIndex;

  let currentStreak = 0;
  if (daysSinceLastActive <= 1) {
    const activeSet = new Set(activeDays);
    let cursor = lastActiveDayIndex;
    while (activeSet.has(cursor)) {
      currentStreak += 1;
      cursor -= 1;
    }
  }

  let longestStreak = 0;
  let run = 0;
  let previousIndex = null;

  activeDays.forEach((dayIndex) => {
    if (previousIndex !== null && dayIndex === previousIndex + 1) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    previousIndex = dayIndex;
  });

  return {
    currentStreak,
    longestStreak,
    activeDays: activeDays.length,
  };
}

function getWeekdayPills(activeDayKeys = new Set()) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  // Get to the most recent Monday
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = getLocalDateKey(date);
    // Custom label mapping for the 7 days starting from Monday
    const labelMapping = ['M', 'T', 'W', 'Th', 'F', 'S', 'S'];
    return {
      label: labelMapping[index],
      active: activeDayKeys.has(key),
    };
  });
}

function getProgressiveTaskTemplate() {
  return [
    {
      id: 'three-minute-scripted',
      title: 'Practice scripted speaking for 3 minutes',
      detail: 'Choose one speech and sustain clear pacing for at least 3 minutes.',
      actionRoute: ROUTES.TRAINING_SETUP,
      prerequisiteIds: [],
    },
    {
      id: 'free-randomizer-3x',
      title: 'Complete Free Speech Randomizer 3 times',
      detail: 'Do three short random-topic runs and focus on flow and confidence.',
      actionRoute: ROUTES.PRACTICE,
      prerequisiteIds: ['three-minute-scripted'],
    },
    {
      id: 'review-feedback',
      title: 'Review your latest Detailed Feedback',
      detail: 'Identify one weak pillar and one improvement action for tomorrow.',
      actionRoute: ROUTES.PROGRESS,
      prerequisiteIds: ['free-randomizer-3x'],
    },
    {
      id: 'two-script-run',
      title: 'Run 2 scripted sessions with different speeches',
      detail: 'Switch topics to challenge articulation and consistency.',
      actionRoute: ROUTES.TRAINING_SETUP,
      prerequisiteIds: ['review-feedback'],
    },
    {
      id: 'randomizer-focus',
      title: 'Do Randomizer and avoid filler words',
      detail: 'Complete at least 2 randomizer attempts with intentional pauses.',
      actionRoute: ROUTES.PRACTICE,
      prerequisiteIds: ['two-script-run'],
    },
    {
      id: 'progress-check',
      title: 'Check your trend and set one micro-goal',
      detail: 'Use Progress page to pick one measurable target for next session.',
      actionRoute: ROUTES.PROGRESS,
      prerequisiteIds: ['randomizer-focus'],
    },
  ];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuthContext();
  const { sessions, fetchAllSessions } = useSessions();
  const activityScopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;

  const [insight, setInsight] = useState(() => {
    return getStoredDailyQuote() || {
      text: 'Loading your daily inspiration...',
      author: 'Bigkas AI',
    };
  });

  useEffect(() => {
    const fetchQuote = async () => {
      // Check if we already have a valid stored quote for today
      const existing = getStoredDailyQuote();
      if (existing) {
        setInsight(existing);
        return;
      }

      try {
        // Try the local Python service first
        let quoteData;
        try {
          const serviceUrl = ENV.PYTHON_SERVICE_URL;
          const response = await axios.get(`${serviceUrl}/content/daily-quote`);
          quoteData = {
            text: response.data.text,
            author: response.data.author,
          };
        } catch {
          // Fallback to ZenQuotes if local service fails
          const response = await axios.get('https://api.allorigins.win/raw?url=https://zenquotes.io/api/random');
          if (response.data && response.data[0]) {
            quoteData = {
              text: response.data[0].q,
              author: response.data[0].a,
            };
          }
        }

        if (quoteData) {
          setInsight(quoteData);
          setStoredDailyQuote(quoteData);
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
        const fallback = {
          text: 'The only way to do great work is to love what you do.',
          author: 'Steve Jobs',
        };
        setInsight(fallback);
      }
    };
    fetchQuote();
  }, []);

  const [totalActivityPoints, setTotalActivityPoints] = useState(0);
  const [activityHistory, setActivityHistory] = useState([]);
  const [activityMetrics, setActivityMetrics] = useState(() => getActivityMetrics(activityScopeKey));
  const activityTasks = useMemo(() => getProgressiveTaskTemplate(), []);

  const getPointsFromUser = useCallback((nextUser) => {
    const raw = Number(nextUser?.speakerPoints ?? 0);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.floor(raw));
  }, []);

  const activeDayKeys = useMemo(() => {
    const keys = new Set();
    sessions.forEach((session) => {
      if (isPreTestSession(session)) return;
      const sessionDate = getSessionDate(session);
      if (sessionDate) {
        keys.add(getLocalDateKey(sessionDate));
      }
    });
    activityHistory.forEach((entry) => {
      if (!entry?.completedAt) return;
      const key = getDayKeyFromDate(entry.completedAt);
      if (key) keys.add(key);
    });
    return keys;
  }, [activityHistory, sessions]);

  const streakStats = useMemo(
    () => buildStreakStats(sessions, activityHistory),
    [sessions, activityHistory],
  );

  const weekPills = useMemo(() => getWeekdayPills(activeDayKeys), [activeDayKeys]);

  const dayCounts = useMemo(() => buildDayActivityMap(sessions), [sessions]);

  const heatmapValues = useMemo(() => {
    const values = [];
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 4);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = getLocalDateKey(d);
      values.push({
        date: key,
        count: dayCounts.get(key) || 0,
      });
    }
    return values;
  }, [dayCounts]);

  const effectiveTotalActivityPoints = Math.max(totalActivityPoints, getPointsFromUser(user));

  const levelProgress = useMemo(() => {
    return deriveLevelProgress(effectiveTotalActivityPoints);
  }, [effectiveTotalActivityPoints]);

  const activityTaskState = useMemo(() => {
    return activityTasks.reduce((state, task) => {
      state[task.id] = isActivityTaskCompleted(task.id, activityMetrics);
      return state;
    }, {});
  }, [activityMetrics, activityTasks]);

  const activityUnlockState = useMemo(() => {
    return activityTasks.reduce((state, task) => {
      const prerequisites = Array.isArray(task.prerequisiteIds) ? task.prerequisiteIds : [];
      state[task.id] = prerequisites.every((taskId) => activityTaskState[taskId] === true);
      return state;
    }, {});
  }, [activityTaskState, activityTasks]);

  const completedTaskCount = useMemo(
    () => activityTasks.filter((task) => activityTaskState[task.id] === true).length,
    [activityTaskState, activityTasks],
  );

  const totalTaskXp = useMemo(
    () => activityTasks.reduce((sum, task) => sum + getTaskXp(task.id), 0),
    [activityTasks],
  );

  const earnedTaskXp = useMemo(
    () => activityTasks.reduce((sum, task) => sum + (activityTaskState[task.id] ? getTaskXp(task.id) : 0), 0),
    [activityTaskState, activityTasks],
  );

  const activityProgressPct = activityTasks.length
    ? Math.round((completedTaskCount / activityTasks.length) * 100)
    : 0;

  const currentActiveTask = useMemo(
    () => activityTasks.find((task) => !activityTaskState[task.id] && activityUnlockState[task.id]),
    [activityTaskState, activityTasks, activityUnlockState],
  );

  const nextLockedTask = useMemo(
    () => activityTasks.find((task) => !activityTaskState[task.id] && !activityUnlockState[task.id]),
    [activityTaskState, activityTasks, activityUnlockState],
  );

  const currentActiveTaskProgress = useMemo(() => {
    if (!currentActiveTask) return { current: 0, target: 1 };
    return getActivityTaskProgress(currentActiveTask.id, activityMetrics);
  }, [activityMetrics, currentActiveTask]);

  useEffect(() => {
    if (isInitializing) return;
    if (!user?.id) return;
    fetchAllSessions?.();
  }, [fetchAllSessions, isInitializing, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const syncPoints = () => {
      const localPoints = getTotalActivityPoints(activityScopeKey);
      const remotePoints = getPointsFromUser(user);
      setTotalActivityPoints(Math.max(localPoints, remotePoints));
      setActivityHistory(getActivityCompletionHistory(activityScopeKey));
      setActivityMetrics(getActivityMetrics(activityScopeKey));
    };
    syncPoints();
  }, [activityScopeKey, getPointsFromUser, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const refreshActivity = () => {
      setActivityHistory(getActivityCompletionHistory(activityScopeKey));
      setActivityMetrics(getActivityMetrics(activityScopeKey));
    };
    window.addEventListener('focus', refreshActivity);
    window.addEventListener('storage', refreshActivity);
    document.addEventListener('visibilitychange', refreshActivity);
    return () => {
      window.removeEventListener('focus', refreshActivity);
      window.removeEventListener('storage', refreshActivity);
      document.removeEventListener('visibilitychange', refreshActivity);
    };
  }, [activityScopeKey]);

  return (
    <div className="dashboard-page-new no-scrollbar" style={{ height: '100dvh', overflowY: 'auto' }}>
      <div className="dashboard-layout">
          <section className="dashboard-card dashboard-insight-card dashboard-anim-top">
            <div className="dashboard-insight-header">
              <div>
                <h3 className="dashboard-insight-title">Daily Insight</h3>
                <p className="dashboard-insight-source">From "{insight.author}"</p>
              </div>
              <span className="dashboard-insight-mark">"</span>
            </div>
            <p className="dashboard-insight-copy">"{insight.text}"</p>
          </section>

          <section className="dashboard-card dashboard-heatmap-card dashboard-anim-top dashboard-anim-delay-1">
            <div className="dashboard-card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="dashboard-section-title" style={{ margin: 0 }}>Consistency Visualization</h2>
              <div className="dashboard-heatmap-legend">
                <span>Less</span>
                <span className="heatmap-swatch color-empty" style={{ background: '#dde4d0' }} />
                <span className="heatmap-swatch color-scale-1" style={{ background: '#cfe9c7' }} />
                <span className="heatmap-swatch color-scale-2" style={{ background: '#9caf92' }} />
                <span className="heatmap-swatch color-scale-3" style={{ background: '#587455' }} />
                <span>More</span>
              </div>
            </div>
            <div className="heatmap-container" style={{ padding: '0 10px' }}>
              <CalendarHeatmap
                startDate={new Date(new Date().setMonth(new Date().getMonth() - 4))}
                endDate={new Date()}
                values={heatmapValues}
                classForValue={(value) => {
                  const speakingSeconds = Number(value?.count) || 0;
                  if (speakingSeconds <= 0) return 'color-empty';
                  if (speakingSeconds <= 5 * 60) return 'color-scale-1';
                  if (speakingSeconds <= 15 * 60) return 'color-scale-2';
                  if (speakingSeconds <= 30 * 60) return 'color-scale-3';
                  return 'color-scale-4';
                }}
                titleForValue={(value) => {
                  if (!value?.date) return '';
                  const speakingSeconds = Math.max(0, Number(value?.count) || 0);
                  const minutes = Math.round(speakingSeconds / 60);
                  const readableDate = new Date(value.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });
                  return `${readableDate}: ${minutes} min speaking time`;
                }}
                showWeekdayLabels={false}
              />
            </div>
          </section>

          <section className="dashboard-card dashboard-level-card dashboard-anim-left dashboard-anim-delay-2">
            <div className="dashboard-level-decoration" />
            <div className="dashboard-section-kicker">
              Rank Progression
            </div>
            <h2 className="dashboard-section-title--xl">{levelProgress.levelName}</h2>
            <p className="dashboard-activity-summary">
              Activity Journey: {completedTaskCount}/{activityTasks.length} Task Complete
            </p>
            <div className="dashboard-level-track">
              <div className="dashboard-level-fill" style={{ width: `${activityProgressPct}%` }} />
            </div>
            <p className="dashboard-activity-xp">{earnedTaskXp}/{totalTaskXp} TASK</p>
          </section>

          <section className="dashboard-card dashboard-consistency-card dashboard-anim-right dashboard-anim-delay-3">
            <p className="dashboard-consistency-kicker">Daily Consistency</p>
            <div className="dashboard-consistency-value">
              {streakStats.currentStreak} <img src={iconFire} alt="Streak" className="dashboard-consistency-fire" />
            </div>
            <p className="dashboard-consistency-copy">Day Streak Active</p>
            <div className="dashboard-week-pills" style={{ display: 'flex', gap: '8px' }}>
              {weekPills.map((pill, idx) => (
                <div key={idx} className={`dashboard-week-pill ${pill.active ? 'is-active' : ''}`}>
                  {pill.label}
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-card dashboard-mode-card dashboard-mode-card--practice dashboard-anim-bottom dashboard-anim-delay-4">
            <div className="dashboard-mode-badge">Focus Session</div>
            <h3 className="dashboard-mode-title">Practice Mode</h3>
            <p className="dashboard-mode-copy">Master specific architectural components in a controlled environment.</p>
            <Button 
              variant="practice" 
              className="dashboard-mode-button" 
              onClick={() => navigate(ROUTES.PRACTICE)}
              icon={IoArrowForward}
            >
              Start Practice
            </Button>
          </section>

          <section className="dashboard-card dashboard-mode-card dashboard-mode-card--training dashboard-anim-bottom dashboard-anim-delay-5">
            <div className="dashboard-mode-badge dashboard-mode-badge--alt">Endurance</div>
            <h3 className="dashboard-mode-title">Training Mode</h3>
            <p className="dashboard-mode-copy dashboard-mode-copy--inverse">Push your cognitive limits with real-time structural challenges.</p>
            <Button 
              variant="training" 
              className="dashboard-mode-button" 
              onClick={() => navigate(ROUTES.TRAINING_SETUP)}
              icon={IoArrowForward}
            >
              Begin Training
            </Button>
          </section>

          <section className="dashboard-card dashboard-objectives-card dashboard-anim-bottom dashboard-anim-delay-6">
            <h3 className="dashboard-section-title" style={{ marginBottom: '16px' }}>Current Objectives</h3>
            {currentActiveTask ? (
              <div className="dashboard-objective-row">
                <div className="dashboard-objective-status in-progress" aria-hidden="true" />
                <div className="dashboard-objective-copy">
                  <strong>{currentActiveTask.title}</strong>
                  <span>
                    {Math.min(currentActiveTaskProgress.current, currentActiveTaskProgress.target)} of {currentActiveTaskProgress.target} complete
                  </span>
                </div>
                <Button
                  variant="ghost"
                  className="dashboard-objective-action"
                  onClick={() => navigate(currentActiveTask.actionRoute)}
                  icon={IoArrowForward}
                >
                  Continue Journey
                </Button>
              </div>
            ) : (
              <div className="dashboard-objective-row">
                <div className="dashboard-objective-status is-complete">
                  <IoCheckmarkCircle />
                </div>
                <div className="dashboard-objective-copy">
                  <strong>Journey complete</strong>
                  <span>All activity tasks are completed. Keep practicing to maintain momentum.</span>
                </div>
              </div>
            )}
            {nextLockedTask ? (
              <div className="dashboard-objective-row is-locked" style={{ opacity: 0.6 }}>
                <div className="dashboard-objective-status">
                  <IoLockClosed />
                </div>
                <div className="dashboard-objective-copy">
                  <strong>{nextLockedTask.title}</strong>
                  <span>Locked: Finish Current Objective to unlock</span>
                </div>
              </div>
            ) : null}
          </section>
      </div>
    </div>
  );
}