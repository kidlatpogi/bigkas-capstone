import { supabase } from '../lib/supabase';
import { getAchievementBadgeUrl } from '../utils/achievementBadgeAssets';
import { evaluatePassingScore, getDefaultPassingScoreForActivity } from '../utils/passingScore';

/**
 * Maps unlock_requirements JSONB keys to fields on the client-side user object.
 */
const REQUIREMENT_KEY_MAP = {
  is_profiling_completed: 'profilingCompleted',
  is_pre_test_completed:  'pretestCompleted',
};

const BASE_ACHIEVEMENT_COLUMNS = 'id, name, description, badge_url, unlock_description, unlock_requirements, created_at';
const EXTENDED_ACHIEVEMENT_COLUMNS = `${BASE_ACHIEVEMENT_COLUMNS}, achievement_key, journey_number, stage_number`;
const ACTIVITY_COLUMNS = 'id, target_level, activity_order, title, objective';
const SESSION_COLUMNS = `
  id,
  status,
  session_origin,
  session_mode,
  speaking_mode,
  source,
  activity_id,
  created_at,
  session_metrics (
    overall_score,
    vocal_score,
    visual_score,
    verbal_score,
    confidence_score,
    eye_contact_score,
    gesture_score,
    visual_avg,
    vocal_avg,
    verbal_avg
  )
`;

function isMissingColumn(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42703' || error?.code === 'PGRST204' || message.includes('could not find') || message.includes('does not exist');
}

function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeNestedSingle(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getRequirementStage(requirements) {
  if (!requirements || typeof requirements !== 'object') return null;
  const stageRequirement =
    requirements.journey_stage_completed ||
    requirements.completed_journey_stage ||
    requirements.activity_completed;

  if (!stageRequirement || typeof stageRequirement !== 'object') return null;

  const journey = toNumberOrNull(stageRequirement.journey ?? stageRequirement.journey_number ?? stageRequirement.level ?? stageRequirement.target_level);
  const stage = toNumberOrNull(stageRequirement.stage ?? stageRequirement.stage_number ?? stageRequirement.activity_order);

  if (!journey || !stage) return null;
  return { journey, stage };
}

function getStageKey(journey, stage) {
  return `${Number(journey)}:${Number(stage)}`;
}

function normalizeSessionForPassing(session, activity, metrics) {
  return {
    ...session,
    activity_target_level: activity?.target_level,
    target_level: activity?.target_level,
    activity_order: activity?.activity_order,
    activityOrder: activity?.activity_order,
    activity_title: activity?.title,
    objective_name: activity?.objective,
    overall_score: metrics?.overall_score,
    confidence_score: metrics?.confidence_score,
    vocal_score: metrics?.vocal_score,
    visual_score: metrics?.visual_score,
    verbal_score: metrics?.verbal_score,
    visual_avg: metrics?.visual_avg,
    vocal_avg: metrics?.vocal_avg,
    verbal_avg: metrics?.verbal_avg,
    eye_contact_score: metrics?.eye_contact_score,
    gesture_score: metrics?.gesture_score,
  };
}

async function fetchAchievementRows() {
  const queryExtended = () =>
    supabase
      .from('achievements')
      .select(EXTENDED_ACHIEVEMENT_COLUMNS)
      .order('journey_number', { ascending: true, nullsFirst: false })
      .order('stage_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

  let { data, error } = await queryExtended();

  if (error && isMissingColumn(error)) {
    ({ data, error } = await supabase
      .from('achievements')
      .select(BASE_ACHIEVEMENT_COLUMNS)
      .order('created_at', { ascending: true }));
  }

  if (error) throw error;
  return data ?? [];
}

async function fetchCompletedJourneyStages(userId) {
  if (!userId) return new Set();

  const [{ data: sessions, error: sessionsError }, { data: activities, error: activitiesError }] = await Promise.all([
    supabase
      .from('sessions')
      .select(SESSION_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('activities')
      .select(ACTIVITY_COLUMNS),
  ]);

  if (sessionsError) throw sessionsError;
  if (activitiesError) throw activitiesError;

  const activityMap = new Map((activities ?? []).map((activity) => [String(activity.id), activity]));
  const completed = new Set();

  for (const session of sessions ?? []) {
    const activity = activityMap.get(String(session.activity_id || ''));
    if (!activity) continue;

    const metrics = normalizeNestedSingle(session.session_metrics);
    if (!metrics) continue;

    const normalized = normalizeSessionForPassing(session, activity, metrics);
    const passingScore = getDefaultPassingScoreForActivity(activity.target_level, activity.activity_order);
    const evaluation = evaluatePassingScore(normalized, passingScore);

    if (evaluation.passed) {
      completed.add(getStageKey(activity.target_level, activity.activity_order));
    }
  }

  return completed;
}

/**
 * Evaluates whether a user satisfies an achievement's unlock_requirements.
 */
export function evaluateUnlockRequirements(requirements, userProfile, progress = {}) {
  if (!requirements || typeof requirements !== 'object') return false;
  const entries = Object.entries(requirements);
  if (entries.length === 0) return false;

  return entries.every(([key, expected]) => {
    if (['journey_stage_completed', 'completed_journey_stage', 'activity_completed'].includes(key)) {
      const stage = getRequirementStage({ [key]: expected });
      if (!stage) return false;
      return progress.completedJourneyStages?.has(getStageKey(stage.journey, stage.stage)) ?? false;
    }

    const mappedKey = REQUIREMENT_KEY_MAP[key] ?? key;
    const actual = userProfile?.[mappedKey];
    if (typeof expected === 'boolean') return !!actual === expected;
    if (typeof expected === 'number')  return Number(actual) >= expected;
    return String(actual) === String(expected);
  });
}

/**
 * Fetches all achievements and merges the user's unlock status.
 * Badges that meet requirements but haven't been claimed yet are marked as `claimable`.
 * They are NOT auto-granted — the user must claim them.
 */
export async function fetchUserAchievements(userId, userProfile) {
  const [allAchievements, completedJourneyStages, unlockedRes] = await Promise.all([
    fetchAchievementRows(),
    fetchCompletedJourneyStages(userId),
    supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId),
  ]);

  if (unlockedRes.error) throw unlockedRes.error;

  const unlockedMap = new Map(
    (unlockedRes.data ?? []).map((u) => [u.achievement_id, u.unlocked_at])
  );

  return allAchievements.map((a) => {
    const alreadyClaimed = unlockedMap.has(a.id);
    const meetsRequirements = evaluateUnlockRequirements(a.unlock_requirements, userProfile, {
      completedJourneyStages,
    });
    const stageRequirement = getRequirementStage(a.unlock_requirements);
    const journeyNumber = a.journey_number ?? stageRequirement?.journey ?? null;
    const stageNumber = a.stage_number ?? stageRequirement?.stage ?? null;

    return {
      id: a.id,
      achievementKey: a.achievement_key ?? null,
      name: a.name,
      description: a.description,
      badgeUrl: getAchievementBadgeUrl(a) ?? a.badge_url ?? null,
      unlockDescription: a.unlock_description ?? null,
      unlockRequirements: a.unlock_requirements ?? null,
      journeyNumber,
      stageNumber,
      createdAt: a.created_at,
      claimed: alreadyClaimed,
      claimable: !alreadyClaimed && meetsRequirements,
      unlocked: alreadyClaimed,
      unlockedAt: unlockedMap.get(a.id) ?? null,
    };
  });
}

/**
 * Claims an achievement — inserts a row into user_achievements.
 * Returns the unlocked_at timestamp on success.
 */
export async function claimAchievementInDB(userId, achievementId) {
  const { data, error } = await supabase
    .from('user_achievements')
    .upsert(
      { user_id: userId, achievement_id: achievementId },
      { onConflict: 'user_id, achievement_id', ignoreDuplicates: true }
    )
    .select('unlocked_at')
    .maybeSingle();

  if (error) throw error;
  return data?.unlocked_at ?? new Date().toISOString();
}

export async function claimAllAchievementsInDB(userId) {
  if (!userId) throw new Error('Please sign in before claiming achievements.');

  const achievements = await fetchAchievementRows();
  const rows = achievements
    .map((achievement) => achievement?.id)
    .filter(Boolean)
    .map((achievementId) => ({
      user_id: userId,
      achievement_id: achievementId,
    }));

  if (rows.length === 0) return [];

  const { error: upsertError } = await supabase
    .from('user_achievements')
    .upsert(rows, {
      onConflict: 'user_id, achievement_id',
      ignoreDuplicates: true,
    });

  if (upsertError) throw upsertError;

  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', userId);

  if (error) throw error;
  return data ?? [];
}

export async function unclaimAllAchievementsInDB(userId) {
  if (!userId) throw new Error('Please sign in before unclaiming achievements.');

  const { data, error } = await supabase
    .from('user_achievements')
    .delete()
    .eq('user_id', userId)
    .select('achievement_id');

  if (error) throw error;
  return data ?? [];
}

