import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import SkywardJourney from './SkywardJourney';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { fetchActivities } from '../../services/activitiesService';
import {
  getActivityMetrics,
  getActivityTaskProgress,
  getBigkasLevelFromUser,
  getTaskXp,
  isActivityTaskCompleted,
  GLOBAL_ACTIVITY_SCOPE,
} from '../../utils/activityProgress';
import { getActiveTaskId, getNodeStateForTask } from './journeyConstants';
import { useAuthContext } from '../../context/useAuthContext';
import { useJourneyRemoteState } from '../../hooks/useJourneyRemoteState';
import { filterActivitiesForJourney } from '../../utils/journeyFiltering';

/**
 * Isolates level‑switching state + data fetching so that pressing
 * Prev / Next only re‑renders the journey map — NOT the entire ActivityPage.
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
  const [selectedLevel, setSelectedLevel] = useState(initialLevel || 1);
  const [isPending, startTransition] = useTransition();

  // If the recommended level changed from outside, and we haven't manually switched yet,
  // follow the recommended level to keep the map in sync with the user's progress.
  const hasManuallySwitchedRef = useRef(false);
  /* 
     REMOVED: Automatic redirection to recommendedLevel.
     The user requested to stay on their current view even if their level progresses.
  */
  // useEffect(() => {
  //   if (!hasManuallySwitchedRef.current && recommendedLevel && recommendedLevel !== selectedLevel) {
  //     setSelectedLevel(recommendedLevel);
  //   }
  // }, [recommendedLevel, selectedLevel]);

  const handleLevelChange = useCallback((nextLevel) => {
    hasManuallySwitchedRef.current = true;
    startTransition(() => {
      setSelectedLevel(nextLevel);
    });
  }, []);

  /* ── Data fetching scoped to this component ── */
  const { tasks: allTasks, loading, error } = useActivitiesJourneyTasks(selectedLevel);

  // Apply the same filtering as the sidebar to ensure the map shows the correct number of stages.
  const tasks = useMemo(() => {
    const levelProgress = getBigkasLevelFromUser(user);
    const sLevel = Math.max(1, Math.min(5, Number(levelProgress?.levelNumber) || 1));
    const pLevel = Math.max(1, Math.min(5, Number(selectedLevel) || 1));
    return filterActivitiesForJourney(allTasks, sLevel, pLevel);
  }, [allTasks, user, selectedLevel]);

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



  const isLockedLevel = useMemo(() => {
    const curr = Number(selectedLevel);
    const rec = Number(recommendedLevel);
    if (Number.isNaN(curr) || Number.isNaN(rec)) return false;
    return curr > rec;
  }, [selectedLevel, recommendedLevel]);

  // A level is "passed" if the user's recommended level is higher than this level.
  const isPassedLevel = useMemo(() => {
    const curr = Number(selectedLevel);
    const rec = Number(recommendedLevel);
    return rec > curr;
  }, [selectedLevel, recommendedLevel]);
  
  /**
   * Cross-level sequence check:
   * Node 1 of Journey N should be locked until the LAST node of Journey N-1 is finished.
   */
  const [isPrevLevelDone, setIsPrevLevelDone] = useState(true);

  useEffect(() => {
    if (selectedLevel <= 1) {
      setIsPrevLevelDone(true);
      return;
    }
    
    let cancelled = false;
    const checkPrev = async () => {
      try {
        const prevLevel = selectedLevel - 1;
        // Fetch previous level's tasks to find the last node
        const prevRows = await fetchActivities(prevLevel);
        if (cancelled) return;
        
        if (!prevRows || prevRows.length === 0) {
          setIsPrevLevelDone(true);
          return;
        }
        
        const lastTask = prevRows[prevRows.length - 1];
        const isDone = isActivityTaskCompleted(lastTask.id, activityMetrics);
        setIsPrevLevelDone(isDone);
      } catch (e) {
        console.error('Failed to check cross-level sequence:', e);
        setIsPrevLevelDone(false);
      }
    };
    
    checkPrev();
    return () => { cancelled = true; };
  }, [selectedLevel, activityMetrics]);

  const taskUnlockState = useMemo(() => {
    const state = {};
    // If we've already passed this level, everything is unlocked.
    if (isPassedLevel) {
      tasks.forEach(t => { state[t.id] = true; });
      return state;
    }
    
    // Start with true if level 1, or if the previous level's last node is completed.
    let previousCompleted = isPrevLevelDone;
    for (const task of tasks) {
      state[task.id] = previousCompleted;
      previousCompleted = taskState[task.id] === true;
    }
    return state;
  }, [tasks, taskState, isPassedLevel]);

  const activeTaskId = useMemo(
    () => getActiveTaskId(tasks, taskState, taskUnlockState),
    [tasks, taskState, taskUnlockState],
  );

  // Report activeTaskId up so ActivityPage can persist it
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
        pillarName: String(task.phase_name || '').replace(/^Module\s+\d+:\s*/i, '').trim(),
        stageNumber: task.activity_order,
        totalStages,
        isRankUp: Number(task.activity_order) === 30,
        nodeState: isLockedLevel 
          ? 'locked' 
          : getNodeStateForTask(task.id, taskState, taskUnlockState, activeTaskId),
      })),
    [tasks, taskState, taskUnlockState, activeTaskId, totalStages, isLockedLevel],
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
        isLocked: step.nodeState === 'locked',
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
