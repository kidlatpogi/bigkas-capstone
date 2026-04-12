/**
 * Shared layout constants for Skyward Journey (web + future React Native).
 * Use the same modulo-4 lane pattern on both platforms; tune shift via platform styles.
 */
export const JOURNEY_OFFSET_PATTERN = [0, 1, 0, -1]; // multipliers for --skyward-shift

/** Speech-themed labels for each step (cycles if there are more tasks than entries). */
export const JOURNEY_NODE_THEMES = [
  { label: 'Vowels & clarity', shortLabel: 'Vowels' },
  { label: 'Consonants & flow', shortLabel: 'Consonants' },
  { label: 'Intonation', shortLabel: 'Intonation' },
  { label: 'Rhythm & pacing', shortLabel: 'Rhythm' },
  { label: 'Expression', shortLabel: 'Expression' },
  { label: 'Mastery', shortLabel: 'Mastery' },
];

export const NODE_STATE = {
  COMPLETED: 'completed',
  ACTIVE: 'active',
  LOCKED: 'locked',
};

/**
 * First incomplete task that is unlocked is the active journey node; others stay locked until prior steps complete.
 */
export function getActiveTaskId(tasks, taskState, taskUnlockState) {
  for (const task of tasks) {
    if (taskState[task.id]) continue;
    if (!taskUnlockState[task.id]) continue;
    return task.id;
  }
  return null;
}

export function getNodeStateForTask(taskId, taskState, taskUnlockState, activeTaskId) {
  if (taskState[taskId]) return NODE_STATE.COMPLETED;
  if (!taskUnlockState[taskId]) return NODE_STATE.LOCKED;
  return taskId === activeTaskId ? NODE_STATE.ACTIVE : NODE_STATE.LOCKED;
}

/** Every 4 steps form a unit; titles cycle for deeper journeys. */
export const JOURNEY_UNIT_TITLES = ['BASICS', 'FLOW', 'EXPRESSION', 'MASTERY'];

export function getUnitLabel(zeroBasedStepIndex) {
  const unitNum = Math.floor(zeroBasedStepIndex / 4) + 1;
  const title = JOURNEY_UNIT_TITLES[(unitNum - 1) % JOURNEY_UNIT_TITLES.length];
  return { unitNum, title, key: `unit-${unitNum}` };
}

/**
 * Label sits opposite the path offset: right-shifted node → label left; left-shifted → label right;
 * centered lanes → label on the right (default).
 */
export function getLabelSideForLane(laneIndex) {
  const m = JOURNEY_OFFSET_PATTERN[((laneIndex % 4) + 4) % 4];
  if (m > 0) return 'left';
  if (m < 0) return 'right';
  return 'right';
}
