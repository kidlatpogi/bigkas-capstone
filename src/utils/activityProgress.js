const METRICS_KEY_PREFIX = 'bigkas_activity_metrics_';
const TOTAL_POINTS_KEY_PREFIX = 'bigkas_activity_total_points_';
const COMPLETED_HISTORY_KEY_PREFIX = 'bigkas_activity_completed_history_';
export const GLOBAL_ACTIVITY_SCOPE = 'global';
export const LEVEL_CONFIG = [
  { name: 'Novice', requiredToNext: 100 },
  { name: 'Beginner', requiredToNext: 200 },
  { name: 'Intermediate', requiredToNext: 300 },
  { name: 'Advanced', requiredToNext: 400 },
  { name: 'Expert', requiredToNext: 500 },
  { name: 'Master', requiredToNext: null },
];
const TASK_XP_MAP = {
  'three-minute-scripted': 1,
  'free-randomizer-3x': 1,
  'review-feedback': 1,
  'two-script-run': 1,
  'randomizer-focus': 1,
  'progress-check': 1,
};
const TASK_IDS = Object.keys(TASK_XP_MAP);

export function getTaskXp(taskId) {
  return TASK_XP_MAP[taskId] ?? 0;
}

const DEFAULT_METRICS = {
  scriptedSessions: 0,
  longScriptedSessions: 0,
  randomizerAttempts: 0,
  feedbackReviews: 0,
  progressChecks: 0,
  scriptedUniqueTitles: [],
  processedScriptedSessionIds: [],
  processedRandomizerSessionIds: [],
};

function normalizeTitle(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function toMetricObject(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_METRICS };
  }

  return {
    ...DEFAULT_METRICS,
    ...value,
    scriptedUniqueTitles: Array.isArray(value.scriptedUniqueTitles) ? value.scriptedUniqueTitles : [],
    processedScriptedSessionIds: Array.isArray(value.processedScriptedSessionIds) ? value.processedScriptedSessionIds : [],
    processedRandomizerSessionIds: Array.isArray(value.processedRandomizerSessionIds) ? value.processedRandomizerSessionIds : [],
  };
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildActivityMetricsKey(scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  return `${METRICS_KEY_PREFIX}${scopeKey}`;
}

export function buildTotalPointsKey(scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  return `${TOTAL_POINTS_KEY_PREFIX}${scopeKey}`;
}

export function buildCompletionHistoryKey(scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  return `${COMPLETED_HISTORY_KEY_PREFIX}${scopeKey}`;
}

export function getActivityMetrics(scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_METRICS };
  }

  try {
    const raw = window.localStorage.getItem(buildActivityMetricsKey(scopeKey));
    const parsed = raw ? JSON.parse(raw) : null;
    return toMetricObject(parsed);
  } catch {
    return { ...DEFAULT_METRICS };
  }
}

function saveActivityMetrics(scopeKey, metrics) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(buildActivityMetricsKey(scopeKey), JSON.stringify(metrics));
}

export function getTotalActivityPoints(scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  if (typeof window === 'undefined') return 0;
  const raw = Number(window.localStorage.getItem(buildTotalPointsKey(scopeKey)));
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
}

export function getScoreRewardPoints(scoreValue, durationSec = 0) {
  const score = Number(scoreValue ?? 0);
  const duration = Number(durationSec ?? 0);
  
  if (!Number.isFinite(score) || !Number.isFinite(duration)) return 0;
  
  // Minimum session duration requirement: 5 seconds
  if (duration < 5) return 0;
  
  // Score-based reward points
  // 80+ overall score = 3 points
  // 60-79 overall score = 2 points
  // Below 60 = 0 points
  if (score >= 80) return 3;
  if (score >= 60 && score < 80) return 2;
  return 0;
}

function addActivityPoints(amount, scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  if (typeof window === 'undefined') return 0;
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const current = getTotalActivityPoints(scopeKey);
  const next = current + safeAmount;
  window.localStorage.setItem(buildTotalPointsKey(scopeKey), String(next));
  return next;
}

export function addPointsToSpeakerProgress(amount, scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  return addActivityPoints(amount, scopeKey);
}

export function deriveLevelProgress(totalPoints) {
  const points = Math.max(0, Math.floor(Number(totalPoints) || 0));
  let levelIndex = 0;
  let pointsIntoLevel = points;

  while (levelIndex < LEVEL_CONFIG.length - 1) {
    const required = LEVEL_CONFIG[levelIndex].requiredToNext;
    if (!required || pointsIntoLevel < required) break;
    pointsIntoLevel -= required;
    levelIndex += 1;
  }

  const level = LEVEL_CONFIG[levelIndex];
  const next = LEVEL_CONFIG[levelIndex + 1] || null;
  const requiredToNext = level.requiredToNext;
  const progressPct = requiredToNext
    ? Math.round((Math.min(pointsIntoLevel, requiredToNext) / requiredToNext) * 100)
    : 100;

  return {
    levelName: level.name,
    levelNumber: levelIndex + 1,
    nextLevelName: next?.name || null,
    pointsIntoLevel,
    requiredToNext,
    pointsToNext: requiredToNext ? Math.max(0, requiredToNext - pointsIntoLevel) : 0,
    progressPct,
  };
}

function getCompletedHistory(scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(buildCompletionHistoryKey(scopeKey));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry.taskId === 'string');
  } catch {
    return [];
  }
}

function saveCompletedHistory(scopeKey, history) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(buildCompletionHistoryKey(scopeKey), JSON.stringify(history));
}

export function getActivityCompletionHistory(scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  return getCompletedHistory(scopeKey);
}

export function recordActivityEvent(event, scopeKey = GLOBAL_ACTIVITY_SCOPE) {
  if (!event || typeof event !== 'object') return getActivityMetrics(scopeKey);

  const metrics = getActivityMetrics(scopeKey);
  const completionBefore = Object.fromEntries(
    TASK_IDS.map((taskId) => [taskId, isActivityTaskCompleted(taskId, metrics)]),
  );
  const type = String(event.type || '');

  if (type === 'scripted-session-complete') {
    const sessionId = String(event.sessionId || '');
    if (sessionId && metrics.processedScriptedSessionIds.includes(sessionId)) {
      return metrics;
    }

    metrics.scriptedSessions += 1;

    if (Number(event.durationSec) >= 180) {
      metrics.longScriptedSessions += 1;
    }

    const normalized = normalizeTitle(event.scriptTitle);
    if (normalized && !metrics.scriptedUniqueTitles.includes(normalized)) {
      metrics.scriptedUniqueTitles.push(normalized);
    }

    if (sessionId) {
      metrics.processedScriptedSessionIds = [...metrics.processedScriptedSessionIds, sessionId];
    }
  }

  if (type === 'randomizer-session-complete') {
    const sessionId = String(event.sessionId || '');
    if (sessionId && metrics.processedRandomizerSessionIds.includes(sessionId)) {
      return metrics;
    }

    metrics.randomizerAttempts += 1;

    if (sessionId) {
      metrics.processedRandomizerSessionIds = [...metrics.processedRandomizerSessionIds, sessionId];
    }
  }

  if (type === 'review-feedback') {
    metrics.feedbackReviews += 1;
  }

  if (type === 'progress-check') {
    metrics.progressChecks += 1;
  }

  const completionAfter = Object.fromEntries(
    TASK_IDS.map((taskId) => [taskId, isActivityTaskCompleted(taskId, metrics)]),
  );

  const newlyCompletedTaskIds = TASK_IDS.filter(
    (taskId) => !completionBefore[taskId] && completionAfter[taskId],
  );

  if (newlyCompletedTaskIds.length > 0) {
    const totalXpEarned = newlyCompletedTaskIds.reduce(
      (sum, taskId) => sum + getTaskXp(taskId),
      0,
    );
    addActivityPoints(totalXpEarned, scopeKey);

    const history = getCompletedHistory(scopeKey);
    const nextHistory = [...history];

    for (const taskId of newlyCompletedTaskIds) {
      if (nextHistory.some((entry) => entry.taskId === taskId)) continue;
      nextHistory.push({
        taskId,
        completedAt: new Date().toISOString(),
        pointsAwarded: getTaskXp(taskId),
      });
    }

    saveCompletedHistory(scopeKey, nextHistory);
  }

  saveActivityMetrics(scopeKey, metrics);
  return metrics;
}

export function isActivityTaskCompleted(taskId, metricsInput) {
  const progress = getActivityTaskProgress(taskId, metricsInput);
  return progress.current >= progress.target;
}

export function getActivityTaskProgress(taskId, metricsInput) {
  const metrics = toMetricObject(metricsInput);

  switch (taskId) {
    case 'three-minute-scripted':
      return {
        current: Math.min(metrics.longScriptedSessions, 1),
        target: 1,
      };
    case 'free-randomizer-3x':
      return {
        current: Math.min(metrics.randomizerAttempts, 3),
        target: 3,
      };
    case 'review-feedback':
      return {
        current: Math.min(metrics.feedbackReviews, 1),
        target: 1,
      };
    case 'two-script-run':
      return {
        current: Math.min(metrics.scriptedUniqueTitles.length, 2),
        target: 2,
      };
    case 'randomizer-focus':
      return {
        current: Math.min(metrics.randomizerAttempts, 2),
        target: 2,
      };
    case 'progress-check':
      return {
        current: Math.min(metrics.progressChecks, 1),
        target: 1,
      };
    default:
      return {
        current: 0,
        target: 1,
      };
  }
}
