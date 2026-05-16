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
  const shouldArchive = Boolean(body.should_archive);
  const archivedAt = shouldArchive ? new Date().toISOString() : null;
  const updatedAt = new Date().toISOString();

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

  if (targetProfile.id === callerProfile.id && shouldArchive) {
    return jsonResponse({ error: 'You cannot delete your own admin account.' }, 400);
  }

  if (isAdminRole(targetProfile.role) && callerProfile.role !== 'superadmin') {
    return jsonResponse({ error: 'Only superadmins can manage admin accounts.' }, 403);
  }

  const { data: profile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ archived_at: archivedAt, updated_at: updatedAt })
    .eq('id', targetId)
    .select('*')
    .single();

  if (updateError || !profile) {
    return jsonResponse({ error: updateError?.message || 'Profile archive state was not updated.' }, 400);
  }

  const { data: authUserData, error: getAuthUserError } = await supabaseAdmin.auth.admin.getUserById(targetId);

  if (getAuthUserError || !authUserData?.user) {
    const rollbackArchivedAt = shouldArchive ? null : targetProfile.archived_at || null;
    await supabaseAdmin
      .from('profiles')
      .update({ archived_at: rollbackArchivedAt, updated_at: new Date().toISOString() })
      .eq('id', targetId);

    return jsonResponse({ error: getAuthUserError?.message || 'Auth user not found.' }, 400);
  }

  const existingAppMetadata = authUserData.user.app_metadata || {};
  const existingUserMetadata = authUserData.user.user_metadata || {};
  const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
    ban_duration: shouldArchive ? '876000h' : 'none',
    app_metadata: {
      ...existingAppMetadata,
      account_archived: shouldArchive,
      account_archived_at: archivedAt,
    },
    user_metadata: {
      ...existingUserMetadata,
      account_deactivated: shouldArchive,
      account_deleted: shouldArchive,
      account_deleted_at: archivedAt,
    },
  });

  if (authUpdateError) {
    const rollbackArchivedAt = shouldArchive ? null : targetProfile.archived_at || null;
    await supabaseAdmin
      .from('profiles')
      .update({ archived_at: rollbackArchivedAt, updated_at: new Date().toISOString() })
      .eq('id', targetId);

    return jsonResponse({ error: authUpdateError.message || 'Auth user archive state was not updated.' }, 400);
  }

  return jsonResponse({ profile });
});
