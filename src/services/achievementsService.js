import { supabase } from '../lib/supabase';

/**
 * Maps unlock_requirements JSONB keys to fields on the client-side user object.
 */
const REQUIREMENT_KEY_MAP = {
  is_profiling_completed: 'profilingCompleted',
  is_pre_test_completed:  'pretestCompleted',
};

/**
 * Evaluates whether a user satisfies an achievement's unlock_requirements.
 */
export function evaluateUnlockRequirements(requirements, userProfile) {
  if (!requirements || typeof requirements !== 'object') return false;
  const entries = Object.entries(requirements);
  if (entries.length === 0) return false;

  return entries.every(([key, expected]) => {
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
  const [allRes, unlockedRes] = await Promise.all([
    supabase
      .from('achievements')
      .select('id, name, description, badge_url, unlock_description, unlock_requirements, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId),
  ]);

  if (allRes.error) throw allRes.error;
  if (unlockedRes.error) throw unlockedRes.error;

  const unlockedMap = new Map(
    (unlockedRes.data ?? []).map((u) => [u.achievement_id, u.unlocked_at])
  );

  return (allRes.data ?? []).map((a) => {
    const alreadyClaimed = unlockedMap.has(a.id);
    const meetsRequirements = evaluateUnlockRequirements(a.unlock_requirements, userProfile);

    return {
      id: a.id,
      name: a.name,
      description: a.description,
      badgeUrl: a.badge_url ?? null,
      unlockDescription: a.unlock_description ?? null,
      unlockRequirements: a.unlock_requirements ?? null,
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
    .single();

  if (error) throw error;
  return data?.unlocked_at ?? new Date().toISOString();
}
