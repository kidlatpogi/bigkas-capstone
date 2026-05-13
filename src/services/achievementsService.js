import { supabase } from '../lib/supabase';

/**
 * Fetches all achievements and merges the current user's unlock status.
 * Returns a flat array ordered by creation date.
 *
 * @param {string} userId - The authenticated user's profile ID.
 * @returns {Promise<Array>}
 */
export async function fetchUserAchievements(userId) {
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

  return (allRes.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    badgeUrl: a.badge_url ?? null,
    unlockDescription: a.unlock_description ?? null,
    unlockRequirements: a.unlock_requirements ?? null,
    createdAt: a.created_at,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }));
}
