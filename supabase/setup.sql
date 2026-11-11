-- BEROS Crew Portal: database setup.
-- The four SQL blocks from SPEC.md "Supabase setup", unchanged, in the order they must run.
-- Paste the whole file into Supabase SQL Editor and click Run once.

-- =====================================================================
-- 1. Services, add-ons and bookings
-- =====================================================================

create type booking_source as enum ('app','whatsapp','phone','walk_in','other');
create type booking_status as enum ('scheduled','completed','cancelled');

-- Catalogue: category > service > variant (each variant has its own price)
-- e.g. Upholstery > Sofa > 3-seater;  Post-renovation > Post-reno clean > 4-room
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order int not null default 0
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id),
  name text not null,
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  unique (category_id, name)
);

create table public.service_variants (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,               -- e.g. '3-seater', 'King', '4-room', 'Executive'
  price numeric(10,2) not null check (price >= 0),
  duration_hours numeric(4,1),
  active boolean not null default true,
  sort_order int not null default 0,
  unique (service_id, name)
);

-- Add-ons, optionally limited to one category (null = available for all)
create table public.add_ons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.service_categories(id),
  name text not null unique,
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  sort_order int not null default 0
);

-- Bookings, from the app or created by an admin
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  scheduled_at timestamptz not null,
  customer_name text not null,
  customer_phone text check (customer_phone ~ '^[689][0-9]{7}$'),
  address text not null,
  postal_code text check (postal_code ~ '^[0-9]{6}$'),
  notes text,
  source booking_source not null default 'app',
  status booking_status not null default 'scheduled',
  items_total numeric(10,2) not null default 0,
  add_ons_total numeric(10,2) not null default 0,
  total numeric(10,2) generated always as (items_total + add_ons_total) stored,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Several items per booking (names and prices copied at booking time)
create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  variant_id uuid not null references public.service_variants(id),
  item_label text not null,         -- e.g. 'Sofa · 3-seater'
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) generated always as (quantity * unit_price) stored
);

create table public.booking_add_ons (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  add_on_id uuid not null references public.add_ons(id),
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null,
  primary key (booking_id, add_on_id)
);

-- Keep booking totals in sync
create or replace function sync_booking_totals() returns trigger language plpgsql as $$
declare b uuid := coalesce(new.booking_id, old.booking_id);
begin
  update public.bookings set
    items_total = coalesce((select sum(line_total) from public.booking_items where booking_id = b), 0),
    add_ons_total = coalesce((select sum(quantity * unit_price) from public.booking_add_ons where booking_id = b), 0)
  where id = b;
  return null;
end $$;
create trigger trg_items_total after insert or update or delete on public.booking_items
for each row execute function sync_booking_totals();
create trigger trg_add_ons_total after insert or update or delete on public.booking_add_ons
for each row execute function sync_booking_totals();

alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_variants enable row level security;
alter table public.add_ons enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_add_ons enable row level security;
-- Policies are added after the main script, once is_admin() exists.

-- =====================================================================
-- 2. Main crew portal script
-- =====================================================================

-- Roles and statuses
create type crew_role as enum ('crew','admin');
create type crew_status as enum ('invited','active','inactive');
create type timesheet_status as enum ('draft','submitted','approved','rejected','paid');
create type claim_status as enum ('pending','approved','rejected','paid');
create type claim_category as enum ('transport','food','others');

-- Crew profiles (one per auth user)
create table crew (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text check (phone ~ '^[89][0-9]{7}$'),
  role crew_role not null default 'crew',
  status crew_status not null default 'invited',
  hourly_rate numeric(8,2) not null default 20 check (hourly_rate > 0),
  start_date date not null default current_date,
  paynow_name text,
  paynow_phone text check (paynow_phone ~ '^[89][0-9]{7}$'),
  paynow_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from crew where id = auth.uid() and role = 'admin' and status = 'active');
$$;

-- One timesheet per crew member per month
create table timesheets (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crew(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  status timesheet_status not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reject_reason text,
  paid_at timestamptz,
  unique (crew_id, month)
);

-- Hours entries inside a timesheet (rate copied at entry time)
create table timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references timesheets(id) on delete cascade,
  booking_id uuid references public.bookings(id),
  is_admin_matter boolean not null default false,
  work_date date not null,
  hours numeric(4,1) not null check (hours > 0 and hours <= 24),
  rate numeric(8,2) not null,
  note text,
  created_at timestamptz not null default now()
);

-- Claims, approved one by one
create table claims (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crew(id) on delete cascade,
  category claim_category not null,
  description text,
  amount numeric(8,2) not null check (amount > 0),
  claim_date date not null,
  receipt_path text,
  status claim_status not null default 'pending',
  reject_reason text,
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (category <> 'others' or coalesce(description,'') <> '')
);

-- Monthly payouts and payslips
create table payouts (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crew(id) on delete cascade,
  month date not null,
  hours_pay numeric(10,2) not null,
  claims_total numeric(10,2) not null,
  total numeric(10,2) generated always as (hours_pay + claims_total) stored,
  payslip_number text unique,
  payslip_path text,
  paid_at timestamptz,
  unique (crew_id, month)
);

-- Audit log of PayNow changes
create table paynow_changes (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crew(id) on delete cascade,
  changed_by uuid not null references crew(id),
  old_name text, old_phone text, new_name text, new_phone text,
  changed_at timestamptz not null default now()
);

-- Row-level security
alter table crew enable row level security;
alter table timesheets enable row level security;
alter table timesheet_entries enable row level security;
alter table claims enable row level security;
alter table payouts enable row level security;
alter table paynow_changes enable row level security;

create policy crew_self_read on crew for select using (id = auth.uid() or is_admin());
create policy crew_admin_all on crew for all using (is_admin()) with check (is_admin());

create policy ts_read on timesheets for select using (crew_id = auth.uid() or is_admin());
create policy ts_crew_write on timesheets for insert with check (crew_id = auth.uid());
create policy ts_crew_update on timesheets for update
  using (crew_id = auth.uid() and status in ('draft','submitted','rejected'))
  with check (crew_id = auth.uid() and status in ('draft','submitted'));
create policy ts_admin on timesheets for all using (is_admin()) with check (is_admin());

create policy te_read on timesheet_entries for select using (
  exists (select 1 from timesheets t where t.id = timesheet_id and (t.crew_id = auth.uid() or is_admin())));
create policy te_crew_write on timesheet_entries for all using (
  exists (select 1 from timesheets t where t.id = timesheet_id and t.crew_id = auth.uid() and t.status in ('draft','rejected')))
  with check (
  exists (select 1 from timesheets t where t.id = timesheet_id and t.crew_id = auth.uid() and t.status in ('draft','rejected')));

create policy cl_read on claims for select using (crew_id = auth.uid() or is_admin());
create policy cl_crew_insert on claims for insert with check (crew_id = auth.uid() and status = 'pending');
create policy cl_crew_edit on claims for update using (crew_id = auth.uid() and status in ('pending','rejected'))
  with check (crew_id = auth.uid() and status = 'pending');
create policy cl_crew_delete on claims for delete using (crew_id = auth.uid() and status = 'pending');
create policy cl_admin on claims for all using (is_admin()) with check (is_admin());

create policy po_read on payouts for select using (crew_id = auth.uid() or is_admin());
create policy po_admin on payouts for all using (is_admin()) with check (is_admin());

create policy pn_admin on paynow_changes for select using (is_admin());

-- Crew may update only their own phone and PayNow fields
create or replace function update_my_contact(p_phone text, p_paynow_name text, p_paynow_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare old crew;
begin
  select * into old from crew where id = auth.uid();
  update crew set phone = p_phone, paynow_name = p_paynow_name, paynow_phone = p_paynow_phone,
    paynow_updated_at = case when old.paynow_name is distinct from p_paynow_name
      or old.paynow_phone is distinct from p_paynow_phone then now() else paynow_updated_at end
  where id = auth.uid();
  if old.paynow_name is distinct from p_paynow_name or old.paynow_phone is distinct from p_paynow_phone then
    insert into paynow_changes (crew_id, changed_by, old_name, old_phone, new_name, new_phone)
    values (auth.uid(), auth.uid(), old.paynow_name, old.paynow_phone, p_paynow_name, p_paynow_phone);
  end if;
end $$;

-- Private storage: receipts/<crew_id>/..., payslips/<crew_id>/...
insert into storage.buckets (id, name, public) values ('receipts','receipts',false), ('payslips','payslips',false);
create policy rc_own on storage.objects for all using (
  bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()))
  with check (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy ps_read on storage.objects for select using (
  bucket_id = 'payslips' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy ps_admin on storage.objects for all using (bucket_id = 'payslips' and is_admin())
  with check (bucket_id = 'payslips' and is_admin());

-- =====================================================================
-- 3. Booking assignments
-- =====================================================================

-- Which crew are assigned to which BEROS booking
create table booking_crew (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  crew_id uuid not null references crew(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (booking_id, crew_id)
);
alter table booking_crew enable row level security;
create policy bc_read on booking_crew for select using (crew_id = auth.uid() or is_admin());
create policy bc_admin on booking_crew for all using (is_admin()) with check (is_admin());

-- "To log": a crew member's assigned bookings in a month with no hours entry yet
create or replace view my_bookings_to_log as
select b.*
from public.bookings b
join booking_crew bc on bc.booking_id = b.id and bc.crew_id = auth.uid()
where not exists (
  select 1 from timesheet_entries e
  join timesheets t on t.id = e.timesheet_id
  where e.booking_id = b.id and t.crew_id = auth.uid()
);

-- =====================================================================
-- 4. Policies for services, add-ons and bookings
-- =====================================================================

-- Catalogue: any signed-in user can read, admins manage
create policy cat_read on public.service_categories for select using (auth.uid() is not null);
create policy cat_admin on public.service_categories for all using (is_admin()) with check (is_admin());
create policy sv_read on public.services for select using (auth.uid() is not null);
create policy sv_admin on public.services for all using (is_admin()) with check (is_admin());
create policy var_read on public.service_variants for select using (auth.uid() is not null);
create policy var_admin on public.service_variants for all using (is_admin()) with check (is_admin());
create policy ao_read on public.add_ons for select using (auth.uid() is not null);
create policy ao_admin on public.add_ons for all using (is_admin()) with check (is_admin());

-- Bookings: admins manage, assigned crew can read
create policy bk_admin on public.bookings for all using (is_admin()) with check (is_admin());
create policy bk_assigned on public.bookings for select using (
  exists (select 1 from booking_crew bc where bc.booking_id = id and bc.crew_id = auth.uid()));
create policy bi_read on public.booking_items for select using (
  is_admin() or exists (select 1 from booking_crew bc where bc.booking_id = booking_items.booking_id and bc.crew_id = auth.uid()));
create policy bi_admin on public.booking_items for all using (is_admin()) with check (is_admin());
create policy ba_read on public.booking_add_ons for select using (
  is_admin() or exists (select 1 from booking_crew bc where bc.booking_id = booking_add_ons.booking_id and bc.crew_id = auth.uid()));
create policy ba_admin on public.booking_add_ons for all using (is_admin()) with check (is_admin());
