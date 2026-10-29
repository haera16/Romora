create table if not exists public.hidden_profiles (
  profile_id uuid primary key references public.student_profiles(id) on delete cascade,
  hidden_at timestamptz not null default now()
);

alter table public.hidden_profiles enable row level security;

drop policy if exists "read hidden profiles" on public.hidden_profiles;
create policy "read hidden profiles" on public.hidden_profiles
  for select to authenticated using (true);

grant select on public.hidden_profiles to authenticated;
grant all on public.hidden_profiles to service_role;

-- Runs after every new report. security definer lets it write to hidden_profiles even though users cannot.
create or replace function public.hide_after_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(distinct reporter_profile_id)
    from public.reports
    where reported_profile_id = new.reported_profile_id
      and status <> 'dismissed'
  ) >= 3 then
    insert into public.hidden_profiles (profile_id)
    values (new.reported_profile_id)
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_hide_after_reports on public.reports;
create trigger trg_hide_after_reports
after insert on public.reports
for each row execute function public.hide_after_reports();