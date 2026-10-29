-- Remove the earlier design (login-based table and bucket upload rule)
drop table if exists public.id_verifications;
drop policy if exists "upload own id" on storage.objects;

-- A row here means that roll number passed ID verification (written only by the backend)
create table if not exists public.verified_ids (
  roll_number text primary key,
  verified_at timestamptz not null default now()
);

alter table public.verified_ids enable row level security;

drop policy if exists "read verified ids" on public.verified_ids;
create policy "read verified ids" on public.verified_ids
  for select to authenticated using (true);

grant select on public.verified_ids to authenticated;
grant all on public.verified_ids to service_role;

-- Demo accounts: mark verified by hand (say so openly in the demo)
insert into public.verified_ids (roll_number)
select upper(roll_number) from public.student_profiles
where user_id in (select id from auth.users where email like 'demo%@kiit.ac.in')
on conflict do nothing;