import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import SkywardJourney from './SkywardJourney';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import {
  getActivityMetrics,
  getActivityTaskProgress,
  getTaskXp,
  isActivityTaskCompleted,
  GLOBAL_ACTIVITY_SCOPE,
} from '../../utils/activityProgress';
import { getActiveTaskId, getNodeStateForTask } from './journeyConstants';
import { useAuthContext } from '../../context/useAuthContext';
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';

/**
 * Isolates level‑switching state + data fetching so that pressing
 * Prev / Next only re‑renders the journey map — NOT the entire ActivityPage.
 *
 * ActivityPage passes down the initial level and a stable renderStepContent
 * callback; everything else is self‑contained here.
 */
function SkywardJourneyShell({
  initialLevel,
  recommendedLevel,
  entranceFromNav,
  scrollToStepIndex,
  renderTaskCard,
  onActiveTaskIdChange,
}) {
  const { user } = useAuthContext();
  const scopeKey = user?.id || GLOBAL_ACTIVITY_SCOPE;
  const { metricsSyncKey } = useJourneyRemoteState(user);

  /* ── Level state lives here, not in ActivityPage ── */
  const [selectedLevel, setSelectedLevel] = useState(initialLevel);
  const [isPending, startTransition] = useTransition();

  // If the parent's recommended level changes (e.g. on first mount),
  // adopt it only when we're still at the default.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && recommendedLevel > 1 && selectedLevel === 1) {
      setSelectedLevel(recommendedLevel);
    }
    initializedRef.current = true;
  }, [recommendedLevel, selectedLevel]);

  const handleLevelChange = useCallback((nextLevel) => {
    startTransition(() => {
      setSelectedLevel(nextLevel);
    });
  }, []);

  /* ── Data fetching scoped to this component ── */
  const { tasks, loading, error } = useActivitiesJourneyTasks(selectedLevel);

  const activityMetrics = useMemo(
    () => getActivityMetrics(scopeKey),
    [scopeKey, metricsSyncKey],
  );

  const taskState = useMemo(() => {
    return tasks.reduce((state, task) => {
      state[task.id] = isActivityTaskCompleted(task.id, activityMetrics);
      return state;
    }, {});
  }, [tasks, activityMetrics]);

  const taskUnlockState = useMemo(() => {
    return tasks.reduce((state, task) => {
      const prerequisites = Array.isArray(task.prerequisiteIds) ? task.prerequisiteIds : [];
      const isUnlocked = prerequisites.every((pid) => taskState[pid] === true);
      state[task.id] = isUnlocked;
      return state;
    }, {});
  }, [taskState, tasks]);

  const activeTaskId = useMemo(
    () => getActiveTaskId(tasks, taskState, taskUnlockState),
    [tasks, taskState, taskUnlockState],
  );

  // Report activeTaskId up so ActivityPage can persist it, without triggering
  // a full re-render of the parent (the parent just writes to a ref / service).
  useEffect(() => {
    onActiveTaskIdChange?.(activeTaskId);
  }, [activeTaskId, onActiveTaskIdChange]);

  const totalStages = tasks.length;

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
      })),
    [tasks, taskState, taskUnlockState, activeTaskId, totalStages],
  );

  const groupedTasks = useMemo(() => {
    if (!journeySteps.length) return [];
    return journeySteps.reduce((acc, step) => {
      const phaseName = step.pillarName || 'Training';
      const existingPhase = acc.find((p) => p.phaseName === phaseName);
      if (existingPhase) {
        existingPhase.tasks.push(step);
      } else {
        acc.push({ phaseName, tasks: [step] });
      }
      return acc;
    }, []);
  }, [journeySteps]);

  const renderStepContent = useCallback(
    (step, meta) =>
      renderTaskCard({
        task: step.task,
        animationClass: `dashboard-anim-bottom dashboard-anim-delay-${Math.min(meta.stepIndex + 2, 9)}`,
      }),
    [renderTaskCard],
  );

  /* ── Loading / error states scoped here — the rest of the page stays visible ── */
  if (loading) {
    return (
      <div className="skyward-journey-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <p className="section-label" style={{ opacity: isPending ? 0.5 : 1 }}>Loading journey…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="skyward-journey-wrap" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="activity-task-lock-note">Could not load activities: {error}</p>
      </div>
    );
  }

  return (
    <SkywardJourney
      steps={journeySteps}
      groupedTasks={groupedTasks}
      currentLevel={selectedLevel}
      recommendedLevel={recommendedLevel}
      onLevelChange={handleLevelChange}
      entranceFromNav={entranceFromNav}
      scrollToStepIndex={scrollToStepIndex}
      renderStepContent={renderStepContent}
    />
  );
}

export default memo(SkywardJourneyShell);
