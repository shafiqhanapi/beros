-- Add "Dining Chair & Table" to Fabric & Leather Care. Paste into Supabase → SQL Editor and Run.
-- Safe to run more than once (updates prices if it already exists).
begin;

insert into public.services (category_id, name, sort_order, active)
select id, 'Dining Chair & Table', 4, true from public.service_categories where name = 'Fabric & Leather Care'
on conflict (category_id, name) do update set active = true, sort_order = excluded.sort_order;

insert into public.service_variants (service_id, name, price, duration_hours, sort_order, active)
select s.id, v.name, v.price, null, v.sort, true
from public.services s
join public.service_categories c on c.id = s.category_id and c.name = 'Fabric & Leather Care'
cross join (values
  ('1–4 Seater', 120, 0),
  ('5–6 Seater', 150, 1),
  ('7–10 Seater', 200, 2),
  ('Add-on: Extra Chair (per pc)', 40, 3),
  ('Add-on: Bench', 60, 4)
) as v(name, price, sort)
where s.name = 'Dining Chair & Table'
on conflict (service_id, name) do update set price = excluded.price, sort_order = excluded.sort_order, active = true;

commit;
