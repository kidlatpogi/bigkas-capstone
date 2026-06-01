import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_PROFILE_KEYS = new Set([
  'is_profiling_completed',
  'is_pre_test_completed',
  'diagnostic_completed_at',
  'current_level',
  'speaker_level',
  'diagnostic_score',
  'dashboard_tutorial_seen',
  'demographic_profile',
  'speaker_profile',
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeLevel(value: unknown) {
  const level = Number(value);
  if (!Number.isFinite(level)) return null;
  const rounded = Math.round(level);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function normalizeEntryScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 1 || score > 5) return null;
  return Math.round(score * 100) / 100;
}

function buildSafeProfilePatch(requestedUpdates: Record<string, unknown>, metadata: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};

  Object.entries(requestedUpdates).forEach(([key, value]) => {
    if (!ALLOWED_PROFILE_KEYS.has(key)) return;
    patch[key] = value;
  });

  const analysis = toRecord(metadata.onboarding_level_analysis);
  const analysisLevel = normalizeLevel(analysis.estimated_level_number);
  const speakerLevel = normalizeLevel(metadata.speaker_level_number ?? (
    Number.isFinite(Number(metadata.speaker_level)) ? metadata.speaker_level : null
  ));
  const progressLevel = normalizeLevel(metadata.progress_level_number ?? metadata.current_level);
  const entryScore = normalizeEntryScore(metadata.speaker_entry_score);

  if (metadata.profiling_completed !== undefined) {
    patch.is_profiling_completed = normalizeBoolean(metadata.profiling_completed);
  }
  if (metadata.pretest_completed !== undefined) {
    patch.is_pre_test_completed = normalizeBoolean(metadata.pretest_completed);
  }
  if (metadata.onboarding_completed !== undefined) {
    patch.diagnostic_completed_at = metadata.onboarding_completed ? new Date().toISOString() : null;
  }
  if (progressLevel || analysisLevel) {
    patch.current_level = progressLevel || analysisLevel;
  }
  if (speakerLevel || analysisLevel) {
    patch.speaker_level = speakerLevel || analysisLevel;
  }
  if (entryScore) {
    patch.diagnostic_score = entryScore;
  }
  if (metadata.dashboard_tutorial_seen !== undefined) {
    patch.dashboard_tutorial_seen = normalizeBoolean(metadata.dashboard_tutorial_seen);
  }
  if (metadata.demographic_profile !== undefined) {
    patch.demographic_profile = metadata.demographic_profile;
  }
  if (metadata.speaker_profile !== undefined) {
    patch.speaker_profile = metadata.speaker_profile;
  }

  if (Object.keys(patch).length) {
    patch.updated_at = new Date().toISOString();
  }

  return patch;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase function is not configured.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return jsonResponse({ error: 'Missing user session.' }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
  const caller = callerData?.user;

  if (callerError || !caller?.id) {
    return jsonResponse({ error: 'Invalid user session.' }, 401);
  }

  const requestedUpdates = toRecord(body.profile_updates);
  const profilePatch = buildSafeProfilePatch(requestedUpdates, toRecord(caller.user_metadata));

  if (!Object.keys(profilePatch).length) {
    return jsonResponse({ profile: null, updated: false });
  }

  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(profilePatch)
    .eq('id', caller.id)
    .select('*')
    .single();

  if (updateError || !profile) {
    return jsonResponse({ error: updateError?.message || 'Profile was not synced.' }, 400);
  }

  return jsonResponse({ profile, updated: true });
});
