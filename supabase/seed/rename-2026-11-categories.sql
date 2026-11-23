-- Rename two categories. Paste into Supabase → SQL Editor and Run.
-- Renames in place: services, prices and past bookings keep their links. Safe to run again.
begin;
update public.service_categories set name = 'Home Cleaning' where name = 'Moving In BTO Flats';
update public.service_categories set name = 'Transportation Fees & Services' where name = 'Transportation Fees & Free Services';
commit;
