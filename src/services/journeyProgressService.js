import { ensureFreshAccessToken, isJwtExpiredError, supabase } from '../lib/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOURNEY_PROGRESS_CACHE_TTL_MS = 30_000;
const journeyProgressCache = new Map();
const inFlightJourneyProgressRequests = new Map();

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

  const cached = journeyProgressCache.get(uid);
  if (cached && Date.now() - cached.storedAt < JOURNEY_PROGRESS_CACHE_TTL_MS) {
    return cached.value;
  }

  const inFlight = inFlightJourneyProgressRequests.get(uid);
  if (inFlight) return inFlight;

  const request = (async () => {
    const queryProfile = () =>
      supabase
        .from('profiles')
        .select('journey_started_at, journey_current_activity_id')
        .eq('id', uid)
        .maybeSingle();

    let { data: profile, error: profileError } = await queryProfile();

    if (profileError && isJwtExpiredError(profileError)) {
      await ensureFreshAccessToken();
      ({ data: profile, error: profileError } = await queryProfile());
    }

    if (profileError) {
      throw new Error(profileError.message);
    }

    const queryCompletions = () =>
      supabase
        .from('user_activity_completions')
        .select('activity_id')
        .eq('user_id', uid);

    let { data: rows, error: completionsError } = await queryCompletions();

    if (completionsError && isJwtExpiredError(completionsError)) {
      await ensureFreshAccessToken();
      ({ data: rows, error: completionsError } = await queryCompletions());
    }

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
  })();

  inFlightJourneyProgressRequests.set(uid, request);
  try {
    const value = await request;
    journeyProgressCache.set(uid, { value, storedAt: Date.now() });
    return value;
  } finally {
    inFlightJourneyProgressRequests.delete(uid);
  }
}

export async function persistActivityCompletion(userId, activityId) {
  const uid = String(userId || '').trim();
  const aid = String(activityId || '').trim();
  if (!uid || !aid) return;

  const { error } = await supabase.from('user_activity_completions').upsert(
    { user_id: uid, activity_id: aid },
    { onConflict: 'user_id,activity_id', ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(error.message);
  }

  journeyProgressCache.delete(uid);
}

/** Sets journey_started_at the first time the user opens the journey (idempotent). */
export async function ensureJourneyStarted(userId) {
  const uid = String(userId || '').trim();
  if (!uid) return { ok: false };

  const updateStartedAt = () =>
    supabase
      .from('profiles')
      .update({ journey_started_at: new Date().toISOString() })
      .eq('id', uid)
      .is('journey_started_at', null)
      .select('journey_started_at')
      .maybeSingle();

  let { data, error } = await updateStartedAt();

  if (error && isJwtExpiredError(error)) {
    await ensureFreshAccessToken();
    ({ data, error } = await updateStartedAt());
  }

  if (error) {
    throw new Error(error.message);
  }

  const journeyStartedAt = data?.journey_started_at ?? null;
  if (journeyStartedAt) {
    const cached = journeyProgressCache.get(uid)?.value;
    journeyProgressCache.set(uid, {
      storedAt: Date.now(),
      value: {
        journeyStartedAt,
        journeyCurrentActivityId: cached?.journeyCurrentActivityId ?? null,
        completedActivityIds: cached?.completedActivityIds ?? [],
      },
    });
  }

  return { ok: true, journeyStartedAt };
}

export async function updateJourneyCurrentActivity(userId, activityId) {
  const uid = String(userId || '').trim();
  if (!uid) return;

  const updateCurrentActivity = () =>
    supabase
      .from('profiles')
      .update({
        journey_current_activity_id: activityId == null ? null : String(activityId),
      })
      .eq('id', uid);

  let { error } = await updateCurrentActivity();

  if (error && isJwtExpiredError(error)) {
    await ensureFreshAccessToken();
    ({ error } = await updateCurrentActivity());
  }

  if (error) {
    throw new Error(error.message);
  }

  const cached = journeyProgressCache.get(uid)?.value;
  if (cached) {
    journeyProgressCache.set(uid, {
      storedAt: Date.now(),
      value: {
        ...cached,
        journeyCurrentActivityId: activityId == null ? null : String(activityId),
      },
    });
  }
}

export async function updateUserProgressLevel(userId, level) {
  const uid = String(userId || '').trim();
  if (!uid) return;

  const updateProgressLevel = () =>
    supabase
      .from('profiles')
      .update({
        current_level: Math.max(1, Math.min(5, Number(level) || 1)),
      })
      .eq('id', uid);

  let { error } = await updateProgressLevel();

  if (error && isJwtExpiredError(error)) {
    await ensureFreshAccessToken();
    ({ error } = await updateProgressLevel());
  }

  if (error) {
    throw new Error(error.message);
  }
}
