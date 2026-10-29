create or replace function public.force_roll_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select upper(split_part(email, '@', 1)) into new.roll_number
  from auth.users where id = new.user_id;
  return new;
end $$;

drop trigger if exists force_roll_number_trg on public.student_profiles;
create trigger force_roll_number_trg
before insert or update of roll_number, user_id on public.student_profiles
for each row execute function public.force_roll_number();