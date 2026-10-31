-- Verified flag on the profile. Users cannot set or change it.
alter table public.student_profiles
  add column if not exists is_verified boolean not null default false;

-- On profile creation, compute the flag from verified_ids (overrides anything the browser sends).
-- Named zz_ so it runs after the trigger that forces roll_number from the email.
create or replace function public.set_is_verified_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_verified := exists (
    select 1 from public.verified_ids v where v.roll_number = new.roll_number
  );
  return new;
end $$;

drop trigger if exists zz_set_is_verified on public.student_profiles;
create trigger zz_set_is_verified
before insert on public.student_profiles
for each row execute function public.set_is_verified_on_insert();

-- When a roll number is verified (or re-verified), mark the matching profile
create or replace function public.mark_profile_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.student_profiles set is_verified = true where roll_number = new.roll_number;
  return new;
end $$;

drop trigger if exists trg_mark_profile_verified on public.verified_ids;
create trigger trg_mark_profile_verified
after insert or update on public.verified_ids
for each row execute function public.mark_profile_verified();

-- Lock the identity columns, now including is_verified
create or replace function public.lock_profile_identity()
returns trigger
language plpgsql
as $$
begin
  -- Only blocks changes made through the API by logged-in users.
  -- The SQL Editor (postgres) and the backend (service_role) are not affected.
  if current_user in ('authenticated', 'anon') then
    if new.gender is distinct from old.gender then
      raise exception 'Gender cannot be changed.';
    end if;
    if new.roll_number is distinct from old.roll_number then
      raise exception 'Roll number cannot be changed.';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception 'Account link cannot be changed.';
    end if;
    if new.is_verified is distinct from old.is_verified then
      raise exception 'Verification status cannot be changed.';
    end if;
  end if;
  return new;
end $$;

-- Fill the flag for profiles that already exist
update public.student_profiles
set is_verified = true
where roll_number in (select roll_number from public.verified_ids);