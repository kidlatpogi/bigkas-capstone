-- Run this migration in Supabase SQL editor before deploying media changes.
alter table public.session_media
add column if not exists video_storage_url text;

comment on column public.session_media.video_storage_url
is 'Public URL or bucket-relative path of the video recording stored in session-recordings.';
