export const MAX_SPEAKER_POINTS_HISTORY = 60;

const SOURCE_LABELS = {
  'session-reward': 'Session performance reward',
  'activity-task': 'Activity task completion',
  'onboarding-bonus': 'Onboarding pre-test bonus',
};

function toSafeInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function toIso(value) {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function toMeta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

export function getSpeakerPointsSourceLabel(source = '') {
  const key = String(source || '').trim().toLowerCase();
  return SOURCE_LABELS[key] || 'Points update';
}

export function normalizeSpeakerPointsHistory(historyInput) {
  if (!Array.isArray(historyInput)) return [];

  const normalized = historyInput
    .map((entry, index) => {
      const pointsAwarded = Math.max(0, toSafeInt(entry?.pointsAwarded, 0));
      const totalPointsAfter = Number.isFinite(Number(entry?.totalPointsAfter))
        ? Math.max(0, toSafeInt(entry.totalPointsAfter, 0))
        : null;

      return {
        id: String(entry?.id || `${Date.now()}-${index}`),
        source: String(entry?.source || 'activity-task'),
        label: String(entry?.label || '').trim(),
        pointsAwarded,
        totalPointsAfter,
        createdAt: toIso(entry?.createdAt),
        metadata: toMeta(entry?.metadata),
      };
    })
    .filter((entry) => entry.pointsAwarded > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return normalized.slice(0, MAX_SPEAKER_POINTS_HISTORY);
}

export function createSpeakerPointsHistoryEntry({
  source = 'activity-task',
  label = '',
  pointsAwarded = 0,
  totalPointsAfter = null,
  createdAt = new Date().toISOString(),
  metadata = {},
} = {}) {
  const safePoints = Math.max(0, toSafeInt(pointsAwarded, 0));
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    source: String(source || 'activity-task').trim(),
    label: String(label || '').trim(),
    pointsAwarded: safePoints,
    totalPointsAfter: Number.isFinite(Number(totalPointsAfter))
      ? Math.max(0, toSafeInt(totalPointsAfter, 0))
      : null,
    createdAt: toIso(createdAt),
    metadata: toMeta(metadata),
  };
}

export function appendSpeakerPointsHistory(existingHistory, newEntries) {
  const existing = normalizeSpeakerPointsHistory(existingHistory);
  const entriesArray = Array.isArray(newEntries) ? newEntries : [newEntries];
  const next = normalizeSpeakerPointsHistory([...entriesArray, ...existing]);

  const seen = new Set();
  const deduped = [];
  for (const entry of next) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    deduped.push(entry);
  }

  return deduped.slice(0, MAX_SPEAKER_POINTS_HISTORY);
}
