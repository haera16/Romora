-- 17_undo_hide.sql
-- NOT part of the build. Run ONLY for a confirmed false report.
-- 1) Replace both PASTE-PROFILE-ID values with the profile's id.
-- 2) Run both statements together, otherwise the trigger hides the profile again on the next report.

delete from public.hidden_profiles where profile_id = 'PASTE-PROFILE-ID';
update public.reports set status = 'dismissed' where reported_profile_id = 'PASTE-PROFILE-ID';