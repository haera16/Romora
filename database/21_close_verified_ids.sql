drop policy if exists "read verified ids" on public.verified_ids;
revoke select on public.verified_ids from authenticated;