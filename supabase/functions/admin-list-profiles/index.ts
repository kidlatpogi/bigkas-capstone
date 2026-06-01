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

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeLevelNumber(value: unknown) {
  const level = Number(value);
  if (!Number.isFinite(level)) return null;
  const rounded = Math.round(level);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const includeAnalytics = body.include_analytics === true;

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

  const { data: sectionStudents, error: sectionStudentsError } = await supabaseAdmin
    .from('section_students')
    .select('*');

  if (sectionStudentsError) {
    return jsonResponse({ error: sectionStudentsError.message }, 400);
  }

  const { data: sections, error: sectionsError } = await supabaseAdmin
    .from('sections')
    .select('id, name, teacher_id');

  if (sectionsError) {
    return jsonResponse({ error: sectionsError.message }, 400);
  }

  const authUsersById = new Map<string, { email: string | null; metadata: Record<string, unknown> }>();
  const sectionsById = new Map((sections || []).map((section) => [section.id, section]));
  const sectionStudentsByStudentId = new Map((sectionStudents || []).map((row) => [row.student_id, row]));
  const perPage = 1000;
  let page = 1;

  for (;;) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (authError) {
      return jsonResponse({ error: authError.message }, 400);
    }

    const authUsers = authData?.users || [];
    authUsers.forEach((authUser) => {
      authUsersById.set(authUser.id, {
        email: authUser.email || null,
        metadata: toRecord(authUser.user_metadata),
      });
    });

    if (authUsers.length < perPage) break;
    page += 1;
  }

  const enrichedProfiles = await Promise.all((profiles || []).map(async (profile) => {
    const sectionStudent = sectionStudentsByStudentId.get(profile.id);
    const sectionId = sectionStudent?.section_id || null;
    const section = sectionId ? sectionsById.get(sectionId) : null;
    const authUser = authUsersById.get(profile.id) || null;
    const authMetadata = authUser?.metadata || {};
    const onboardingLevelAnalysis = toRecord(authMetadata.onboarding_level_analysis);
    const speakerLevelNumber = normalizeLevelNumber(authMetadata.speaker_level_number);
    const progressLevelNumber = normalizeLevelNumber(authMetadata.progress_level_number);
    const estimatedLevelNumber = normalizeLevelNumber(onboardingLevelAnalysis.estimated_level_number);
    const resolvedSpeakerLevel = speakerLevelNumber ?? estimatedLevelNumber ?? normalizeLevelNumber(profile.speaker_level);
    const resolvedProgressLevel = progressLevelNumber ?? normalizeLevelNumber(profile.current_level);
    const speakerEntryScore = Number(authMetadata.speaker_entry_score);
    const finalScore = Number(onboardingLevelAnalysis.final_score);
    const authEmail = authUser?.email || null;
    const profileEmail = typeof profile.email === 'string' && profile.email.trim()
      ? profile.email.trim()
      : null;
    const email = authEmail || profileEmail;
    const syncedProfile = { ...profile };

    if (profile.role === 'user') {
      const profilePatch: Record<string, unknown> = {};
      if (resolvedSpeakerLevel && normalizeLevelNumber(profile.speaker_level) !== resolvedSpeakerLevel) {
        profilePatch.speaker_level = resolvedSpeakerLevel;
      }
      if (resolvedProgressLevel && normalizeLevelNumber(profile.current_level) !== resolvedProgressLevel) {
        profilePatch.current_level = resolvedProgressLevel;
      }
      if (Number.isFinite(speakerEntryScore) && Number(profile.diagnostic_score) !== speakerEntryScore) {
        profilePatch.diagnostic_score = speakerEntryScore;
      }

      if (Object.keys(profilePatch).length) {
        const { data: updatedProfile } = await supabaseAdmin
          .from('profiles')
          .update({ ...profilePatch, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
          .select('*')
          .single();

        if (updatedProfile) {
          Object.assign(syncedProfile, updatedProfile);
        } else {
          Object.assign(syncedProfile, profilePatch);
        }
      }
    }

    return {
      ...syncedProfile,
      email,
      auth_email: authEmail,
      profile_email: profileEmail,
      section_id: sectionId,
      section_name: section?.name || null,
      speaker_level_number: resolvedSpeakerLevel ?? syncedProfile.speaker_level_number ?? null,
      progress_level_number: resolvedProgressLevel ?? syncedProfile.progress_level_number ?? null,
      speaker_entry_score: Number.isFinite(speakerEntryScore)
        ? speakerEntryScore
        : syncedProfile.speaker_entry_score ?? null,
      onboarding_level_analysis: Object.keys(onboardingLevelAnalysis).length
        ? {
          estimated_level_number: estimatedLevelNumber,
          final_score: Number.isFinite(finalScore) ? finalScore : null,
        }
        : syncedProfile.onboarding_level_analysis ?? null,
    };
  }));

  if (!includeAnalytics) {
    return jsonResponse({ profiles: enrichedProfiles, section_students: sectionStudents || [] });
  }

  const visibleStudentIds = callerProfile.role === 'superadmin'
    ? new Set((profiles || []).filter((profile) => profile.role === 'user').map((profile) => profile.id))
    : new Set(
      (sectionStudents || [])
        .filter((row) => sectionsById.get(row.section_id)?.teacher_id === caller.id)
        .map((row) => row.student_id)
    );

  let sessionsQuery = supabaseAdmin
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: true });

  if (callerProfile.role !== 'superadmin') {
    const visibleIds = Array.from(visibleStudentIds);
    if (!visibleIds.length) {
      return jsonResponse({
        profiles: enrichedProfiles,
        section_students: sectionStudents || [],
        sessions: [],
        session_metrics: [],
      });
    }
    sessionsQuery = sessionsQuery.in('user_id', visibleIds);
  }

  const { data: sessions, error: sessionsError } = await sessionsQuery;

  if (sessionsError) {
    return jsonResponse({ error: sessionsError.message }, 400);
  }

  const visibleSessions = callerProfile.role === 'superadmin'
    ? (sessions || [])
    : (sessions || []).filter((session) => visibleStudentIds.has(session.user_id));
  const sessionIds = visibleSessions.map((session) => session.id).filter(Boolean);
  const metricColumns = 'session_id, overall_score, visual_score, vocal_score, verbal_score, visual_avg, vocal_avg, verbal_avg, confidence_score, pronunciation_score';
  const metricChunks = await Promise.all(chunkArray(sessionIds, 500).map(async (ids) => {
    const { data, error } = await supabaseAdmin
      .from('session_metrics')
      .select(metricColumns)
      .in('session_id', ids);

    if (error) throw error;
    return data || [];
  }));

  return jsonResponse({
    profiles: enrichedProfiles,
    section_students: sectionStudents || [],
    sessions: visibleSessions,
    session_metrics: metricChunks.flat(),
  });
});
