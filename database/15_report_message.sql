select r.created_at, r.status, r.reason,
       p.full_name as reported_name, p.username, p.roll_number
from public.reports r
join public.student_profiles p on p.id = r.reported_profile_id
where r.status = 'pending'
order by r.created_at desc;