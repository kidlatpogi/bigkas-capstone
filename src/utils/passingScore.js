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
    `Good effort. This stage needs ${requirements} before you can advance.`,
    scores ? `Your result: ${scores}.` : '',
    `Try ${stageTitle || 'this stage'} again and focus on the required pillar.`,
  ].filter(Boolean).join(' ');
}
