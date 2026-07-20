-- Ensure public.system_settings table exists for global admin toggles (e.g., multi_account_parallel_sessions)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public and authenticated users to read system_settings (to check active security policies)
DROP POLICY IF EXISTS "Allow public read system_settings" ON public.system_settings;
CREATE POLICY "Allow public read system_settings" ON public.system_settings
  FOR SELECT USING (true);

-- Allow all for admin/service roles or authenticated mutations
DROP POLICY IF EXISTS "Allow admin all system_settings" ON public.system_settings;
CREATE POLICY "Allow admin all system_settings" ON public.system_settings
  FOR ALL USING (true);

INSERT INTO public.system_settings (key, value)
VALUES ('multi_account_parallel_sessions', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add active_device_fingerprint to profiles to track physical device client instances for strict device lock mode
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_device_fingerprint TEXT;
