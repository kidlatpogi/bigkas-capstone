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
    .select('role, archived_at')
    .eq('id', caller.id)
    .single();

  if (profileError || !callerProfile || !isAdminRole(callerProfile.role) || callerProfile.archived_at) {
    return jsonResponse({ error: 'Admin privileges are required.' }, 403);
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return jsonResponse({ error: profilesError.message }, 400);
  }

  const authUsersById = new Map<string, string>();
  const perPage = 1000;
  let page = 1;

  for (;;) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (authError) {
      return jsonResponse({ error: authError.message }, 400);
    }

    const authUsers = authData?.users || [];
    authUsers.forEach((authUser) => {
      authUsersById.set(authUser.id, authUser.email || '');
    });

    if (authUsers.length < perPage) break;
    page += 1;
  }

  const enrichedProfiles = (profiles || []).map((profile) => ({
    ...profile,
    email: authUsersById.get(profile.id) || null,
  }));

  return jsonResponse({ profiles: enrichedProfiles });
});
