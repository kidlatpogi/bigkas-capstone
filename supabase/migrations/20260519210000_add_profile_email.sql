alter table public.profiles
  add column if not exists email text;

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where profile.id = auth_user.id
  and auth_user.email is not null
  and (profile.email is null or btrim(profile.email) = '');

create index if not exists profiles_lower_email_idx
  on public.profiles (lower(email))
  where email is not null;
