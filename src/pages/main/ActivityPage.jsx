import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/useAuthContext';
import { ROUTES } from '../../utils/constants';
import {
  GLOBAL_ACTIVITY_SCOPE,
  buildActivityMetricsKey,
  buildCompletionHistoryKey,
  getActivityCompletionHistory,
  getActivityTaskProgress,
  getActivityMetrics,
  getTaskXp,
  isActivityTaskCompleted,
} from '../../utils/activityProgress';
import SkywardJourney from '../../components/journey/SkywardJourney';
import { getActiveTaskId, getNodeStateForTask } from '../../components/journey/journeyConstants';
import './InnerPages.css';
import './ActivityPage.css';

function getProgressiveTaskTemplate() {
  return [
    {
      id: 'three-minute-scripted',
      title: 'Practice scripted speaking for 3 minutes',
      detail: 'Choose one speech and sustain clear pacing for at least 3 minutes.',
      actionLabel: 'Start Training',
      actionRoute: ROUTES.TRAINING_SETUP,
      prerequisiteIds: [],
    },
    {
      id: 'free-randomizer-3x',
      title: 'Complete Free Speech Randomizer 3 times',
      detail: 'Do three short random-topic runs and focus on flow and confidence.',
      actionLabel: 'Open Practice',
      actionRoute: ROUTES.PRACTICE,
      prerequisiteIds: ['three-minute-scripted'],
    },
    {
      id: 'review-feedback',
      title: 'Review your latest Detailed Feedback',
      detail: 'Identify one weak pillar and one improvement action for tomorrow.',
      actionLabel: 'Check Progress',
      actionRoute: ROUTES.PROGRESS,
      prerequisiteIds: ['free-randomizer-3x'],
    },
    {
      id: 'two-script-run',
      title: 'Run 2 scripted sessions with different speeches',
      detail: 'Switch topics to challenge articulation and consistency.',
      actionLabel: 'Start Training',
      actionRoute: ROUTES.TRAINING_SETUP,
      prerequisiteIds: ['review-feedback'],
    },
    {
      id: 'randomizer-focus',
      title: 'Do Randomizer and avoid filler words',
      detail: 'Complete at least 2 randomizer attempts with intentional pauses.',
      actionLabel: 'Open Practice',
      actionRoute: ROUTES.PRACTICE,
      prerequisiteIds: ['two-script-run'],
    },
    {
      id: 'progress-check',
      title: 'Check your trend and set one micro-goal',
      detail: 'Use Progress page to pick one measurable target for next session.',
      actionLabel: 'View Progress',
      actionRoute: ROUTES.PROGRESS,
      prerequisiteIds: ['randomizer-focus'],
    },
  ];
}

function ActivityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [entranceFromNav] = useState(() => location.state?.skywardEntrance === true);
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  const tasks = useMemo(() => getProgressiveTaskTemplate(), []);
  const stampResetTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const previousTaskStateRef = useRef({});
  const hasTaskStateHydratedRef = useRef(false);

  const [activityMetrics, setActivityMetrics] = useState(() => getActivityMetrics(scopeKey));
  const [completionHistory, setCompletionHistory] = useState(() => getActivityCompletionHistory(scopeKey));
  const [activeTab, setActiveTab] = useState('active');
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
      setCompletionHistory(getActivityCompletionHistory(scopeKey));
    };
    const onStorage = (event) => {
      if (event.key === buildActivityMetricsKey(scopeKey) || event.key === buildCompletionHistoryKey(scopeKey)) {
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

  const historyItems = useMemo(() => {
    const historyByTaskId = new Map(
      completionHistory.map((entry) => [entry.taskId, entry]),
    );

    return tasks
      .filter((task) => taskState[task.id] === true)
      .map((task) => ({
        task,
        historyEntry: historyByTaskId.get(task.id) || null,
      }))
      .sort((a, b) => {
        const aTime = a.historyEntry?.completedAt ? Date.parse(a.historyEntry.completedAt) : 0;
        const bTime = b.historyEntry?.completedAt ? Date.parse(b.historyEntry.completedAt) : 0;
        return bTime - aTime;
      });
  }, [completionHistory, taskState, tasks]);

  const completedCount = tasks.filter((task) => taskState[task.id] === true).length;
  const totalXp = tasks.reduce((sum, task) => sum + getTaskXp(task.id), 0);
  const earnedXp = tasks.reduce((sum, task) => sum + (taskState[task.id] ? getTaskXp(task.id) : 0), 0);
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

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
    if (task.id === 'free-randomizer-3x' || task.id === 'randomizer-focus') {
      navigate(ROUTES.PRACTICE, {
        state: {
          preferredTab: 'randomizer',
          autoStartRandomizer: true,
          activityTaskId: task.id,
        },
      });
      return;
    }

    navigate(task.actionRoute, {
      state: {
        fromActivityTaskId: task.id,
      },
    });
  }, [navigate]);

  const journeySteps = useMemo(
    () =>
      tasks.map((task) => ({
        id: task.id,
        task,
        title: task.title,
        nodeState: getNodeStateForTask(task.id, taskState, taskUnlockState, activeTaskId),
        onActivate: () => handleTaskAction(task),
      })),
    [tasks, taskState, taskUnlockState, activeTaskId, handleTaskAction],
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

        <p className="activity-task-detail">{task.detail}</p>

        {completedDateText ? <p className="activity-task-history-meta">Completed {completedDateText}</p> : null}

        {isLocked ? (
          <p className="activity-task-lock-note">Finish previous activities first to unlock this step.</p>
        ) : null}

        <div className="activity-task-actions">
          <button
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

  return (
    <div className="inner-page activity-page">
      <div className="activity-content-wrap">
        <div className="activity-sticky-shell">
          <div className="page-card activity-hero-card dashboard-anim-top">
            <p className="activity-kicker">SKYWARD JOURNEY</p>
            <p className="activity-subtitle"><span className="activity-subtitle-highlight">Progressive speaking quest:</span> Climb the path in order—like a skill tree. Finished steps move to History automatically.</p>

            <div className="activity-track">
              <div className="activity-track-fill" style={{ width: `${progressPct}%` }} />
            </div>

            <div className="activity-stats">
              <span>{completedCount}/{tasks.length} Task Complete</span>
              <span>{earnedXp}/{totalXp} EXP</span>
            </div>
          </div>

          <div className="activity-tabs dashboard-anim-top dashboard-anim-delay-1" role="tablist" aria-label="Activity tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'active'}
              className={`activity-tab-btn${activeTab === 'active' ? ' active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              className={`activity-tab-btn${activeTab === 'history' ? ' active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>
        </div>

        <div className={`activity-task-list${activeTab === 'active' ? ' activity-task-list--journey' : ''}`}>
          {activeTab === 'active' && (
            <SkywardJourney
              steps={journeySteps}
              entranceFromNav={entranceFromNav}
              renderStepContent={(step, meta) =>
                renderTaskCard({
                  task: step.task,
                  animationClass: `dashboard-anim-bottom dashboard-anim-delay-${Math.min(meta.stepIndex + 2, 9)}`,
                })
              }
            />
          )}
          {activeTab === 'active' && completedCount === tasks.length ? (
            <div className="page-card activity-empty-state dashboard-anim-bottom dashboard-anim-delay-2">
              All activities completed. Check History for finished steps.
            </div>
          ) : null}
          {activeTab === 'history' && historyItems.map(({ task, historyEntry }, index) => {
            const pattern = ['left', 'right', 'bottom'];
            const direction = pattern[index % pattern.length];
            const delay = Math.min(index + 2, 9);
            return renderTaskCard({
              task,
              historyEntry,
              animationClass: `dashboard-anim-${direction} dashboard-anim-delay-${delay}`,
            });
          })}

          {activeTab === 'history' && historyItems.length === 0 ? (
            <div className="page-card activity-empty-state dashboard-anim-bottom dashboard-anim-delay-2">No completed activities yet. Finish tasks in Active to populate history.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ActivityPage;
