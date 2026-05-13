-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  badge_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  unlock_description text,
  unlock_requirements jsonb,
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_level integer NOT NULL DEFAULT 1 CHECK (target_level >= 1 AND target_level <= 5),
  activity_order integer NOT NULL,
  phase_name text,
  title text,
  objective text NOT NULL,
  purpose text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT activities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.login_attempt_guards (
  email text NOT NULL,
  failed_attempts integer DEFAULT 0,
  lockout_until timestamp with time zone,
  last_attempt_at timestamp with time zone DEFAULT now(),
  CONSTRAINT login_attempt_guards_pkey PRIMARY KEY (email)
);
CREATE TABLE public.modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  level_number integer NOT NULL CHECK (level_number >= 0 AND level_number <= 5),
  level_name text NOT NULL,
  lesson_number text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  date_started timestamp with time zone,
  date_ended timestamp with time zone,
  CONSTRAINT modules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  username text UNIQUE,
  avatar_url text,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'superadmin'::text])),
  speaker_points integer NOT NULL DEFAULT 0,
  speaker_points_updated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  current_level integer NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 5),
  journey_started_at timestamp with time zone,
  journey_current_activity_id uuid,
  diagnostic_score double precision DEFAULT 1.0,
  diagnostic_completed_at timestamp with time zone,
  archived_at timestamp with time zone,
  is_profiling_completed boolean DEFAULT false,
  is_pre_test_completed boolean DEFAULT false,
  dashboard_tutorial_seen boolean DEFAULT false,
  active_banner_id text DEFAULT 'default_skyward'::text,
  unlocked_banners ARRAY DEFAULT ARRAY['default_skyward'::text],
  current_streak integer DEFAULT 0,
  last_streak_update timestamp with time zone,
  speaker_level integer DEFAULT 1,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.session_feedback (
  session_id uuid NOT NULL,
  general_feedback text,
  detailed_feedback text,
  CONSTRAINT session_feedback_pkey PRIMARY KEY (session_id),
  CONSTRAINT session_feedback_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.session_media (
  session_id uuid NOT NULL,
  audio_url text,
  transcript text DEFAULT ''::text,
  video_storage_url text,
  CONSTRAINT session_media_pkey PRIMARY KEY (session_id),
  CONSTRAINT session_media_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.session_metrics (
  session_id uuid NOT NULL,
  overall_score numeric DEFAULT 0,
  verbal_score numeric DEFAULT 0,
  vocal_score numeric DEFAULT 0,
  pronunciation_score numeric DEFAULT 0,
  jitter numeric,
  shimmer numeric,
  visual_score numeric DEFAULT 0,
  eye_contact_score numeric,
  gesture_score numeric,
  confidence_score numeric DEFAULT 0,
  visual_avg double precision DEFAULT 0,
  vocal_avg double precision DEFAULT 0,
  verbal_avg double precision DEFAULT 0,
  CONSTRAINT session_metrics_pkey PRIMARY KEY (session_id),
  CONSTRAINT session_metrics_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.session_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  recommendation_text text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT session_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT session_recommendations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  error_message text,
  difficulty text,
  session_mode text CHECK (session_mode = ANY (ARRAY['activity'::text, 'randomizer'::text, 'free_speech'::text])),
  session_origin text DEFAULT 'training'::text CHECK (session_origin = ANY (ARRAY['training'::text, 'practice'::text, 'pre-test'::text])),
  speaking_mode text,
  source text DEFAULT 'web'::text CHECK (source = ANY (ARRAY['web'::text, 'mobile'::text, 'unknown'::text])),
  duration integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  activity_id uuid,
  topic text,
  entry_point text,
  recovery_streak_target integer,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.system_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  unlocked_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
);
CREATE TABLE public.user_activity_completions (
  user_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_activity_completions_pkey PRIMARY KEY (user_id, activity_id),
  CONSTRAINT user_activity_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);