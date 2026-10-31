drop trigger if exists trg_lock_profile_identity on public.student_profiles;
create trigger trg_lock_profile_identity
before update on public.student_profiles
for each row execute function public.lock_profile_identity();