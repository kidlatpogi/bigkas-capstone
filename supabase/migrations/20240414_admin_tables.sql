-- 1. Create audit_logs table 
CREATE TABLE IF NOT EXISTS public.audit_logs ( 
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

-- Enable RLS for audit_logs 
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY; 

-- 🚨 FIX 1: ONLY Superadmins can READ the audit logs 
CREATE POLICY "Superadmins can view audit logs" 
  ON public.audit_logs 
  FOR SELECT 
  TO authenticated 
  USING ( 
    EXISTS ( 
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin' -- Changed from 'admin' 
    ) 
  ); 

-- 🚨 NEW: Allow Admins and Superadmins to WRITE (Insert) audit logs 
-- Notice we use "WITH CHECK" for inserts, and NO policy is created for UPDATE or DELETE 
CREATE POLICY "Admins and Superadmins can insert audit logs" 
  ON public.audit_logs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK ( 
    EXISTS ( 
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin') 
    ) 
  ); 

-- 2. Create system_settings table 
CREATE TABLE IF NOT EXISTS public.system_settings ( 
  key text NOT NULL, 
  value jsonb NOT NULL, 
  description text, 
  updated_by uuid, 
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()), 
  
  CONSTRAINT system_settings_pkey PRIMARY KEY (key), 
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) 
); 

-- Enable RLS for system_settings 
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY; 

-- Allow everyone to read system settings (Required so the frontend knows if maintenance mode is on) 
CREATE POLICY "Everyone can read system settings" 
  ON public.system_settings 
  FOR SELECT 
  TO public 
  USING (true); 

-- 🚨 FIX 2: ONLY Superadmins can MANAGE (Insert/Update/Delete) system settings 
CREATE POLICY "Superadmins can manage system settings" 
  ON public.system_settings 
  FOR ALL 
  TO authenticated 
  USING ( 
    EXISTS ( 
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin' -- Changed from 'admin' 
    ) 
  ); 
