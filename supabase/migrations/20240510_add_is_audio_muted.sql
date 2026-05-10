-- Add is_audio_muted column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_audio_muted boolean DEFAULT false;

-- Update the handle_new_user function if it exists to include this default
-- (Optional, usually handled by the column default)
