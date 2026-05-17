import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isAdminRole(role: unknown) {
  return role === 'admin' || role === 'superadmin';
}

function normalizeLevel(value: unknown) {
  return Math.min(5, Math.max(1, Number(value || 1) || 1));
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
    return jsonResponse({ error: 'Missing admin session.' }, 401);
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
    return jsonResponse({ error: 'Invalid admin session.' }, 401);
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', caller.id)
    .single();

  if (callerProfileError || !callerProfile || !isAdminRole(callerProfile.role)) {
    return jsonResponse({ error: 'Admin privileges are required.' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const targetId = String(body.user_id || '').trim();
  const activityIds = Array.isArray(body.activity_ids)
    ? [...new Set(body.activity_ids.map((id) => String(id || '').trim()).filter(Boolean))]
    : [];
  const shouldAdvance = body.advance_to_level !== null && body.advance_to_level !== undefined;
  const nextLevel = shouldAdvance ? normalizeLevel(body.advance_to_level) : null;

  if (!targetId) {
    return jsonResponse({ error: 'Profile id is required.' }, 400);
  }

  if (!activityIds.length) {
    return jsonResponse({ error: 'At least one activity is required.' }, 400);
  }

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .single();

  if (targetError || !targetProfile) {
    return jsonResponse({ error: 'Profile not found.' }, 404);
  }

  if (isAdminRole(targetProfile.role) && callerProfile.role !== 'superadmin') {
    return jsonResponse({ error: 'Only superadmins can manage admin accounts.' }, 403);
  }

  const completedAt = new Date().toISOString();
  const completionRows = activityIds.map((activityId) => ({
    user_id: targetId,
    activity_id: activityId,
    completed_at: completedAt,
  }));

  const { error: completionError } = await supabaseAdmin
    .from('user_activity_completions')
    .upsert(completionRows, { onConflict: 'user_id,activity_id' });

  if (completionError) {
    return jsonResponse({ error: completionError.message || 'Stage progress was not updated.' }, 400);
  }

  let profile = null;
  if (nextLevel) {
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ current_level: nextLevel, updated_at: new Date().toISOString() })
      .eq('id', targetId)
      .select('*')
      .single();

    if (updateError || !updatedProfile) {
      return jsonResponse({ error: updateError?.message || 'Profile journey was not updated.' }, 400);
    }

    const { data: authUserData, error: getAuthUserError } = await supabaseAdmin.auth.admin.getUserById(targetId);

    if (!getAuthUserError && authUserData?.user) {
      const existingUserMetadata = authUserData.user.user_metadata || {};
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
        user_metadata: {
          ...existingUserMetadata,
          progress_level_number: nextLevel,
        },
      });

      if (authUpdateError) {
        return jsonResponse({ error: authUpdateError.message || 'Auth metadata was not updated.' }, 400);
      }
    }

    profile = updatedProfile;
  }

  return jsonResponse({
    ok: true,
    completed_at: completedAt,
    completed_activity_ids: activityIds,
    profile,
  });
});
