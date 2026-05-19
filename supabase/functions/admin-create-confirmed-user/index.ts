import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_ROLES = new Set(['user', 'admin', 'superadmin']);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeText(value: unknown) {
  const text = String(value || '').trim();
  return text || null;
}

async function hasAdminPermission(supabaseAdmin: ReturnType<typeof createClient>, adminId: string, area: string, action: string) {
  const column = `can_${action}`;
  const { data, error } = await supabaseAdmin
    .from('admin_role_assignments')
    .select(`admin_access_roles!inner(admin_role_permissions!inner(area, ${column}))`)
    .eq('admin_id', adminId)
    .eq('admin_access_roles.admin_role_permissions.area', area)
    .single();

  if (error || !data) return false;
  const permissions = data.admin_access_roles?.admin_role_permissions;
  const row = Array.isArray(permissions) ? permissions[0] : permissions;
  return Boolean(row?.[column]);
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

  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (profileError || !callerProfile || !['admin', 'superadmin'].includes(callerProfile.role)) {
    return jsonResponse({ error: 'Admin privileges are required.' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = String(body.role || 'user').trim().toLowerCase();
  const firstName = normalizeText(body.first_name);
  const lastName = normalizeText(body.last_name);
  const username = normalizeText(body.username);
  const studentNumber = normalizeText(body.student_number);
  const currentLevel = Math.min(5, Math.max(1, Number(body.current_level || 1) || 1));
  const speakerLevel = Math.min(5, Math.max(1, Number(body.speaker_level || 1) || 1));
  const speakerPoints = Math.max(0, Number(body.speaker_points || 0) || 0);

  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'A valid email is required.' }, 400);
  }

  if (password.length < 6) {
    return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
  }

  if (!VALID_ROLES.has(role)) {
    return jsonResponse({ error: 'Invalid user role.' }, 400);
  }

  if ((role === 'admin' || role === 'superadmin') && callerProfile.role !== 'superadmin') {
    return jsonResponse({ error: 'Only superadmins can create admin accounts.' }, 403);
  }

  if (role === 'user' && callerProfile.role !== 'superadmin') {
    const allowed = await hasAdminPermission(supabaseAdmin, caller.id, 'users', 'create');
    if (!allowed) {
      return jsonResponse({ error: 'You do not have permission to create student accounts.' }, 403);
    }
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      username,
      role,
      admin_created: true,
    },
  });

  if (createError || !created?.user?.id) {
    return jsonResponse({ error: createError?.message || 'User account was not created.' }, 400);
  }

  const profilePayload = {
    id: created.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    username,
    student_number: studentNumber,
    role,
    current_level: currentLevel,
    speaker_level: speakerLevel,
    speaker_points: speakerPoints,
    archived_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data: profile, error: upsertError } = await supabaseAdmin
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (upsertError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return jsonResponse({ error: upsertError.message }, 400);
  }

  return jsonResponse({
    user: {
      id: created.user.id,
      email: created.user.email,
      email_confirmed_at: created.user.email_confirmed_at,
    },
    profile,
  });
});
