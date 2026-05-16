alter table public.profiles
  add column if not exists demographic_profile jsonb,
  add column if not exists speaker_profile jsonb;

create table if not exists public.module_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  viewed_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists module_views_module_id_idx on public.module_views(module_id);
create index if not exists module_views_user_id_idx on public.module_views(user_id);
create index if not exists module_views_viewed_at_idx on public.module_views(viewed_at);

alter table public.module_views enable row level security;

drop policy if exists "Users can record their own module views" on public.module_views;
create policy "Users can record their own module views"
on public.module_views
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can view their own module views" on public.module_views;
create policy "Users can view their own module views"
on public.module_views
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can view all module views" on public.module_views;
create policy "Admins can view all module views"
on public.module_views
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role in ('admin', 'superadmin')
      and admin_profile.archived_at is null
  )
);

drop policy if exists "Admins can view all activity completions" on public.user_activity_completions;
create policy "Admins can view all activity completions"
on public.user_activity_completions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role in ('admin', 'superadmin')
      and admin_profile.archived_at is null
  )
);
