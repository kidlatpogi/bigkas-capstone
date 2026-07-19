DO $$
DECLARE
    i INT;
    new_user_id UUID;
BEGIN
    -- Clean up all dependent records first to prevent foreign key issues
    DELETE FROM public.session_recommendations WHERE session_id IN (SELECT id FROM public.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) LIKE 'student%@example.com'));
    DELETE FROM public.session_feedback WHERE session_id IN (SELECT id FROM public.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) LIKE 'student%@example.com'));
    DELETE FROM public.session_media WHERE session_id IN (SELECT id FROM public.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) LIKE 'student%@example.com'));
    DELETE FROM public.session_metrics WHERE session_id IN (SELECT id FROM public.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) LIKE 'student%@example.com'));
    DELETE FROM public.sessions WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) LIKE 'student%@example.com');
    DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE LOWER(email) LIKE 'student%@example.com');
    DELETE FROM auth.users WHERE LOWER(email) LIKE 'student%@example.com';

    FOR i IN 1..100 LOOP
        new_user_id := gen_random_uuid();
        
        -- Insert into auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'student' || (case when i = 100 then '100' else lpad(i::text, 2, '0') end) || '@example.com',
            crypt('@Admin321', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('firstName', 'Student', 'lastName', (case when i = 100 then '100' else lpad(i::text, 2, '0') end), 'nickname', 'S' || (case when i = 100 then '100' else lpad(i::text, 2, '0') end)),
            now(),
            now(),
            '',
            '',
            '',
            ''
        );
        
        -- The public.profiles table is automatically populated if you have a trigger on auth.users,
        -- but if you don't, you can optionally insert it here. Assuming trigger handles it.
    END LOOP;
END $$;
