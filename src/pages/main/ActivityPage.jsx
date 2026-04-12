import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import {
  GLOBAL_ACTIVITY_SCOPE,
  buildActivityMetricsKey,
  getActivityTaskProgress,
  getActivityMetrics,
  getTaskXp,
  isActivityTaskCompleted,
} from '../../utils/activityProgress';
import SkywardJourney from '../../components/journey/SkywardJourney';
import { getActiveTaskId, getNodeStateForTask } from '../../components/journey/journeyConstants';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import './InnerPages.css';
import './ActivityPage.css';

function ActivityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [entranceFromNav] = useState(() => location.state?.skywardEntrance === true);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  /** Activities are filtered by `target_level` = Bigkas rank (same as dashboard `levelProgress.levelName`). */
  const { tasks, loading: activitiesLoading, error: activitiesError } = useActivitiesJourneyTasks();
  const stampResetTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const previousTaskStateRef = useRef({});
  const hasTaskStateHydratedRef = useRef(false);

  const [activityMetrics, setActivityMetrics] = useState(() => getActivityMetrics(scopeKey));
  const [recentStampedTaskId, setRecentStampedTaskId] = useState(null);

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
      <div className="activity-content-wrap activity-content-wrap--journey-scroll">
        <div className="activity-task-list activity-task-list--journey">
          <SkywardJourney
            steps={journeySteps}
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
  );
}

export default ActivityPage;
