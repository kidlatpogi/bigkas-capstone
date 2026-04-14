import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoArrowForward } from 'react-icons/io5';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessions } from '../../hooks/useSessions';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import {
  GLOBAL_ACTIVITY_SCOPE,
  buildActivityMetricsKey,
  getActivityTaskProgress,
  getActivityMetrics,
  getActivityCompletionHistory,
  getBigkasLevelFromUser,
  getTaskXp,
  isActivityTaskCompleted,
} from '../../utils/activityProgress';
import SkywardJourney from '../../components/journey/SkywardJourney';
import { getActiveTaskId, getNodeStateForTask } from '../../components/journey/journeyConstants';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';
import { ensureJourneyStarted, updateJourneyCurrentActivity } from '../../services/journeyProgressService';
import iconFire from '../../assets/icons/Icon-Fire.svg';
import './InnerPages.css';
import './ActivityPage.css';
import './DashboardPage.css';

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
    session?.session_mode, session?.mode, session?.session_type,
    session?.session_origin, session?.speaking_mode, session?.entry_point,
  ].filter((v) => typeof v === 'string' && v.trim()).join(' ').toLowerCase();
  return raw.includes('pre-test') || raw.includes('pretest');
}

function buildStreakStats(sessions = [], historyEntries = []) {
  const dayIndexes = new Set();
  const addDate = (dateInput) => {
    const parsed = new Date(dateInput);
    if (!Number.isNaN(parsed.getTime())) dayIndexes.add(getLocalDayIndex(parsed));
  };
  sessions.forEach((s) => { if (!isPreTestSession(s)) { const d = getSessionDate(s); if (d) addDate(d); } });
  historyEntries.forEach((e) => { if (e?.completedAt) addDate(e.completedAt); });
  const activeDays = [...dayIndexes].sort((a, b) => a - b);
  if (!activeDays.length) return { currentStreak: 0 };
  const todayIndex = getLocalDayIndex(new Date());
  const last = activeDays[activeDays.length - 1];
  let currentStreak = 0;
  if (todayIndex - last <= 1) {
    const set = new Set(activeDays);
    let cursor = last;
    while (set.has(cursor)) { currentStreak += 1; cursor -= 1; }
  }
  return { currentStreak };
}

function getWeekdayPills(activeDayKeys = new Set()) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { label: ['M', 'T', 'W', 'Th', 'F', 'S', 'S'][i], active: activeDayKeys.has(getLocalDateKey(d)) };
  });
}

function ActivityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [entranceFromNav] = useState(() => location.state?.skywardEntrance === true);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  /** Activities are filtered by `target_level` = Bigkas rank (same as dashboard `levelProgress.levelName`). */
  const { tasks, loading: activitiesLoading, error: activitiesError } = useActivitiesJourneyTasks();
  const { metricsSyncKey, refreshJourney } = useJourneyRemoteState(user);
  const stampResetTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const previousTaskStateRef = useRef({});
  const hasTaskStateHydratedRef = useRef(false);

  const [activityMetrics, setActivityMetrics] = useState(() => getActivityMetrics(scopeKey));
  const [recentStampedTaskId, setRecentStampedTaskId] = useState(null);
  const { sessions, fetchAllSessions } = useSessions();
  const [activityHistory, setActivityHistory] = useState([]);

  useEffect(() => {
    return () => {
      if (stampResetTimeoutRef.current) {
        window.clearTimeout(stampResetTimeoutRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const refreshMetrics = () => {
      setActivityMetrics(getActivityMetrics(scopeKey));
    };
    const onStorage = (event) => {
      if (event.key === buildActivityMetricsKey(scopeKey)) {
        refreshMetrics();
      }
    };

    window.addEventListener('focus', refreshMetrics);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', refreshMetrics);

    return () => {
      window.removeEventListener('focus', refreshMetrics);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', refreshMetrics);
    };
  }, [scopeKey]);

  useEffect(() => {
    setActivityMetrics(getActivityMetrics(scopeKey));
  }, [scopeKey, metricsSyncKey]);

  useEffect(() => {
    if (!user?.id) return;
    fetchAllSessions?.();
  }, [fetchAllSessions, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setActivityHistory(getActivityCompletionHistory(scopeKey));
  }, [scopeKey, user?.id, metricsSyncKey]);

  const levelProgress = useMemo(() => getBigkasLevelFromUser(user), [user]);

  const completedTaskCount = useMemo(
    () => tasks.filter((t) => isActivityTaskCompleted(t.id, activityMetrics)).length,
    [tasks, activityMetrics],
  );

  const totalTaskXp = useMemo(
    () => tasks.reduce((sum, t) => sum + getTaskXp(t.id), 0),
    [tasks],
  );

  const earnedTaskXp = useMemo(
    () => tasks.reduce((sum, t) => sum + (isActivityTaskCompleted(t.id, activityMetrics) ? getTaskXp(t.id) : 0), 0),
    [tasks, activityMetrics],
  );

  const sidebarProgressPct = tasks.length
    ? Math.round((completedTaskCount / tasks.length) * 100)
    : 0;

  const activeDayKeys = useMemo(() => {
    const keys = new Set();
    sessions.forEach((s) => {
      if (isPreTestSession(s)) return;
      const d = getSessionDate(s);
      if (d) keys.add(getLocalDateKey(d));
    });
    activityHistory.forEach((e) => {
      if (!e?.completedAt) return;
      const k = getDayKeyFromDate(e.completedAt);
      if (k) keys.add(k);
    });
    return keys;
  }, [sessions, activityHistory]);

  const streakStats = useMemo(() => buildStreakStats(sessions, activityHistory), [sessions, activityHistory]);
  const weekPills = useMemo(() => getWeekdayPills(activeDayKeys), [activeDayKeys]);

  useEffect(() => {
    if (!user?.id || activitiesLoading) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await ensureJourneyStarted(user.id);
        if (!cancelled) await refreshJourney();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activitiesLoading, refreshJourney]);

  const taskState = useMemo(() => {
    return tasks.reduce((state, task) => {
      state[task.id] = isActivityTaskCompleted(task.id, activityMetrics);
      return state;
    }, {});
  }, [tasks, activityMetrics]);

  const taskProgress = useMemo(() => {
    return tasks.reduce((state, task) => {
      state[task.id] = getActivityTaskProgress(task.id, activityMetrics);
      return state;
    }, {});
  }, [tasks, activityMetrics]);

  const taskUnlockState = useMemo(() => {
    return tasks.reduce((state, task) => {
      const prerequisites = Array.isArray(task.prerequisiteIds) ? task.prerequisiteIds : [];
      const isUnlocked = prerequisites.every((prerequisiteId) => taskState[prerequisiteId] === true);
      state[task.id] = isUnlocked;
      return state;
    }, {});
  }, [taskState, tasks]);

  const activeTaskId = useMemo(
    () => getActiveTaskId(tasks, taskState, taskUnlockState),
    [tasks, taskState, taskUnlockState],
  );

  useEffect(() => {
    if (!user?.id) return undefined;
    const t = window.setTimeout(() => {
      updateJourneyCurrentActivity(user.id, activeTaskId ?? null).catch(() => {});
    }, 450);
    return () => window.clearTimeout(t);
  }, [user?.id, activeTaskId]);

  const playCompletionSound = useCallback(() => {
    if (typeof window === 'undefined') return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContextClass();
    }

    const audioCtx = audioContextRef.current;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.24);
  }, []);

  useEffect(() => {
    if (!hasTaskStateHydratedRef.current) {
      previousTaskStateRef.current = taskState;
      hasTaskStateHydratedRef.current = true;
      return;
    }

    const newlyCompletedTask = tasks.find((task) => {
      const wasDone = previousTaskStateRef.current[task.id] === true;
      const isDoneNow = taskState[task.id] === true;
      return !wasDone && isDoneNow;
    });

    previousTaskStateRef.current = taskState;
    if (!newlyCompletedTask) return;

    setRecentStampedTaskId(newlyCompletedTask.id);
    playCompletionSound();

    if (stampResetTimeoutRef.current) {
      window.clearTimeout(stampResetTimeoutRef.current);
    }

    stampResetTimeoutRef.current = window.setTimeout(() => {
      setRecentStampedTaskId((current) => (current === newlyCompletedTask.id ? null : current));
    }, 700);
  }, [playCompletionSound, taskState, tasks]);

  const handleTaskAction = useCallback((task) => {
    navigate(task.actionRoute, {
      state: {
        fromActivityTaskId: task.id,
      },
    });
  }, [navigate]);

  const totalStages = tasks.length;

  const scrollToStepIndex = useMemo(() => {
    if (location.state?.focusCurrentStage !== true || !totalStages) return null;
    const idx = tasks.findIndex((t) => t.id === activeTaskId);
    return idx >= 0 ? idx : 0;
  }, [location.state?.focusCurrentStage, tasks, activeTaskId, totalStages]);

  useEffect(() => {
    if (location.state?.focusCurrentStage !== true) return undefined;
    const t = window.setTimeout(() => {
      navigate(location.pathname, {
        replace: true,
        state: { ...(location.state || {}), focusCurrentStage: false },
      });
    }, 800);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.state?.focusCurrentStage, navigate]);

  const journeySteps = useMemo(
    () =>
      tasks.map((task) => ({
        id: task.id,
        task,
        title: task.title,
        pillarName: task.phase_name,
        stageNumber: task.activity_order,
        totalStages,
        isRankUp: task.activity_order === 31,
        nodeState: getNodeStateForTask(task.id, taskState, taskUnlockState, activeTaskId),
        onActivate: () => handleTaskAction(task),
      })),
    [tasks, taskState, taskUnlockState, activeTaskId, handleTaskAction, totalStages],
  );

  const groupedTasks = useMemo(() => {
    if (!journeySteps.length) return [];
    return journeySteps.reduce((acc, step) => {
      const phaseName = step.pillarName || "Training";
      const existingPhase = acc.find(p => p.phaseName === phaseName);
      if (existingPhase) {
        existingPhase.tasks.push(step);
      } else {
        acc.push({ phaseName, tasks: [step] });
      }
      return acc;
    }, []);
  }, [journeySteps]);

  const renderTaskCard = ({ task, historyEntry = null, animationClass = '' }) => {
    const done = taskState[task.id] === true;
    const isUnlocked = taskUnlockState[task.id] === true;
    const isLocked = !done && !isUnlocked;
    const shouldAnimateStamp = done && recentStampedTaskId === task.id;
    const progress = taskProgress[task.id] || { current: 0, target: 1 };
    const canShowProgress = !isLocked && progress.target > 1;
    const progressPctForTask = Math.max(0, Math.min(100, Math.round((progress.current / progress.target) * 100)));
    const clampedProgressCurrent = Math.min(progress.current, progress.target);
    const ctaLabel = done
      ? 'Completed'
      : isLocked
        ? 'Locked'
        : progress.current > 0
          ? `Continue ${clampedProgressCurrent}/${progress.target}`
          : 'Start';
    const completedDateText = historyEntry?.completedAt
      ? new Date(historyEntry.completedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      : null;

    const w = task.weights || {};
    const weightsLine = [w.vis, w.voc, w.ver].some((n) => Number.isFinite(n))
      ? `VVV weights — Visual ${Math.round(Number(w.vis) * 100)}% · Vocal ${Math.round(Number(w.voc) * 100)}% · Verbal ${Math.round(Number(w.ver) * 100)}%`
      : null;

    return (
      <div key={task.id} className={`page-card activity-task-card${done ? ' done' : ''}${isLocked ? ' locked' : ''} ${animationClass}`.trim()}>
        <div className="activity-task-top">
          <div className="activity-task-heading">
            <span className={`activity-task-name${done ? ' done' : ''}`}>{task.title}</span>
            {done ? (
              <span className={`activity-task-done-stamp${shouldAnimateStamp ? ' popping' : ''}`}>DONE</span>
            ) : null}
          </div>
          <span className="activity-task-xp">+ {getTaskXp(task.id)} EXP</span>
        </div>

        <p className="activity-task-detail">{task.objective || task.detail}</p>
        {weightsLine ? <p className="activity-task-detail" style={{ opacity: 0.85, fontSize: '0.9em' }}>{weightsLine}</p> : null}

        {completedDateText ? <p className="activity-task-history-meta">Completed {completedDateText}</p> : null}

        {isLocked ? (
          <p className="activity-task-lock-note">Finish previous activities first to unlock this step.</p>
        ) : null}

        <div className="activity-task-actions">
          <button
            type="button"
            className={`activity-action-btn${isLocked ? ' is-locked' : ''}${canShowProgress ? ' with-progress' : ''}`}
            onClick={() => handleTaskAction(task)}
            disabled={isLocked || done}
          >
            {canShowProgress ? (
              <span className="activity-action-progress-fill" style={{ width: `${progressPctForTask}%` }} />
            ) : null}
            <span className="activity-action-btn-text">{ctaLabel}</span>
          </button>
        </div>
      </div>
    );
  };

  if (activitiesLoading) {
    return (
      <div className="inner-page activity-page">
        <div className="activity-content-wrap" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="section-label">Loading journey…</p>
        </div>
      </div>
    );
  }

  if (activitiesError) {
    return (
      <div className="inner-page activity-page">
        <div className="activity-content-wrap" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="activity-task-lock-note">Could not load activities: {activitiesError}</p>
          <p className="activity-task-detail">Ensure the `activities` table exists and RLS allows read for authenticated users.</p>
        </div>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="inner-page activity-page">
        <div className="activity-content-wrap" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="section-label">No activities yet</p>
          <p className="activity-task-detail">Add rows to the `activities` table in Supabase to populate this journey.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inner-page activity-page activity-page--skyward-entrance">
      <div className="activity-two-col">
        <div className="activity-col-main">
          <div className="activity-content-wrap activity-content-wrap--journey-scroll">
            <div className="activity-task-list activity-task-list--journey">
              <SkywardJourney
                steps={journeySteps}
                groupedTasks={groupedTasks}
                entranceFromNav={entranceFromNav}
                scrollToStepIndex={scrollToStepIndex}
                renderStepContent={(step, meta) =>
                  renderTaskCard({
                    task: step.task,
                    animationClass: `dashboard-anim-bottom dashboard-anim-delay-${Math.min(meta.stepIndex + 2, 9)}`,
                  })
                }
              />
            </div>
          </div>
        </div>

        <aside className="activity-col-sidebar no-scrollbar">
          <section className="dashboard-card dashboard-level-card dashboard-anim-left dashboard-anim-delay-2">
            <div className="dashboard-level-decoration" />
            <div className="dashboard-section-kicker">Rank Progression</div>
            <h2 className="dashboard-section-title--xl">{levelProgress.levelName}</h2>
            <p className="dashboard-activity-summary">
              {activitiesLoading
                ? 'Loading journey…'
                : `Activity Journey: ${completedTaskCount}/${Math.max(tasks.length, 1)} Task Complete`}
            </p>
            <div className="dashboard-level-track">
              <div className="dashboard-level-fill" style={{ width: `${sidebarProgressPct}%` }} />
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
        </aside>
      </div>
    </div>
  );
}

export default ActivityPage;
