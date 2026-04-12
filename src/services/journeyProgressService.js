import { supabase } from '../lib/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when scope key is a user id (logged-in metrics), not GLOBAL_ACTIVITY_SCOPE. */
export function isUuidUserId(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/**
 * @returns {Promise<{ journeyStartedAt: string | null, journeyCurrentActivityId: string | null, completedActivityIds: string[] }>}
 */
export async function fetchUserJourneyProgress(userId) {
  const uid = String(userId || '').trim();
  if (!uid) {
    return { journeyStartedAt: null, journeyCurrentActivityId: null, completedActivityIds: [] };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('journey_started_at, journey_current_activity_id')
    .eq('id', uid)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: rows, error: completionsError } = await supabase
    .from('user_activity_completions')
    .select('activity_id')
    .eq('user_id', uid);

  if (completionsError) {
    throw new Error(completionsError.message);
  }

  const completedActivityIds = (Array.isArray(rows) ? rows : [])
    .map((r) => r?.activity_id)
    .filter(Boolean)
    .map(String);

  return {
    journeyStartedAt: profile?.journey_started_at ?? null,
    journeyCurrentActivityId: profile?.journey_current_activity_id ?? null,
    completedActivityIds,
  };
}

export async function persistActivityCompletion(userId, activityId) {
  const uid = String(userId || '').trim();
  const aid = String(activityId || '').trim();
  if (!uid || !aid) return;

  const { error } = await supabase.from('user_activity_completions').upsert(
    { user_id: uid, activity_id: aid },
    { onConflict: 'user_id,activity_id' },
  );

  if (error) {
    throw new Error(error.message);
  }
}

/** Sets journey_started_at the first time the user opens the journey (idempotent). */
export async function ensureJourneyStarted(userId) {
  const uid = String(userId || '').trim();
  if (!uid) return { ok: false };

  const { data, error } = await supabase
    .from('profiles')
    .update({ journey_started_at: new Date().toISOString() })
    .eq('id', uid)
    .is('journey_started_at', null)
    .select('journey_started_at')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, journeyStartedAt: data?.journey_started_at ?? null };
}

export async function updateJourneyCurrentActivity(userId, activityId) {
  const uid = String(userId || '').trim();
  if (!uid) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      journey_current_activity_id: activityId == null ? null : String(activityId),
    })
    .eq('id', uid);

  if (error) {
    throw new Error(error.message);
  }
}
