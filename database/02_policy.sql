-- Safe to run more than once: each rule is dropped and recreated.
-- Run after 01_schema.sql.

-- Make sure security is on for every table (safe to repeat)
alter table student_profiles enable row level security;
alter table preferences enable row level security;
alter table listings enable row level security;
alter table likes enable row level security;
alter table reports enable row level security;
alter table bio_embeddings enable row level security;
alter table matches enable row level security;

-- ========== student_profiles ==========
drop policy if exists "Profiles are viewable by everyone" on student_profiles;
drop policy if exists "Profiles are viewable by logged-in users" on student_profiles;
create policy "Profiles are viewable by logged-in users"
on student_profiles for select to authenticated
using (true);

drop policy if exists "Users can insert their own profile" on student_profiles;
create policy "Users can insert their own profile"
on student_profiles for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on student_profiles;
create policy "Users can update their own profile"
on student_profiles for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own profile" on student_profiles;
create policy "Users can delete their own profile"
on student_profiles for delete to authenticated
using (auth.uid() = user_id);

-- ========== preferences ==========
drop policy if exists "Preferences are viewable by everyone" on preferences;
drop policy if exists "Preferences are viewable by logged-in users" on preferences;
create policy "Preferences are viewable by logged-in users"
on preferences for select to authenticated
using (true);

drop policy if exists "Users can insert their own preferences" on preferences;
create policy "Users can insert their own preferences"
on preferences for insert to authenticated
with check (
  auth.uid() = (select user_id from student_profiles where id = profile_id)
);

drop policy if exists "Users can update their own preferences" on preferences;
create policy "Users can update their own preferences"
on preferences for update to authenticated
using (
  auth.uid() = (select user_id from student_profiles where id = profile_id)
)
with check (
  auth.uid() = (select user_id from student_profiles where id = profile_id)
);

-- ========== listings ==========
drop policy if exists "Listings are viewable by everyone" on listings;
drop policy if exists "Listings are viewable by logged-in users" on listings;
create policy "Listings are viewable by logged-in users"
on listings for select to authenticated
using (true);

drop policy if exists "Users can insert their own listings" on listings;
create policy "Users can insert their own listings"
on listings for insert to authenticated
with check (
  auth.uid() = (select user_id from student_profiles where id = profile_id)
);

drop policy if exists "Users can update their own listings" on listings;
create policy "Users can update their own listings"
on listings for update to authenticated
using (
  auth.uid() = (select user_id from student_profiles where id = profile_id)
)
with check (
  auth.uid() = (select user_id from student_profiles where id = profile_id)
);

-- ========== likes ==========
drop policy if exists "Users can see their own likes" on likes;
create policy "Users can see their own likes"
on likes for select to authenticated
using (
  auth.uid() in (
    select user_id from student_profiles
    where id in (liker_profile_id, liked_profile_id)
  )
);

drop policy if exists "Users can like as themselves" on likes;
create policy "Users can like as themselves"
on likes for insert to authenticated
with check (
  auth.uid() = (select user_id from student_profiles where id = liker_profile_id)
);

drop policy if exists "Users can remove their own likes" on likes;
create policy "Users can remove their own likes"
on likes for delete to authenticated
using (
  auth.uid() = (select user_id from student_profiles where id = liker_profile_id)
);

-- ========== reports ==========
drop policy if exists "Users can file their own reports" on reports;
create policy "Users can file their own reports"
on reports for insert to authenticated
with check (
  auth.uid() = (select user_id from student_profiles where id = reporter_profile_id)
);

drop policy if exists "Users can see their own reports" on reports;
create policy "Users can see their own reports"
on reports for select to authenticated
using (
  auth.uid() = (select user_id from student_profiles where id = reporter_profile_id)
);