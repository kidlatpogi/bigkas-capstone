const METRIC_LABELS = {
  visual_score: 'Visual Score',
  vocal_score: 'Vocal Score',
  verbal_score: 'Verbal Score',
  overall_score: 'Overall Score',
};

const METRIC_ALIASES = {
  visual_avg: 'visual_score',
  visual_score: 'visual_score',
  vocal_avg: 'vocal_score',
  vocal_score: 'vocal_score',
  acoustic_score: 'vocal_score',
  verbal_avg: 'verbal_score',
  verbal_score: 'verbal_score',
  context_score: 'verbal_score',
  overall_score: 'overall_score',
  confidence_score: 'overall_score',
  entry_point: 'overall_score',
};

const OVERALL_60 = [{ metric: 'overall_score', threshold: 60 }];
const VISUAL_60 = [{ metric: 'visual_score', threshold: 60 }];
const VOCAL_60 = [{ metric: 'vocal_score', threshold: 60 }];
const VERBAL_60 = [{ metric: 'verbal_score', threshold: 60 }];
const VISUAL_VOCAL_60 = [
  { metric: 'visual_score', threshold: 60 },
  { metric: 'vocal_score', threshold: 60 },
];

function normalizeMetricName(metric) {
  const key = String(metric || '').trim().toLowerCase();
  return METRIC_ALIASES[key] || key;
}

function score15ToPercent(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;
  const clamped = Math.max(1, Math.min(5, raw));
  return Math.round(((clamped - 1) / 4) * 100);
}

function toPercentScore(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;
  if (raw > 0 && raw <= 5) return score15ToPercent(raw);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function getMetricPercent(session, metric) {
  const normalized = normalizeMetricName(metric);
  if (normalized === 'visual_score') {
    return toPercentScore(session?.visual_score ?? session?.visual_avg);
  }
  if (normalized === 'vocal_score') {
    return toPercentScore(session?.vocal_score ?? session?.acoustic_score ?? session?.vocal_avg);
  }
  if (normalized === 'verbal_score') {
    return toPercentScore(session?.verbal_score ?? session?.context_score ?? session?.verbal_avg);
  }
  if (normalized === 'overall_score') {
    return toPercentScore(session?.overall_score ?? session?.confidence_score ?? session?.score ?? session?.entry_point);
  }
  return toPercentScore(session?.[normalized]);
}

export function normalizePassingScore(passingScore) {
  if (Array.isArray(passingScore)) return passingScore;
  if (typeof passingScore === 'string' && passingScore.trim()) {
    try {
      const parsed = JSON.parse(passingScore);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getDefaultPassingScoreForActivity(targetLevel, activityOrder) {
  const level = Number(targetLevel);
  const order = Number(activityOrder);

  if (level === 1) {
    if (order >= 1 && order <= 10) return VISUAL_60;
    if (order >= 11 && order <= 20) return VOCAL_60;
    if (order >= 21 && order <= 29) return VERBAL_60;
    if (order === 30) return OVERALL_60;
  }

  if (level === 2) {
    if ((order >= 1 && order <= 22) || [24, 25, 29].includes(order)) return VOCAL_60;
    if ([23, 26, 27, 28].includes(order)) return VISUAL_VOCAL_60;
    if (order === 30) return OVERALL_60;
  }

  if (level === 3 && order >= 1 && order <= 29) return VERBAL_60;

  if (level === 4) {
    if ((order >= 1 && order <= 22) || [24, 25, 27].includes(order)) return VISUAL_VOCAL_60;
    if ([23, 26, 28, 29, 30].includes(order)) return OVERALL_60;
  }

  if (level === 5) return OVERALL_60;

  return OVERALL_60;
}

export function formatPassingScore(passingScore) {
  const criteria = normalizePassingScore(passingScore);
  if (!criteria.length) return '';
  return criteria
    .map((item) => {
      const metric = normalizeMetricName(item?.metric);
      const label = METRIC_LABELS[metric] || String(item?.metric || 'Score');
      const threshold = Math.round(Number(item?.threshold) || 0);
      return `${label} ${threshold}%`;
    })
    .join(' and ');
}

export function evaluatePassingScore(session, passingScore) {
  const criteria = normalizePassingScore(passingScore);
  if (!criteria.length) return { passed: true, criteria: [], failedCriteria: [] };

  const evaluated = criteria.map((item) => {
    const metric = normalizeMetricName(item?.metric);
    const threshold = Math.max(0, Math.min(100, Number(item?.threshold) || 0));
    const value = getMetricPercent(session, metric);
    return {
      metric,
      label: METRIC_LABELS[metric] || String(item?.metric || 'Score'),
      threshold,
      value,
      passed: value != null && value >= threshold,
    };
  });

  return {
    passed: evaluated.every((item) => item.passed),
    criteria: evaluated,
    failedCriteria: evaluated.filter((item) => !item.passed),
  };
}

export function buildStageRetryMessage(stageTitle, evaluation) {
  const failed = Array.isArray(evaluation?.failedCriteria) ? evaluation.failedCriteria : [];
  const requirements = failed.length
    ? failed.map((item) => `${item.label} ${Math.round(item.threshold)}%`).join(' and ')
    : 'the passing score';
  const scores = failed
    .map((item) => `${item.label}: ${item.value == null ? 'not available' : `${Math.round(item.value)}%`}`)
    .join(', ');

  return [
    `Great effort. Your next goal is ${requirements} to unlock the next stage.`,
    scores ? `Current result: ${scores}.` : '',
    `Revisit ${stageTitle || 'this stage'} and focus on that speaking pillar.`,
  ].filter(Boolean).join(' ');
}

export function buildStageUnlockedMessage(stageTitle, passingScore, evaluation) {
  const requirementText = formatPassingScore(passingScore) || 'the stage goal';
  const criteria = Array.isArray(evaluation?.criteria) ? evaluation.criteria : [];
  const scores = criteria
    .map((item) => `${item.label}: ${item.value == null ? 'not available' : `${Math.round(item.value)}%`}`)
    .join(', ');

  return [
    `Great work. You reached ${requirementText} and unlocked the next step.`,
    scores ? `Current result: ${scores}.` : '',
    `Keep building on ${stageTitle || 'this stage'} with the same momentum.`,
  ].filter(Boolean).join(' ');
}

export function buildStagePassResultForSession(session) {
  if (!session?.activity_id) return null;

  const activityTitle = session.activity_title || session.objective_name || session.script_title || session.title || '';
  const targetLevel = session.activity_target_level ?? session.target_level;
  const activityOrder = session.activity_order ?? session.activityOrder;
  const explicitPassingScore =
    session.activity_passing_score ??
    session.passing_score ??
    session.passingScore ??
    null;
  const passingScore =
    explicitPassingScore ??
    (targetLevel != null && activityOrder != null
      ? getDefaultPassingScoreForActivity(targetLevel, activityOrder)
      : []);
  const normalizedPassingScore = normalizePassingScore(passingScore);

  if (!normalizedPassingScore.length) return null;

  const evaluation = evaluatePassingScore(session, normalizedPassingScore);

  return {
    isActivityStage: true,
    passed: evaluation.passed,
    requiredText: formatPassingScore(normalizedPassingScore),
    message: evaluation.passed
      ? buildStageUnlockedMessage(activityTitle, normalizedPassingScore, evaluation)
      : buildStageRetryMessage(activityTitle, evaluation),
    criteria: evaluation.criteria,
    failedCriteria: evaluation.failedCriteria,
    activityId: session.activity_id,
    activityTitle,
  };
}
