-- 1. Enable RLS for system_settings (Policies already exist based on lint report)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS for activities and add public read policy
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'activities' AND policyname = 'Allow public read access to activities'
    ) THEN
        CREATE POLICY "Allow public read access to activities"
        ON public.activities FOR SELECT
        USING (true);
    END IF;
END $$;

-- 3. Fix Security Definer View to use Security Invoker
ALTER VIEW public.user_improvement_stats SET (security_invoker = on);

-- 4. Harden functions by fixing search_path (Security Best Practice)
ALTER FUNCTION public.update_modified_column() SET search_path = public;
ALTER FUNCTION public.login_guard_email_hash(text) SET search_path = public;
ALTER FUNCTION public.login_guard_check(text, text) SET search_path = public;
ALTER FUNCTION public.login_guard_register_failure(text, text) SET search_path = public;
ALTER FUNCTION public.login_guard_register_success(text, text) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.log_session_created() SET search_path = public;
ALTER FUNCTION public.cleanup_old_sessions_and_recordings(integer) SET search_path = public;

-- 5. Revoke execution from PUBLIC, anon, and authenticated for INTERNAL SECURITY DEFINER functions
-- This prevents them from being callable via the PostgREST RPC API.
DO $$
DECLARE
    func_record record;
BEGIN
    FOR func_record IN 
        SELECT routine_name, routine_schema
        FROM information_schema.routines 
        WHERE routine_name IN (
            'cleanup_old_sessions_and_recordings',
            'handle_new_user',
            'log_session_created'
        ) AND routine_schema = 'public'
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I FROM PUBLIC, anon, authenticated;', func_record.routine_schema, func_record.routine_name);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I TO service_role;', func_record.routine_schema, func_record.routine_name);
    END LOOP;
END $$;

-- 6. Ensure Login Guard functions are executable by public (required for login flow)
-- Even though the linter warns about this, these MUST be public to protect the login page.
-- We keep the 'SET search_path = public' fix from step 4 for security.
GRANT EXECUTE ON FUNCTION public.login_guard_check(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_guard_register_failure(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_guard_register_success(text, text) TO anon, authenticated;

-- 7. Storage: Harden 'avatars' bucket policies
-- Broad SELECT policies on storage.objects allow listing all files. 
-- We replace them with a narrow bucket-specific policy.
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to download avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;

-- Note: If the bucket is already 'Public', you might not even need a SELECT policy 
-- for public URL access. We add a restricted one just in case.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Restricted public access to avatars'
    ) THEN
        CREATE POLICY "Restricted public access to avatars"
        ON storage.objects FOR SELECT
        TO public
        USING ( bucket_id = 'avatars' );
    END IF;
END $$;

-- 7. Add RLS Policies for tables with RLS enabled but no policies
-- Session Recommendations: Users can view recommendations for their own sessions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'session_recommendations' AND policyname = 'Users can view their own recommendations'
    ) THEN
        CREATE POLICY "Users can view their own recommendations"
        ON public.session_recommendations FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.sessions
                WHERE sessions.id = session_recommendations.session_id
                AND sessions.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Login Attempt Guards: Internal use only
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'login_attempt_guards' AND policyname = 'Service role has full access'
    ) THEN
        CREATE POLICY "Service role has full access"
        ON public.login_attempt_guards FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Achievements: Publicly readable
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'achievements' AND policyname = 'Allow public read access to achievements'
    ) THEN
        CREATE POLICY "Allow public read access to achievements"
        ON public.achievements FOR SELECT
        USING (true);
    END IF;
END $$;

-- User Achievements: Users can view their own unlocked badges
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' AND policyname = 'Users can view their own achievements'
    ) THEN
        CREATE POLICY "Users can view their own achievements"
        ON public.user_achievements FOR SELECT
        USING (user_id = auth.uid());
    END IF;
END $$;
