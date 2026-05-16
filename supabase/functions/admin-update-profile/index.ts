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

function normalizeText(value: unknown) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeLevel(value: unknown) {
  return Math.min(5, Math.max(1, Number(value || 1) || 1));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
  if (!targetId) {
    return jsonResponse({ error: 'Profile id is required.' }, 400);
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

  const firstName = normalizeText(body.first_name);
  const lastName = normalizeText(body.last_name);
  const username = normalizeText(body.username);
  const currentLevel = normalizeLevel(body.current_level);
  const speakerLevel = normalizeLevel(body.speaker_level);
  const speakerPoints = Math.max(0, Number(body.speaker_points || 0) || 0);
  const role = isAdminRole(targetProfile.role) ? targetProfile.role : 'user';

  const profilePayload = {
    first_name: firstName,
    last_name: lastName,
    username,
    role,
    current_level: currentLevel,
    speaker_level: speakerLevel,
    speaker_points: speakerPoints,
    updated_at: new Date().toISOString(),
  };

  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(profilePayload)
    .eq('id', targetId)
    .select('*')
    .single();

  if (updateError || !profile) {
    return jsonResponse({ error: updateError?.message || 'Profile was not updated.' }, 400);
  }

  const { data: authUserData, error: getAuthUserError } = await supabaseAdmin.auth.admin.getUserById(targetId);

  if (!getAuthUserError && authUserData?.user) {
    const existingUserMetadata = authUserData.user.user_metadata || {};
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || existingUserMetadata.full_name || existingUserMetadata.name || null;
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
      user_metadata: {
        ...existingUserMetadata,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        username,
        role,
        progress_level_number: currentLevel,
        speaker_level_number: speakerLevel,
      },
    });

    if (authUpdateError) {
      return jsonResponse({ error: authUpdateError.message || 'Auth metadata was not updated.' }, 400);
    }
  }

  return jsonResponse({ profile });
});
