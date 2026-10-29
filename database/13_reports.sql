-- ONE-TIME MIGRATION. Do NOT rerun: drops all reports.
drop table if exists public.reports cascade;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references student_profiles(id) on delete cascade,
  reported_profile_id uuid not null references student_profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  status report_status not null default 'pending',
  created_at timestamp not null default now(),
  check (reporter_profile_id <> reported_profile_id),
  unique (reporter_profile_id, reported_profile_id)
);

alter table public.reports enable row level security;

create policy "Users can file their own reports"
on public.reports for insert to authenticated
with check (
  auth.uid() = (select user_id from student_profiles where id = reporter_profile_id)
);

create policy "Users can see their own reports"
on public.reports for select to authenticated
using (
  auth.uid() = (select user_id from student_profiles where id = reporter_profile_id)
);

grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;