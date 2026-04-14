import { useEffect, useMemo, useState } from 'react';
import { IoArrowForward } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessions } from '../../hooks/useSessions';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import {
  GLOBAL_ACTIVITY_SCOPE,
  getBigkasLevelFromUser,
  getActivityCompletionHistory,
  getActivityMetrics,
  isActivityTaskCompleted,
  getTaskXp,
} from '../../utils/activityProgress';
import './DashboardPage.css';

import iconFire from '../../assets/icons/Icon-Fire.svg';

const DAY_MS = 86_400_000;

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuthContext();
  const { sessions, fetchAllSessions } = useSessions();
  const activityScopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;

  const activityHistory = useMemo(
    () => (user?.id ? getActivityCompletionHistory(activityScopeKey) : []),
    [activityScopeKey, user?.id],
  );
  const activityMetrics = useMemo(
    () => getActivityMetrics(activityScopeKey),
    [activityScopeKey],
  );
  const [isMobileView, setIsMobileView] = useState(
    typeof window === 'undefined' ? true : window.matchMedia('(max-width: 1024px)').matches,
  );
  const levelProgress = useMemo(() => getBigkasLevelFromUser(user), [user]);
  const selectedLevel = Number(levelProgress.levelNumber) || 1;
  const { tasks: activityTasks, loading: activitiesLoading } = useActivitiesJourneyTasks(selectedLevel);

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

  useEffect(() => {
    if (isInitializing) return;
    if (!user?.id) return;
    fetchAllSessions?.();
  }, [fetchAllSessions, isInitializing, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => setIsMobileView(window.matchMedia('(max-width: 1024px)').matches);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (!isMobileView) {
      navigate(ROUTES.ACTIVITY, { replace: true });
    }
  }, [isInitializing, isMobileView, navigate]);

  if (!isMobileView) return null;

  return (
    <div className="dashboard-page-new no-scrollbar" style={{ height: '100dvh', overflowY: 'auto' }}>
      <aside className="dashboard-sidebar-mobile no-scrollbar">
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

        <section className="dashboard-card dashboard-level-card dashboard-anim-left dashboard-anim-delay-2">
          <div className="dashboard-level-decoration" />
          <div className="dashboard-section-kicker">Rank Progression</div>
          <h2 className="dashboard-section-title--xl">{levelProgress.levelName}</h2>
          <p className="dashboard-activity-summary">
            {activitiesLoading
              ? 'Loading journey…'
              : `Activity Journey: ${completedTaskCount}/${Math.max(activityTasks.length, 1)} Task Complete`}
          </p>
          <div className="dashboard-level-track">
            <div className="dashboard-level-fill" style={{ width: `${activityProgressPct}%` }} />
          </div>
          <p className="dashboard-activity-xp">{earnedTaskXp}/{totalTaskXp} TASK</p>
        </section>

        <section className="dashboard-card dashboard-mode-card dashboard-mode-card--training activity-practice-hub dashboard-anim-bottom dashboard-anim-delay-4">
          <h3 className="dashboard-mode-title">Practice Hub</h3>
          <div className="activity-practice-options">
            <article className="activity-practice-option-card">
              <p className="activity-practice-option-kicker">Randomizer</p>
              <p className="activity-practice-option-copy">Get a random topic and practice speaking about it.</p>
              <Button
                variant="practice"
                className="dashboard-mode-button"
                onClick={() => navigate(ROUTES.PRACTICE)}
                icon={IoArrowForward}
              >
                Open Randomizer
              </Button>
            </article>
            <article className="activity-practice-option-card">
              <p className="activity-practice-option-kicker">Free Speech</p>
              <p className="activity-practice-option-copy">Impromptu speaking mode focused on flow, tone, and pacing with AI evaluation.</p>
              <Button
                variant="training"
                className="dashboard-mode-button"
                onClick={() => navigate(ROUTES.TRAINING_SETUP)}
                icon={IoArrowForward}
              >
                Open Free Speech
              </Button>
            </article>
          </div>
        </section>
      </aside>
    </div>
  );
}
