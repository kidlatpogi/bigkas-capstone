DO $$
DECLARE
    i INT;
    new_user_id UUID;
BEGIN
    -- Remove any previously created dummy student accounts to prevent duplicate key errors
    DELETE FROM auth.users WHERE email LIKE 'student%@example.com';

    FOR i IN 1..50 LOOP
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
            'student' || lpad(i::text, 2, '0') || '@example.com',
            crypt('@Admin321', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('firstName', 'Student', 'lastName', lpad(i::text, 2, '0'), 'nickname', 'S' || lpad(i::text, 2, '0')),
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
