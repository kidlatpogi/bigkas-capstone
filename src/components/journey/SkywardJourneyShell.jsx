import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import SkywardJourney from './SkywardJourney';
import { useActivitiesJourneyTasks } from '../../hooks/useActivitiesJourneyTasks';
import { fetchActivities } from '../../services/activitiesService';
import {
  getActivityMetrics,
  getBigkasLevelFromUser,
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
  const speakerPlacementLevel = useMemo(() => {
    const levelProgress = getBigkasLevelFromUser(user);
    return Math.max(1, Math.min(5, Number(levelProgress?.levelNumber) || 1));
  }, [user]);

  // Keep all stages visible; earlier journeys are optional for users placed above them.
  const tasks = useMemo(() => {
    const pLevel = Math.max(1, Math.min(5, Number(selectedLevel) || 1));
    return filterActivitiesForJourney(allTasks, speakerPlacementLevel, pLevel);
  }, [allTasks, speakerPlacementLevel, selectedLevel]);

  const activityMetrics = useMemo(() => {
    void metricsSyncKey;
    return getActivityMetrics(scopeKey);
  }, [scopeKey, metricsSyncKey]);

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

  const unlockedThroughLevel = useMemo(() => {
    const placementLevel = Number(speakerPlacementLevel) || 1;
    const progressLevel = Number(recommendedLevel) || 1;
    return Math.max(1, Math.min(5, Math.max(placementLevel, progressLevel)));
  }, [speakerPlacementLevel, recommendedLevel]);
  
  const prevLevelCheckKey = useMemo(
    () => `${selectedLevel}:${scopeKey}:${metricsSyncKey}`,
    [selectedLevel, scopeKey, metricsSyncKey],
  );
  const [prevLevelCompletion, setPrevLevelCompletion] = useState({ key: null, done: false });
  const hasImplicitPrevUnlock = selectedLevel <= 1 || selectedLevel <= unlockedThroughLevel;
  /**
   * Cross-level sequence check:
   * Node 1 of Journey N should be locked until the LAST node of Journey N-1 is finished.
   * A user's saved progress/recommended level is already an unlock, even when an older
   * diagnostic score resolves to a lower speaker placement.
   */
  const isPrevLevelDone = hasImplicitPrevUnlock
    || (prevLevelCompletion.key === prevLevelCheckKey && prevLevelCompletion.done);

  useEffect(() => {
    if (hasImplicitPrevUnlock) return undefined;
    
    let cancelled = false;
    const checkPrev = async () => {
      try {
        const prevLevel = selectedLevel - 1;
        // Fetch previous level's tasks to find the last node
        const prevRows = await fetchActivities(prevLevel);
        if (cancelled) return;
        
        if (!prevRows || prevRows.length === 0) {
          setPrevLevelCompletion({ key: prevLevelCheckKey, done: true });
          return;
        }
        
        const lastTask = prevRows[prevRows.length - 1];
        const isDone = isActivityTaskCompleted(lastTask.id, activityMetrics);
        setPrevLevelCompletion({ key: prevLevelCheckKey, done: isDone });
      } catch (e) {
        console.error('Failed to check cross-level sequence:', e);
        setPrevLevelCompletion({ key: prevLevelCheckKey, done: false });
      }
    };
    
    checkPrev();
    return () => { cancelled = true; };
  }, [selectedLevel, activityMetrics, hasImplicitPrevUnlock, prevLevelCheckKey]);

  const taskUnlockState = useMemo(() => {
    const state = {};
    
    // Start with true if level 1, or if the previous level's last node is completed.
    let previousCompleted = isPrevLevelDone;
    for (const task of tasks) {
      state[task.id] = previousCompleted;
      previousCompleted = taskState[task.id] === true;
    }
    return state;
  }, [tasks, taskState, isPrevLevelDone]);

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
      isPrevLevelDone={isPrevLevelDone}
      onLevelChange={handleLevelChange}
      entranceFromNav={entranceFromNav}
      scrollToStepIndex={scrollToStepIndex}
      renderStepContent={renderStepContent}
    />
  );
}

export default memo(SkywardJourneyShell);
