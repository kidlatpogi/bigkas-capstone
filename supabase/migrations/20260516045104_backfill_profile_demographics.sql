update public.profiles profile
set
  demographic_profile = case
    when auth_user.raw_user_meta_data->'speaker_profile'->'responses' ? 'gender'
      or auth_user.raw_user_meta_data->'speaker_profile'->'responses' ? 'age_range'
    then jsonb_strip_nulls(jsonb_build_object(
      'gender', auth_user.raw_user_meta_data->'speaker_profile'->'responses'->>'gender',
      'age_range', auth_user.raw_user_meta_data->'speaker_profile'->'responses'->>'age_range',
      'completed_at', auth_user.raw_user_meta_data->'speaker_profile'->>'completed_at'
    ))
    else profile.demographic_profile
  end,
  speaker_profile = coalesce(profile.speaker_profile, auth_user.raw_user_meta_data->'speaker_profile')
from auth.users auth_user
where auth_user.id = profile.id
  and auth_user.raw_user_meta_data ? 'speaker_profile'
  and (
    profile.speaker_profile is null
    or profile.demographic_profile is null
  );
