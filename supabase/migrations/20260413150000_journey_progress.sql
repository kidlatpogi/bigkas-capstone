-- Journey progress: server-side completions + profile position for Activity / Dashboard sync.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS journey_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS journey_current_activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.user_activity_completions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS user_activity_completions_user_id_idx
  ON public.user_activity_completions(user_id);

ALTER TABLE public.user_activity_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_activity_completions_select_own" ON public.user_activity_completions;
DROP POLICY IF EXISTS "user_activity_completions_insert_own" ON public.user_activity_completions;

CREATE POLICY "user_activity_completions_select_own"
  ON public.user_activity_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_activity_completions_insert_own"
  ON public.user_activity_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMENT ON COLUMN public.profiles.journey_started_at IS 'First time the user engaged with the Activity journey (set on Activity page).';
COMMENT ON COLUMN public.profiles.journey_current_activity_id IS 'Denormalized pointer to the active activity node (synced from client).';
COMMENT ON TABLE public.user_activity_completions IS 'Completed curriculum activities per user; complements local activity metrics.';
