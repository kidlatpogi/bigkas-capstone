import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useAuthContext } from '../../context/useAuthContext';
import { useSessions } from '../../hooks/useSessions';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/common/Button';
import PushButton from '../../components/common/PushButton';
import {
  GLOBAL_ACTIVITY_SCOPE,
  getActivityTaskProgress,
  getActivityMetrics,
  getActivityCompletionHistory,
  getBigkasLevelFromUser,
  getTaskXp,
  isActivityTaskCompleted,
} from '../../utils/activityProgress';
import { addClaimableAchievement } from '../../utils/achievementClaims';
import SkywardJourney from '../../components/journey/SkywardJourney';
import { getActiveTaskId, getNodeStateForTask } from '../../components/journey/journeyConstants';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';
import { ensureJourneyStarted, updateJourneyCurrentActivity } from '../../services/journeyProgressService';
import iconFire from '../../assets/icons/Icon-Fire.svg';
import robotMorningImage from '../../assets/Sprites/Robot/0018.webp';
import robotNoonImage from '../../assets/Sprites/Robot/0001.webp';
import robotNightImage from '../../assets/Sprites/Robot/0013.webp';
import rankBronzeImage from '../../assets/Sprites/Rank/rank-bronze.png';
import rankSilverImage from '../../assets/Sprites/Rank/rank-silver.png';
import rankGoldImage from '../../assets/Sprites/Rank/rank-gold.png';
import rankMythrilImage from '../../assets/Sprites/Rank/rank-mythril.png';
import rankLegendaryImage from '../../assets/Sprites/Rank/rank-legendary.png';
import crystalBallImage from '../../assets/Sprites/common/crystal-ball.png';
import crownImage from '../../assets/Sprites/common/crown.png';
import campfireImage from '../../assets/Sprites/common/campfire.png';
import './InnerPages.css';
import './ActivityPage.css';
import './DashboardPage.css';

const DAY_MS = 86_400_000;
const ACTIVITY_CELEBRATION_STORAGE_KEY = 'bigkas_pending_activity_celebration_v1';
const LAST_SHOWN_COMPLETION_EVENT_KEY = 'bigkas_last_completion_event_v1';

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const day = start.getDay();
  start.setDate(start.getDate() - day); // Sunday-first week
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
      active: activeDayKeys.has(getLocalDateKey(d)),
      isToday: getLocalDateKey(d) === getLocalDateKey(today),
    };
  });
}

function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'noon';
  return 'night';
}

function getRankSprite(levelNumber, levelName = '') {
  const numeric = Number(levelNumber);
  if (numeric === 1) return rankBronzeImage;
  if (numeric === 2) return rankSilverImage;
  if (numeric === 3) return rankGoldImage;
  if (numeric === 4) return rankMythrilImage;
  if (numeric >= 5) return rankLegendaryImage;

  const normalized = String(levelName).toLowerCase();
  if (normalized.includes('bronze')) return rankBronzeImage;
  if (normalized.includes('silver')) return rankSilverImage;
  if (normalized.includes('gold')) return rankGoldImage;
  if (normalized.includes('mythril')) return rankMythrilImage;
  if (normalized.includes('legend')) return rankLegendaryImage;
  return rankBronzeImage;
}

function ActivityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1025px)').matches,
  );
  const [entranceFromNav] = useState(() => location.state?.skywardEntrance === true);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  /** Activities are filtered by `target_level` = Bigkas rank (same as dashboard `levelProgress.levelName`). */
  const { tasks, loading: activitiesLoading, error: activitiesError } = useActivitiesJourneyTasks(selectedLevel);
  const { metricsSyncKey, refreshJourney } = useJourneyRemoteState(user);
  const stampResetTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const previousTaskStateRef = useRef({});
  const hasTaskStateHydratedRef = useRef(false);

  const [recentStampedTaskId, setRecentStampedTaskId] = useState(null);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [completionModalTaskTitle, setCompletionModalTaskTitle] = useState('');
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));
  const { sessions, fetchAllSessions } = useSessions();
  const activityMetrics = useMemo(
    () => getActivityMetrics(scopeKey),
    [scopeKey, metricsSyncKey],
  );
  const activityHistory = useMemo(
    () => (user?.id ? getActivityCompletionHistory(scopeKey) : []),
    [scopeKey, user?.id, metricsSyncKey],
  );

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
    if (!user?.id) return;
    fetchAllSessions?.();
  }, [fetchAllSessions, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => {
      setShowDesktopSidebar(window.matchMedia('(min-width: 1025px)').matches);
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const levelProgress = useMemo(() => getBigkasLevelFromUser(user), [user]);
  const recommendedLevel = useMemo(() => {
    const level = Number(levelProgress?.levelNumber || 1);
    if (!Number.isFinite(level)) return 1;
    return Math.max(1, Math.min(5, Math.round(level)));
  }, [levelProgress?.levelNumber]);

  useEffect(() => {
    if (!user?.id) return;
    setSelectedLevel((prev) => {
      if (prev === 1 && recommendedLevel > 1) return recommendedLevel;
      return prev;
    });
  }, [recommendedLevel, user?.id]);

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
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const heroRobotImage = useMemo(() => {
    if (timeOfDay === 'morning') return robotMorningImage;
    if (timeOfDay === 'noon') return robotNoonImage;
    return robotNightImage;
  }, [timeOfDay]);
  const rankSpriteImage = useMemo(
    () => getRankSprite(levelProgress?.levelNumber, levelProgress?.levelName),
    [levelProgress?.levelNumber, levelProgress?.levelName],
  );

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

  const taskTitleById = useMemo(() => tasks.reduce((acc, task) => {
    acc[task.id] = String(task.title || '').trim();
    return acc;
  }, {}), [tasks]);

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

  const maybeShowCompletionCelebration = useCallback((titleFallback = 'This activity') => {
    if (typeof window === 'undefined') return;
    setCompletionModalTaskTitle(String(titleFallback || 'This activity'));
    setShowCompletionCelebration(true);
    playCompletionSound();
  }, [playCompletionSound]);

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
    addClaimableAchievement({
      id: newlyCompletedTask.id,
      title: newlyCompletedTask.title || 'Activity achievement',
      source: 'activity-task',
      createdAt: Date.now(),
    });

    if (stampResetTimeoutRef.current) {
      window.clearTimeout(stampResetTimeoutRef.current);
    }

    stampResetTimeoutRef.current = window.setTimeout(() => {
      setRecentStampedTaskId((current) => (current === newlyCompletedTask.id ? null : current));
    }, 700);
  }, [taskState, tasks]);

  useEffect(() => {
    if (typeof window === 'undefined' || !tasks.length) return;
    const raw = window.sessionStorage.getItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      const activityId = String(payload?.activityId || '').trim();
      const activityTitleFromPayload = String(payload?.activityTitle || '').trim();
      const completedAt = Number(payload?.completedAt || 0);
      const eventKey = `${activityId}:${Number.isFinite(completedAt) ? completedAt : 0}`;
      if (!activityId) {
        window.sessionStorage.removeItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
        return;
      }
      if (taskState[activityId] !== true) {
        return;
      }
      const lastShown = window.sessionStorage.getItem(LAST_SHOWN_COMPLETION_EVENT_KEY);
      if (lastShown === eventKey) {
        window.sessionStorage.removeItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
        return;
      }

      setRecentStampedTaskId(activityId);
      maybeShowCompletionCelebration(
        activityTitleFromPayload || taskTitleById[activityId] || 'This activity',
      );
      window.sessionStorage.setItem(LAST_SHOWN_COMPLETION_EVENT_KEY, eventKey);
      window.sessionStorage.removeItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
    } catch {
      window.sessionStorage.removeItem(ACTIVITY_CELEBRATION_STORAGE_KEY);
    }
  }, [maybeShowCompletionCelebration, taskState, taskTitleById, tasks.length]);

  const handleTaskAction = useCallback((task) => {
    navigate(`${ROUTES.TRAINING}?autostart=1`, {
      state: {
        freeTopic: task.title,
        objective: task.objective || task.detail,
        focus: 'free',
        sessionType: 'training',
        entryPoint: 'activity',
        autoStartCountdown: true,
        fromActivityTaskId: task.id,
        step: task,
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

  return (
    <div className="activity-page-root activity-page--skyward-entrance">
      {showCompletionCelebration && (
        <Confetti
          width={viewportSize.width}
          height={viewportSize.height}
          recycle
          numberOfPieces={280}
          gravity={0.24}
        />
      )}
      {showCompletionCelebration && (
        <div className="activity-clear-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="activity-clear-modal-title">
          <div className="activity-clear-modal">
            <h3 id="activity-clear-modal-title" className="activity-clear-modal-title">
              Congratulations, you've cleared: {completionModalTaskTitle || 'This stage'}
            </h3>
            <PushButton
              className="activity-clear-modal-continue-btn"
              bgColor="#2d5a27"
              shadowColor="#1a3b16"
              textColor="#ffffff"
              onClick={() => {
                setShowCompletionCelebration(false);
                setCompletionModalTaskTitle('');
              }}
            >
              Continue
            </PushButton>
          </div>
        </div>
      )}

      <div className="activity-page-grid">
        {/* Banner */}
        <section className="new-banner dashboard-anim-top dashboard-anim-delay-2">
           <div className="new-banner-left">
              <img src={heroRobotImage} alt="" className="new-banner-robot" />
              <div className="new-banner-bubble" aria-label="Coach message">
                <p className="new-banner-kicker">B-01:</p>
                <p className="new-banner-copy">You're on a roll. Keep doing your activities and improve your speaking.</p>
              </div>
           </div>
           <div className="new-banner-right">
              <div className="new-banner-streak" aria-label="Daily streak">
                 <div className="new-streak-top">
                   <img src={campfireImage} alt="" className="new-streak-fire" />
                   <div className="new-streak-headline">
                     <div className="new-streak-value">{streakStats.currentStreak}</div>
                     <p className="new-streak-label">day streak</p>
                   </div>
                 </div>
                 <div className="new-streak-week" aria-label="This week streak activity">
                   {weekPills.map((pill, idx) => (
                     <span
                       key={`${pill.label}-${idx}`}
                       className={`new-streak-pill${pill.active ? ' is-active' : ''}${pill.isToday ? ' is-today' : ''}`}
                     >
                       {pill.label}
                     </span>
                   ))}
                 </div>
                 <p className="new-streak-copy">Build a daily speaking habit to keep stacking your streak.</p>
              </div>
           </div>
        </section>

        {/* Left Column (Journey Shell) */}
        <div className="new-left-col">
          <div className="new-left-col-inner">
             <SkywardJourney
               steps={journeySteps}
               groupedTasks={groupedTasks}
               currentLevel={selectedLevel}
               recommendedLevel={recommendedLevel}
               onLevelChange={setSelectedLevel}
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

        {/* Right Column (Widgets) */}
        {showDesktopSidebar ? (
          <div className="new-right-col no-scrollbar">
            <section className="new-widget dashboard-anim-left dashboard-anim-delay-2">
              <div className="new-widget-head">
                <h2 className="new-widget-title">Journey Progression</h2>
                <span className="new-widget-chip">Rank</span>
              </div>
              <div className="new-widget-rank-card">
                <img src={rankSpriteImage} alt="" className="new-widget-rank-sprite" />
                <div className="new-widget-rank-content">
                  <p className="new-widget-kicker">Current Rank</p>
                  <p className="new-widget-value">{levelProgress.levelName}</p>
                </div>
              </div>
              <p className="new-widget-caption">
                {completedTaskCount}/{Math.max(tasks.length, 1)} Tasks Complete
                <span className="new-widget-caption-sep"> - </span>
                {sidebarProgressPct}% Cleared
              </p>
            </section>

            <section className="new-widget new-widget--practice dashboard-anim-bottom dashboard-anim-delay-4">
              <div className="new-widget-head">
                <h2 className="new-widget-title">Practice</h2>
              </div>
              <p className="new-practice-subtitle">Choose a mode and jump straight into speaking.</p>

              <div className="new-btn-group">
                <div className="new-btn-row new-btn-row--card">
                  <div className="new-btn-visual new-btn-visual--randomizer">
                    <img src={crystalBallImage} alt="" className="new-btn-visual-img new-btn-visual-img--randomizer" />
                  </div>
                  <div className="new-btn-meta">
                    <p className="new-btn-label">
                      Randomizer
                    </p>
                    <p className="new-btn-hint">Instant prompt to warm up your delivery.</p>
                  </div>
                  <Button
                    variant="practice"
                    className="activity-practice-cta activity-practice-cta--randomizer"
                    onClick={() => navigate(ROUTES.PRACTICE)}
                  >
                    Randomizer
                  </Button>
                </div>
                
                <div className="new-btn-row new-btn-row--card">
                  <div className="new-btn-visual new-btn-visual--speech">
                    <img src={crownImage} alt="" className="new-btn-visual-img" />
                  </div>
                  <div className="new-btn-meta">
                    <p className="new-btn-label">
                      Free Speech
                    </p>
                    <p className="new-btn-hint">Open topic mode for confidence building.</p>
                  </div>
                  <Button
                    variant="training"
                    className="activity-practice-cta activity-practice-cta--speech"
                    onClick={() => navigate(ROUTES.TRAINING_SETUP)}
                  >
                    Free Speech
                  </Button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

      </div>
    </div>
  );
}

export default ActivityPage;
