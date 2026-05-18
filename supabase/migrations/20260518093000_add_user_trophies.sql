create table if not exists public.user_trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trophy_level integer not null check (trophy_level between 1 and 5),
  claimed_at timestamp with time zone not null default timezone('utc'::text, now()),
  is_featured boolean not null default false,
  unique (user_id, trophy_level)
);

create unique index if not exists user_trophies_one_featured_per_user_idx
on public.user_trophies (user_id)
where is_featured;

create index if not exists user_trophies_user_id_idx
on public.user_trophies (user_id);

alter table public.user_trophies enable row level security;

drop policy if exists "Users can view their own trophies" on public.user_trophies;
create policy "Users can view their own trophies"
on public.user_trophies
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can view all trophies" on public.user_trophies;
create policy "Admins can view all trophies"
on public.user_trophies
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

create or replace function public.claim_user_trophy(p_trophy_level integer)
returns table (
  trophy_level integer,
  claimed_at timestamp with time zone,
  is_featured boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total_stages integer;
  v_completed_stages integer;
  v_has_featured boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  if p_trophy_level is null or p_trophy_level < 1 or p_trophy_level > 5 then
    raise exception 'Invalid trophy level.' using errcode = '22023';
  end if;

  select count(*)
  into v_total_stages
  from public.activities
  where target_level = p_trophy_level;

  select count(distinct completions.activity_id)
  into v_completed_stages
  from public.user_activity_completions completions
  join public.activities activity
    on activity.id = completions.activity_id
  where completions.user_id = v_user_id
    and activity.target_level = p_trophy_level;

  if coalesce(v_total_stages, 0) <= 0 or coalesce(v_completed_stages, 0) < v_total_stages then
    raise exception 'Complete all stages in this journey before claiming the trophy.' using errcode = 'P0001';
  end if;

  insert into public.user_trophies (user_id, trophy_level)
  values (v_user_id, p_trophy_level)
  on conflict (user_id, trophy_level) do nothing;

  select exists (
    select 1
    from public.user_trophies
    where user_id = v_user_id
      and is_featured = true
  )
  into v_has_featured;

  if not v_has_featured then
    update public.user_trophies
    set is_featured = true
    where user_id = v_user_id
      and trophy_level = p_trophy_level;
  end if;

  return query
  select
    trophies.trophy_level,
    trophies.claimed_at,
    trophies.is_featured
  from public.user_trophies trophies
  where trophies.user_id = v_user_id
  order by trophies.trophy_level asc;
end;
$$;

create or replace function public.set_featured_user_trophy(p_trophy_level integer)
returns table (
  trophy_level integer,
  claimed_at timestamp with time zone,
  is_featured boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.user_trophies
    where user_id = v_user_id
      and trophy_level = p_trophy_level
  ) then
    raise exception 'Claim this trophy before featuring it.' using errcode = 'P0001';
  end if;

  update public.user_trophies
  set is_featured = false
  where user_id = v_user_id
    and is_featured = true;

  update public.user_trophies
  set is_featured = true
  where user_id = v_user_id
    and trophy_level = p_trophy_level;

  return query
  select
    trophies.trophy_level,
    trophies.claimed_at,
    trophies.is_featured
  from public.user_trophies trophies
  where trophies.user_id = v_user_id
  order by trophies.trophy_level asc;
end;
$$;

revoke all on function public.claim_user_trophy(integer) from public, anon;
revoke all on function public.set_featured_user_trophy(integer) from public, anon;
grant execute on function public.claim_user_trophy(integer) to authenticated;
grant execute on function public.set_featured_user_trophy(integer) to authenticated;
