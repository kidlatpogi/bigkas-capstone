const METRICS_KEY_PREFIX = 'bigkas_activity_metrics_';
const TOTAL_POINTS_KEY_PREFIX = 'bigkas_activity_total_points_';
const COMPLETED_HISTORY_KEY_PREFIX = 'bigkas_activity_completed_history_';
export const GLOBAL_ACTIVITY_SCOPE = 'global';

/**
 * Bigkas speaker levels (1.0–5.0 entry-point scale). Replaces the old XP ladder.
 */
export const BIGKAS_LEVELS = [
  { number: 1, name: 'Mastering Fundamentals', min: 1.0, max: 1.9 },
  { number: 2, name: 'Learning Your Style', min: 2.0, max: 2.9 },
  { number: 3, name: 'Increasing Knowledge', min: 3.0, max: 3.9 },
  { number: 4, name: 'Building Skills', min: 4.0, max: 4.9 },
  { number: 5, name: 'Demonstrating Expertise', min: 5.0, max: 5.0 },
];

/** @deprecated Use BIGKAS_LEVELS — kept for a few imports that expect an array */
export const LEVEL_CONFIG = BIGKAS_LEVELS.map((L) => ({
  name: L.name,
  requiredToNext: null,
}));

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
  if (taskId && Object.prototype.hasOwnProperty.call(TASK_XP_MAP, taskId)) {
    return TASK_XP_MAP[taskId] ?? 0;
  }
  return 1;
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
  completedActivityIds: [],
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
    completedActivityIds: Array.isArray(value.completedActivityIds) ? value.completedActivityIds : [],
  };
}

/**
 * Maps onboarding Mehrabian-style 0–100 score to 1.0–5.0 entry scale (for level bands).
 */
export function mapPercentToEntryScore(percent0to100) {
  const p = Math.max(0, Math.min(100, Number(percent0to100) || 0));
  return Math.round((1 + (p / 100) * 4) * 100) / 100;
}

/**
 * Resolves 1.0–5.0 entry score from user metadata / onboarding analysis.
 */
export function resolveSpeakerEntryScore(user) {
  if (!user) return 1.0;
  const meta = user;
  const direct = Number(meta.speakerEntryScore ?? meta.speaker_entry_score);
  if (Number.isFinite(direct) && direct >= 1 && direct <= 5) {
    return Math.round(direct * 100) / 100;
  }
  const fs = Number(meta.onboardingLevelAnalysis?.final_score);
  if (Number.isFinite(fs) && fs > 0) {
    return mapPercentToEntryScore(fs);
  }
  const ln = Number(meta.speakerLevelNumber);
  if (Number.isFinite(ln) && ln >= 1 && ln <= 5) {
    const band = BIGKAS_LEVELS[ln - 1];
    return band ? band.min : 1.0;
  }
  return 1.0;
}

/**
 * Level display + progress toward next band from entry score (1.0–5.0).
 */
export function getBigkasLevelFromScore(entryScoreRaw) {
  const s = Math.max(1, Math.min(5, Number(entryScoreRaw) || 1));
  const level =
    BIGKAS_LEVELS.find((L) => s >= L.min && s <= L.max) || BIGKAS_LEVELS[0];
  const next = BIGKAS_LEVELS.find((L) => L.number === level.number + 1);
  let progressPct = 100;
  if (next && level.number < 5) {
    const span = next.min - level.min;
    if (span > 0) {
      progressPct = Math.round(((s - level.min) / span) * 100);
    }
  }
  return {
    levelName: level.name,
    levelNumber: level.number,
    nextLevelName: next?.name || null,
    pointsIntoLevel: 0,
    requiredToNext: null,
    pointsToNext: 0,
    progressPct: Math.min(100, Math.max(0, progressPct)),
    entryScore: s,
  };
}

export function getBigkasLevelFromUser(user) {
  return getBigkasLevelFromScore(resolveSpeakerEntryScore(user));
}

/**
 * @deprecated Use getBigkasLevelFromUser — levels are score-based, not XP-based.
 */
export function deriveLevelProgress(totalPointsIgnored) {
  void totalPointsIgnored;
  return getBigkasLevelFromScore(1.0);
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

  if (duration < 5) return 0;

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

  let newlyCompletedActivityId = null;

  if (type === 'activity-complete') {
    const aid = String(event.activityId || '').trim();
    if (aid && !metrics.completedActivityIds.includes(aid)) {
      metrics.completedActivityIds = [...metrics.completedActivityIds, aid];
      newlyCompletedActivityId = aid;
    }
  }

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

  const allNew = [...newlyCompletedTaskIds];
  if (newlyCompletedActivityId) {
    allNew.push(newlyCompletedActivityId);
  }

  if (allNew.length > 0) {
    const totalXpEarned = allNew.reduce((sum, taskId) => sum + getTaskXp(taskId), 0);
    addActivityPoints(totalXpEarned, scopeKey);

    const history = getCompletedHistory(scopeKey);
    const nextHistory = [...history];

    for (const taskId of allNew) {
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
    default: {
      const ids = Array.isArray(metrics.completedActivityIds) ? metrics.completedActivityIds : [];
      const done = ids.includes(String(taskId));
      return {
        current: done ? 1 : 0,
        target: 1,
      };
    }
  }
}
