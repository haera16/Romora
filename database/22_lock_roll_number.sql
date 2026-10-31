-- Hide roll_number from the browser. roll_number + @kiit.ac.in is a student's email address.
revoke select, update on public.student_profiles from authenticated;

grant select (id, user_id, username, full_name, year_of_study, branch, gender,
              bio_raw, bio_generated, avatar_seed, created_at, is_verified)
  on public.student_profiles to authenticated;

-- Only these columns can be edited from the browser.
grant update (username, full_name, year_of_study, branch, bio_raw, avatar_seed)
  on public.student_profiles to authenticated;