-- BEROS service catalogue — pricing review Nov 2026
-- Source: Figma "BEROS – Pricing & Margin Review (Nov 2026)", page "Current prices (cost breakdown)".
--
-- Paste into Supabase → SQL Editor and Run. Works on an empty catalogue and on
-- the earlier catalogue (service-catalogue.csv): existing categories, services
-- and variants are renamed / moved in place, so past bookings keep their links.
-- Items no longer offered are switched off (hidden from new bookings), never
-- deleted. Safe to run more than once.
--
-- Durations are hours on site per the review's "Crew × hours" column
-- (e.g. "4 × 5 hrs" → 5). Rentals, transport fees and free services have none.

begin;

-- Helpers (temporary: they disappear when the session ends) ------------------

-- Find a category by its new name or any old name; rename it, or create it.
create or replace function pg_temp.ensure_category(p_name text, p_sort int, p_old text[] default '{}')
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from public.service_categories where name = p_name;
  if v_id is null then
    select id into v_id from public.service_categories where name = any(p_old) order by array_position(p_old, name) limit 1;
  end if;
  if v_id is null then
    insert into public.service_categories (name, sort_order, active) values (p_name, p_sort, true) returning id into v_id;
  else
    update public.service_categories set name = p_name, sort_order = p_sort, active = true where id = v_id;
  end if;
  return v_id;
end $$;

-- Find a service (in any category) by its new name or an old name; rename and
-- move it into p_cat, or create it.
create or replace function pg_temp.ensure_service(p_cat text, p_name text, p_sort int, p_old text[] default '{}')
returns uuid language plpgsql as $$
declare v_cat uuid; v_id uuid;
begin
  select id into v_cat from public.service_categories where name = p_cat;
  select id into v_id from public.services where category_id = v_cat and name = p_name;
  if v_id is null then
    select id into v_id from public.services where name = p_name order by active desc limit 1;
  end if;
  if v_id is null then
    select id into v_id from public.services where name = any(p_old) order by array_position(p_old, name), active desc limit 1;
  end if;
  if v_id is null then
    insert into public.services (category_id, name, sort_order, active) values (v_cat, p_name, p_sort, true) returning id into v_id;
  else
    update public.services set category_id = v_cat, name = p_name, sort_order = p_sort, active = true where id = v_id;
  end if;
  return v_id;
end $$;

-- Find a variant of the service by its new name or an old name; update it, or create it.
create or replace function pg_temp.ensure_variant(p_cat text, p_service text, p_name text, p_price numeric, p_hours numeric, p_sort int, p_old text[] default '{}')
returns void language plpgsql as $$
declare v_svc uuid; v_id uuid;
begin
  select s.id into v_svc from public.services s join public.service_categories c on c.id = s.category_id
  where c.name = p_cat and s.name = p_service;
  select id into v_id from public.service_variants where service_id = v_svc and name = p_name;
  if v_id is null then
    select id into v_id from public.service_variants where service_id = v_svc and name = any(p_old)
    order by array_position(p_old, name) limit 1;
  end if;
  if v_id is null then
    insert into public.service_variants (service_id, name, price, duration_hours, active, sort_order)
    values (v_svc, p_name, p_price, p_hours, true, p_sort);
  else
    update public.service_variants
    set name = p_name, price = p_price, duration_hours = p_hours, active = true, sort_order = p_sort
    where id = v_id;
  end if;
end $$;

-- 1. Categories ---------------------------------------------------------------

select pg_temp.ensure_category('Moving In BTO Flats', 0, array['Post-Renovation']);
select pg_temp.ensure_category('Fabric & Leather Care', 1, array['Fabric & Upholstery']);
select pg_temp.ensure_category('Car & Baby Gear (Pick Up & Delivery)', 2, array['Car & Baby Gear', 'Baby Gear']);
select pg_temp.ensure_category('Equipment Rental (Per Day)', 3, array['Equipment Rental']);
select pg_temp.ensure_category('Transportation Fees & Free Services', 4);

-- 2. Moving In BTO Flats ------------------------------------------------------

select pg_temp.ensure_service('Moving In BTO Flats', 'Post Renovation Cleaning', 0);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Post Renovation Cleaning', '2-Room Flexi',    370, 2.5, 0);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Post Renovation Cleaning', '2-Room Standard', 390, 2.5, 1);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Post Renovation Cleaning', '3-Room',          460, 3,   2);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Post Renovation Cleaning', '4-Room',          560, 5,   3);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Post Renovation Cleaning', '5-Room',          650, 5,   4);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Post Renovation Cleaning', 'Jumbo / EA',      840, 6,   5);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Post Renovation Cleaning', 'Maisonette',      920, 6,   6);

select pg_temp.ensure_service('Moving In BTO Flats', 'Formaldehyde Removal (New)', 1, array['Formaldehyde Removal']);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Formaldehyde Removal (New)', '2-Room Flexi',    250, 1.5, 0);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Formaldehyde Removal (New)', '2-Room Standard', 250, 1.5, 1);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Formaldehyde Removal (New)', '3-Room',          295, 2,   2);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Formaldehyde Removal (New)', '4-Room',          340, 2.5, 3);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Formaldehyde Removal (New)', '5-Room',          380, 3,   4);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Formaldehyde Removal (New)', 'Jumbo / EA',      430, 3.5, 5);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Formaldehyde Removal (New)', 'Maisonette',      430, 3.5, 6);

select pg_temp.ensure_service('Moving In BTO Flats', 'Floor Tile Scrubbing', 2);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Floor Tile Scrubbing', '2-Room Flexi',    230, 2,   0);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Floor Tile Scrubbing', '2-Room Standard', 230, 2,   1);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Floor Tile Scrubbing', '3-Room',          330, 3,   2);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Floor Tile Scrubbing', '4-Room',          380, 3.5, 3);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Floor Tile Scrubbing', '5-Room',          430, 4,   4);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Floor Tile Scrubbing', 'Jumbo / EA',      480, 4.5, 5);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Floor Tile Scrubbing', 'Maisonette',      530, 5,   6);

select pg_temp.ensure_service('Moving In BTO Flats', 'Paint Stain Removal', 3);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Paint Stain Removal', '2 hrs',       160, 2, 0);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Paint Stain Removal', '4 hrs',       320, 4, 1);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Paint Stain Removal', '6 hrs (max)', 480, 6, 2);

select pg_temp.ensure_service('Moving In BTO Flats', 'Window Cleaning', 4);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Window Cleaning', 'Bedrooms',         180, 2.5, 0);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Window Cleaning', 'Flat Living Room', 240, 2.5, 1);

select pg_temp.ensure_service('Moving In BTO Flats', 'Fan Cleaning', 5);
select pg_temp.ensure_variant('Moving In BTO Flats', 'Fan Cleaning', 'Standard (per pc)', 120, 1.5, 0, array['Standard']);

-- 3. Fabric & Leather Care ----------------------------------------------------

select pg_temp.ensure_service('Fabric & Leather Care', 'Sofa Cleaning', 0);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '1–3 Seater – Small',  120, 1.5, 0);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '1–3 Seater – Big',    150, 1.5, 1);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '4–5 Seater – Small',  180, 2.5, 2);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '4–5 Seater – Big',    210, 2.5, 3);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '6–9 Seater – Small',  250, 3.5, 4);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '6–9 Seater – Big',    290, 3.5, 5);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '3–5 Seater L-Shape – Small', 200, 2.5, 6, array['L-Shape – Small']);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '3–5 Seater L-Shape – Big',   270, 3.5, 7, array['L-Shape – Big']);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', '3–5 Seater U-Shape',         320, 3.5, 8, array['U-Shape']);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Sofa Cleaning', 'Ottoman / Footstool',  50, 0.5, 9);

select pg_temp.ensure_service('Fabric & Leather Care', 'Carpet Cleaning', 1);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Carpet Cleaning', 'Up to 250cm',    120, 1.5, 0, array['Up to 250cm - Standard']);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Carpet Cleaning', 'Up to 300cm',    150, 2,   1, array['Up to 300cm - Large']);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Carpet Cleaning', 'Up to 350cm',    180, 2,   2, array['Up to 350cm - Extra Large']);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Carpet Cleaning', 'Kitchen Runner', 110, 1.5, 3);

select pg_temp.ensure_service('Fabric & Leather Care', 'Mattress Cleaning', 2);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Mattress Cleaning', 'Baby Cot Mattress',     110, 1.5, 0);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Mattress Cleaning', 'Single / Super Single', 120, 1.5, 1);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Mattress Cleaning', 'Queen / King',          150, 1.5, 2);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Mattress Cleaning', 'Baby Cot',              120, 1,   3);

select pg_temp.ensure_service('Fabric & Leather Care', 'Curtain Steam Cleaning', 3, array['Curtain Cleaning']);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Curtain Steam Cleaning', 'Curtains (per pc)', 150, 0.5, 0, array['Curtains – Steam Clean (per pc)']);
select pg_temp.ensure_variant('Fabric & Leather Care', 'Curtain Steam Cleaning', 'Blinds (per pc)',   180, 0.5, 1);

-- 4. Car & Baby Gear (pick up & delivery) -------------------------------------

select pg_temp.ensure_service('Car & Baby Gear (Pick Up & Delivery)', 'Car Mat Cleaning', 0);
select pg_temp.ensure_variant('Car & Baby Gear (Pick Up & Delivery)', 'Car Mat Cleaning', '2–4 Seater', 120, 1,   0);
select pg_temp.ensure_variant('Car & Baby Gear (Pick Up & Delivery)', 'Car Mat Cleaning', '5–7 Seater', 150, 1.5, 1);

select pg_temp.ensure_service('Car & Baby Gear (Pick Up & Delivery)', 'Baby Gear Cleaning', 1, array['Strollers/Cot Cleaning']);
select pg_temp.ensure_variant('Car & Baby Gear (Pick Up & Delivery)', 'Baby Gear Cleaning', 'Car Baby Seat', 85, 1, 0);
select pg_temp.ensure_variant('Car & Baby Gear (Pick Up & Delivery)', 'Baby Gear Cleaning', 'Stroller',      95, 1, 1);

-- 5. Equipment Rental (per day, includes delivery and pick-up) -----------------

select pg_temp.ensure_service('Equipment Rental (Per Day)', 'Floor Scrubber', 0, array['Rental - Floor Scrubber']);
select pg_temp.ensure_variant('Equipment Rental (Per Day)', 'Floor Scrubber', 'Per day', 300, null, 0, array['Base rate']);
select pg_temp.ensure_service('Equipment Rental (Per Day)', 'Extraction Cleaner Puzzi 10/1', 1, array['Rental - Extraction Cleaner Puzzi 10/1']);
select pg_temp.ensure_variant('Equipment Rental (Per Day)', 'Extraction Cleaner Puzzi 10/1', 'Per day', 110, null, 0, array['Base rate']);
select pg_temp.ensure_service('Equipment Rental (Per Day)', 'Steam Cleaner SC2', 2, array['Rental - Steam Cleaner SC2']);
select pg_temp.ensure_variant('Equipment Rental (Per Day)', 'Steam Cleaner SC2', 'Per day', 90, null, 0, array['Base rate']);
select pg_temp.ensure_service('Equipment Rental (Per Day)', 'Pressure Washer K2', 3, array['Rental - Pressure Washer K2']);
select pg_temp.ensure_variant('Equipment Rental (Per Day)', 'Pressure Washer K2', 'Per day', 65, null, 0, array['Base rate']);
select pg_temp.ensure_service('Equipment Rental (Per Day)', 'Wet & Dry Vacuum WD 1', 4, array['Rental - Wet & Dry Vacuum WD 1']);
select pg_temp.ensure_variant('Equipment Rental (Per Day)', 'Wet & Dry Vacuum WD 1', 'Per day', 60, null, 0, array['Base rate']);
select pg_temp.ensure_service('Equipment Rental (Per Day)', 'Floor Dryer', 5);
select pg_temp.ensure_variant('Equipment Rental (Per Day)', 'Floor Dryer', 'Per day', 60, null, 0);

-- 6. Transportation Fees & Free Services --------------------------------------

select pg_temp.ensure_service('Transportation Fees & Free Services', 'Transportation Fee', 0);
select pg_temp.ensure_variant('Transportation Fees & Free Services', 'Transportation Fee', 'One way', 10, null, 0);
select pg_temp.ensure_variant('Transportation Fees & Free Services', 'Transportation Fee', 'Two way', 20, null, 1);

select pg_temp.ensure_service('Transportation Fees & Free Services', 'Free Services', 1);
select pg_temp.ensure_variant('Transportation Fees & Free Services', 'Free Services', 'Air Quality Check',     0, null, 0);
select pg_temp.ensure_variant('Transportation Fees & Free Services', 'Free Services', 'Request for Quotation', 0, null, 1);
select pg_temp.ensure_variant('Transportation Fees & Free Services', 'Free Services', 'Cleaning Consultation', 0, null, 2);
select pg_temp.ensure_variant('Transportation Fees & Free Services', 'Free Services', 'Site Visit',            0, null, 3);

-- 7. Add-ons ($25 per item, fabric & leather jobs) ----------------------------

update public.add_ons set name = 'Fabric Protection Spray'
where name = 'Fabric Protector Spray' and not exists (select 1 from public.add_ons where name = 'Fabric Protection Spray');
insert into public.add_ons (category_id, name, price, sort_order, active)
select c.id, a.name, 25, a.sort, true
from public.service_categories c, (values ('Fabric Protection Spray', 0), ('Disinfect & Sanitize', 1)) as a(name, sort)
where c.name = 'Fabric & Leather Care'
on conflict (name) do update set category_id = excluded.category_id, price = excluded.price, sort_order = excluded.sort_order, active = true;

-- 8. No longer offered: switch off (kept for past bookings) ------------------

-- Car fumigation was removed; its old "Car Mat Cleaning" option is replaced by
-- the new Car Mat Cleaning service.
update public.services set active = false where name = 'Car Fumigation & Interior Deep Cleaning';
update public.service_variants set active = false
where service_id in (select id from public.services where name = 'Car Fumigation & Interior Deep Cleaning');

-- Baby cot cleaning moved to Mattress Cleaning.
update public.service_variants set active = false
where name = 'Baby Cot' and service_id in (select id from public.services where name = 'Baby Gear Cleaning');

-- Any other option of a reviewed service that isn't on the new price list.
update public.service_variants v set active = false
from public.services s
where v.service_id = s.id
  and s.name in ('Sofa Cleaning', 'Carpet Cleaning', 'Mattress Cleaning', 'Curtain Steam Cleaning')
  and v.name not in (
    '1–3 Seater – Small', '1–3 Seater – Big', '4–5 Seater – Small', '4–5 Seater – Big', '6–9 Seater – Small',
    '6–9 Seater – Big', '3–5 Seater L-Shape – Small', '3–5 Seater L-Shape – Big', '3–5 Seater U-Shape', 'Ottoman / Footstool',
    'Up to 250cm', 'Up to 300cm', 'Up to 350cm', 'Kitchen Runner',
    'Baby Cot Mattress', 'Single / Super Single', 'Queen / King', 'Baby Cot',
    'Curtains (per pc)', 'Blinds (per pc)');

-- Old categories that are now empty (Home → Moving In BTO Flats, Car → Car & Baby Gear).
update public.service_categories c set active = false, sort_order = 99
where c.name not in ('Moving In BTO Flats', 'Fabric & Leather Care', 'Car & Baby Gear (Pick Up & Delivery)', 'Equipment Rental (Per Day)', 'Transportation Fees & Free Services')
  and not exists (select 1 from public.services s where s.category_id = c.id and s.active);

commit;
