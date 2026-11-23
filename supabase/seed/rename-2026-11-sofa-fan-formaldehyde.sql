-- Rename three catalogue items. Paste into Supabase → SQL Editor and Run.
-- Renames in place, so prices, crew/cost figures and past bookings keep their links.
-- Safe to run more than once.
begin;

update public.services set name = 'Formaldehyde Removal (New)'
where name = 'Formaldehyde Removal';

update public.service_variants v set name = 'Standard (per pc)'
from public.services s
where v.service_id = s.id and s.name = 'Fan Cleaning' and v.name = 'Standard';

update public.service_variants v set name = '3–5 Seater ' || v.name
from public.services s
where v.service_id = s.id and s.name = 'Sofa Cleaning'
  and v.name in ('L-Shape – Small', 'L-Shape – Big', 'U-Shape');

commit;
