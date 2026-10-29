create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_profile_id uuid not null references student_profiles(id) on delete cascade,
  recipient_profile_id uuid not null references student_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (sender_profile_id <> recipient_profile_id)
);

create index messages_pair_idx
  on public.messages (sender_profile_id, recipient_profile_id, created_at);

alter table public.messages enable row level security;

-- Send only as yourself, and only if both of you have liked each other
create policy "Mutual matches can send messages"
on public.messages for insert to authenticated
with check (
  auth.uid() = (select user_id from student_profiles where id = sender_profile_id)
  and exists (select 1 from likes
              where liker_profile_id = sender_profile_id
                and liked_profile_id = recipient_profile_id)
  and exists (select 1 from likes
              where liker_profile_id = recipient_profile_id
                and liked_profile_id = sender_profile_id)
);

-- Read only conversations you're part of
create policy "Participants can read messages"
on public.messages for select to authenticated
using (
  auth.uid() in (
    select user_id from student_profiles
    where id in (sender_profile_id, recipient_profile_id)
  )
);

grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;

-- Live updates (Realtime respects the select policy above)
alter publication supabase_realtime add table public.messages;