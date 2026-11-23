-- Crew size and cost per job for each price option (admin only).
-- Source: Figma "BEROS – Pricing & Margin Review (Nov 2026)": "Crew × hours" and
-- "Total cost" (labour + transport + materials; marketing and payment fees excluded).
-- The admin catalogue shows margin = (price − cost) ÷ price.
--
-- Kept in its own table because every signed-in crew member can read the
-- catalogue; costs and margins are visible to admins only.
-- Paste into Supabase → SQL Editor and Run, after service-catalogue.sql. Safe to run again.

begin;

create table if not exists public.service_variant_costs (
  variant_id uuid primary key references public.service_variants(id) on delete cascade,
  crew_count int check (crew_count > 0),
  cost numeric(10,2) check (cost >= 0),
  updated_at timestamptz not null default now()
);

alter table public.service_variant_costs enable row level security;
drop policy if exists variant_costs_admin on public.service_variant_costs;
create policy variant_costs_admin on public.service_variant_costs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.service_variant_costs from anon;
grant select, insert, update, delete on public.service_variant_costs to authenticated;

insert into public.service_variant_costs (variant_id, crew_count, cost)
select v.id, d.crew, d.cost
from (values
  ('Moving In BTO Flats', 'Post Renovation Cleaning', '2-Room Flexi', 2, 142),
  ('Moving In BTO Flats', 'Post Renovation Cleaning', '2-Room Standard', 2, 143),
  ('Moving In BTO Flats', 'Post Renovation Cleaning', '3-Room', 3, 214),
  ('Moving In BTO Flats', 'Post Renovation Cleaning', '4-Room', 4, 407),
  ('Moving In BTO Flats', 'Post Renovation Cleaning', '5-Room', 4, 414),
  ('Moving In BTO Flats', 'Post Renovation Cleaning', 'Jumbo / EA', 5, 589),
  ('Moving In BTO Flats', 'Post Renovation Cleaning', 'Maisonette', 5, 596),
  ('Moving In BTO Flats', 'Formaldehyde Removal (New)', '2-Room Flexi', 2, 134),
  ('Moving In BTO Flats', 'Formaldehyde Removal (New)', '2-Room Standard', 2, 134),
  ('Moving In BTO Flats', 'Formaldehyde Removal (New)', '3-Room', 2, 166),
  ('Moving In BTO Flats', 'Formaldehyde Removal (New)', '4-Room', 2, 197),
  ('Moving In BTO Flats', 'Formaldehyde Removal (New)', '5-Room', 2, 227),
  ('Moving In BTO Flats', 'Formaldehyde Removal (New)', 'Jumbo / EA', 2, 260),
  ('Moving In BTO Flats', 'Formaldehyde Removal (New)', 'Maisonette', 2, 260),
  ('Moving In BTO Flats', 'Floor Tile Scrubbing', '2-Room Flexi', 2, 110),
  ('Moving In BTO Flats', 'Floor Tile Scrubbing', '2-Room Standard', 2, 110),
  ('Moving In BTO Flats', 'Floor Tile Scrubbing', '3-Room', 2, 158),
  ('Moving In BTO Flats', 'Floor Tile Scrubbing', '4-Room', 2, 182),
  ('Moving In BTO Flats', 'Floor Tile Scrubbing', '5-Room', 2, 206),
  ('Moving In BTO Flats', 'Floor Tile Scrubbing', 'Jumbo / EA', 2, 230),
  ('Moving In BTO Flats', 'Floor Tile Scrubbing', 'Maisonette', 2, 254),
  ('Moving In BTO Flats', 'Paint Stain Removal', '2 hrs', 2, 100),
  ('Moving In BTO Flats', 'Paint Stain Removal', '4 hrs', 2, 188),
  ('Moving In BTO Flats', 'Paint Stain Removal', '6 hrs (max)', 2, 276),
  ('Moving In BTO Flats', 'Window Cleaning', 'Bedrooms', 2, 121),
  ('Moving In BTO Flats', 'Window Cleaning', 'Flat Living Room', 2, 124),
  ('Moving In BTO Flats', 'Fan Cleaning', 'Standard (per pc)', 2, 78),
  ('Fabric & Leather Care', 'Sofa Cleaning', '1–3 Seater – Small', 2, 82),
  ('Fabric & Leather Care', 'Sofa Cleaning', '1–3 Seater – Big', 2, 84),
  ('Fabric & Leather Care', 'Sofa Cleaning', '4–5 Seater – Small', 2, 126),
  ('Fabric & Leather Care', 'Sofa Cleaning', '4–5 Seater – Big', 2, 129),
  ('Fabric & Leather Care', 'Sofa Cleaning', '6–9 Seater – Small', 2, 172),
  ('Fabric & Leather Care', 'Sofa Cleaning', '6–9 Seater – Big', 2, 175),
  ('Fabric & Leather Care', 'Sofa Cleaning', '3–5 Seater L-Shape – Small', 2, 128),
  ('Fabric & Leather Care', 'Sofa Cleaning', '3–5 Seater L-Shape – Big', 2, 174),
  ('Fabric & Leather Care', 'Sofa Cleaning', '3–5 Seater U-Shape', 2, 178),
  ('Fabric & Leather Care', 'Sofa Cleaning', 'Ottoman / Footstool', 2, 24),
  ('Fabric & Leather Care', 'Carpet Cleaning', 'Up to 250cm', 2, 82),
  ('Fabric & Leather Care', 'Carpet Cleaning', 'Up to 300cm', 2, 104),
  ('Fabric & Leather Care', 'Carpet Cleaning', 'Up to 350cm', 2, 106),
  ('Fabric & Leather Care', 'Carpet Cleaning', 'Kitchen Runner', 2, 81),
  ('Fabric & Leather Care', 'Mattress Cleaning', 'Baby Cot Mattress', 2, 81),
  ('Fabric & Leather Care', 'Mattress Cleaning', 'Single / Super Single', 2, 82),
  ('Fabric & Leather Care', 'Mattress Cleaning', 'Queen / King', 2, 84),
  ('Fabric & Leather Care', 'Mattress Cleaning', 'Baby Cot', 2, 62),
  ('Fabric & Leather Care', 'Curtain Steam Cleaning', 'Curtains (per pc)', 2, 40),
  ('Fabric & Leather Care', 'Curtain Steam Cleaning', 'Blinds (per pc)', 2, 41),
  ('Car & Baby Gear (Pick Up & Delivery)', 'Car Mat Cleaning', '2–4 Seater', 2, 70),
  ('Car & Baby Gear (Pick Up & Delivery)', 'Car Mat Cleaning', '5–7 Seater', 2, 92),
  ('Car & Baby Gear (Pick Up & Delivery)', 'Baby Gear Cleaning', 'Car Baby Seat', 2, 67),
  ('Car & Baby Gear (Pick Up & Delivery)', 'Baby Gear Cleaning', 'Stroller', 2, 68),
  ('Equipment Rental (Per Day)', 'Floor Scrubber', 'Per day', null, 90),
  ('Equipment Rental (Per Day)', 'Extraction Cleaner Puzzi 10/1', 'Per day', null, 52),
  ('Equipment Rental (Per Day)', 'Steam Cleaner SC2', 'Per day', null, 48),
  ('Equipment Rental (Per Day)', 'Pressure Washer K2', 'Per day', null, 43),
  ('Equipment Rental (Per Day)', 'Wet & Dry Vacuum WD 1', 'Per day', null, 42),
  ('Equipment Rental (Per Day)', 'Floor Dryer', 'Per day', null, 42),
  ('Transportation Fees & Free Services', 'Transportation Fee', 'One way', null, 10),
  ('Transportation Fees & Free Services', 'Transportation Fee', 'Two way', null, 20)
) as d(category, service, variant, crew, cost)
join public.service_categories c on c.name = d.category
join public.services s on s.category_id = c.id and s.name = d.service
join public.service_variants v on v.service_id = s.id and v.name = d.variant
on conflict (variant_id) do update
  set crew_count = excluded.crew_count, cost = excluded.cost, updated_at = now();

commit;
