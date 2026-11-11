# BEROS Crew Timesheet App — Spec

A mobile-responsive web app where BEROS crew log hours and expense claims through the month, and Shafiq approves them before month-end payout.

## Goals

- Crew can log work quickly from their phones, right after each job.
- Every hours entry is tied to a real BEROS booking, so records are accurate.
- Pay is calculated automatically at $20 per hour.
- Expense claims are tracked separately from hours.
- Nothing counts towards payout until Shafiq approves it.

## Users

- **Crew member**: logs hours and claims, views their own history and payout status.
- **Admin (Shafiq)**: reviews, approves or rejects entries, and marks months as paid.

## Crew screens

### 1. Login

Email and password, or **Continue with Google**. Only email addresses an admin has added as crew can sign in. The footer reads "New to the crew? Contact admin"; the link opens a new email to hello@beros.online. Centred logo with the line "Welcome to the **Crew Portal**. Log hours, submit claims and track your pay."

### 2. Home

A greeting, one earnings card, recent activity, and the two main actions fixed at the bottom.

- **Earnings card:** total earned (approved hours pay plus claims), with hours, jobs and claims below. A period pill on the right: This month, Last 3 months, Last 6 months, All time.
- **Recent:** swipeable cards, two visible at a time. Each is labelled Timesheet or Claim, with a status pill, the title (month or claim type) and one line of amount and detail.
- **Empty state** for new crew: $0 totals and a "No activity yet" card.
- **Fixed actions:** Log timesheet hours (primary) and Submit a claim.
- **Tab bar:** Home, History, Payslips, Profile.

### 3. Timesheet (log hours)

One timesheet per month. Crew can log after each job or fill in the whole month at once.

- Month pill, and a summary of hours pay, jobs logged, hours, and jobs still to log.
- **To log:** that month's assigned bookings not yet logged, each with a "+ Hours" button.
- **Logged:** entries already added, editable until submitted. "Add another entry" covers admin matters.
- **Add hours panel:** booking details are prefilled and locked; crew set hours with a stepper or quick chips (2h to 6h), add an optional note, and see live pay (hours × $20).
- **Fixed actions:** Save draft and Submit timesheet.
- **Submitted state:** entries lock and a banner shows the submit date. "Withdraw to edit" returns it to draft, with a confirm dialog, until the admin approves it.

### 4. Claims

Each claim is submitted and approved on its own; there is no draft step.

- Month pill and a summary of total claimed, approved, pending and rejected.
- A card per claim with type, date, amount and status. Pending claims can be edited or deleted.
- Rejected claims show the admin's reason and an "Edit & resubmit" button.
- **New claim panel:** category (Transport, Food, Others), a required "What did you buy?" field shown only for Others, amount, date, and an optional receipt photo or upload. No linked booking.

### 5. History

- **Period pill:** This month, Last 3 months, Last 6 months, All time.
- **Type filter:** All, Timesheets, Claims.
-
- **List grouped by month:** completed (paid) months only, so no status pills. Each month heading shows the paid date and total, with its timesheet (hours, jobs, pay) and each claim (category, date, amount) in one card. In-progress items live on Home, Timesheet and Claims.

### 6. Payslip

A Payslips landing page (tab bar) lists every paid month. A year pill sits at the top, with a summary of total paid, number of payslips, hours and claims for that year. Each row shows the month, paid date, amount and a PDF download button; there is no separate payslip screen, so tapping a row or the button downloads the PDF (see Monthly payslip below).

### 7. Profile

- Name, role and start date, set by the admin.
- **Contact:** email (login, admin only) and phone (crew can edit).
- **Pay:** hourly rate (admin only) and PayNow details (crew can edit). The admin is emailed whenever PayNow details change.
- **Settings:** email notifications toggle. (How it works and Contact admin pages deferred for now.)
- Log out.

**Field validation (phone and PayNow)**

- +65 prefix is fixed; the number must be exactly 8 digits starting with 8 or 9.
- Numeric keypad, auto-formatted as 9123 4567.
- Invalid input shows a red outline and "Enter a valid 8-digit Singapore mobile number" below the field.
- Name on PayNow is required.
- Save stays disabled until all fields are valid.

## Submission flow and notifications

Hours are approved per monthly timesheet; claims are approved one by one.

**Timesheets**

1. Crew log hours through the month and **Save draft**.
2. **Submit timesheet** locks the month and emails Shafiq.
3. Before approval, crew can **Withdraw to edit**, which returns it to draft.
4. Shafiq approves or rejects the whole month, giving a reason for a rejection.
5. Crew are emailed: approved means "Payout will be made within the next 24 to 48 hours"; rejected unlocks the timesheet with the reason.
6. Shafiq marks it **Paid**, the payslip is generated, and crew get a "Payment sent" email.

**Claims**

1. Crew submit a claim; Shafiq is emailed.
2. Shafiq approves or rejects it, with a reason for a rejection.
3. Approved claims are paid with that month's payout.

**Notifications:** email for Shafiq; email plus an in-app banner for crew.

**Timesheet statuses:** Draft, Submitted, Approved, Rejected, Paid. **Claim statuses:** Pending, Approved, Rejected, Paid.

## Admin screens

### 1. Review queue

Submitted monthly timesheets and pending claims across all crew, with tabs for Submitted, Approved, Paid and Rejected. Approve or reject each timesheet as a whole and each claim on its own; rejections need a short reason. Approve all is available.

### 2. Monthly payout summary

One row per crew member: approved hours, hours pay, approved claims, and total payout. A button to mark the month as **Paid**, which updates the crew's history.

### 3. Crew management

Search and list all crew with status Active, Invited or Inactive.

- **Add crew** (side panel): full name, email, mobile (+65), hourly rate (default $20), start date. "Send invite" emails a Crew Portal link; status shows Invited until they sign in, with Resend.
- **Validation:** name required; valid email format and not already in use; mobile exactly 8 digits starting with 8 or 9; rate above $0. Errors show a red outline and message, and the main button stays disabled until all fields are valid.
- **Edit crew:** name, mobile, hourly rate (applies to hours logged from that day) and start date. Email is locked; to change it, deactivate the account and add them as new crew.
- **PayNow:** editable by the admin as well as the crew member. In Edit crew, tapping Edit expands the PayNow card inline into name and number fields with Cancel and Save. The crew member is not notified of admin changes; the admin is still emailed when a crew member changes their own PayNow.
- **Deactivate:** blocks login and keeps history and payslips.

### 4. Bookings

Bookings sync from the BEROS app, and the admin can also create them by hand with "+ New booking" (side panel: service, date, time, customer name and mobile, address, postal code, source such as WhatsApp, optional notes, and optional crew). Manual bookings are saved to the same bookings table with a source field so they appear alongside app bookings.

- Month pill and tabs: Unassigned, Assigned, Completed, All.
- Table of date, service and address, customer, and assigned crew (or "+ Assign").
- **Assign panel:** booking details and a checklist of active crew; one or more crew per booking. "Save assignment" makes the booking appear under "To log" in each assigned crew member's timesheet.
- On mobile, a simple list with an Assign button per booking.

### 5. Service catalogue

Three levels: **category > service > variant**, each variant with its own price and estimated time. For example Upholstery > Sofa > 3-seater, or Post-renovation > Post-reno clean > 4-room, Executive or Jumbo.

- Category list on the left with counts and "+" to add a category.
- Services in the selected category, each expandable to show its variants with time, price and an Active toggle, plus "+ Add variant".
- "+ Add service" and an Add-ons view; add-ons can apply to all categories or just one.
- Turning an item off hides it from new bookings; existing bookings keep the name and price they were booked at.

**New booking items:** a booking can hold several items. The form lists each item (Category > Service > Variant) with a quantity stepper and line price, "+ Add item", then add-ons and a running total.

## Payout logic

- Hours pay = approved hours × hourly rate.
- Claims total = sum of approved claims.
- Monthly payout = hours pay + claims total.
- Pending and rejected entries are excluded.

## Data model (Supabase)

- **crew**: id, name, email, hourly\_rate, active
- **timesheet\_entries**: id, crew\_id, booking\_id (nullable), category (booking or admin), date, hours, note, status, reject\_reason
- **claims**: id, crew\_id, booking\_id (nullable), date, type, amount, receipt\_url, note, status, reject\_reason
- **payout\_periods**: id, crew\_id, month, status (in progress, submitted, approved, paid), paid\_at
- Bookings come from the existing BEROS bookings table.
- Row-level security: crew see only their own rows; admin sees all.

## Monthly payslip

When Shafiq marks a month as Paid, the app generates a simple payslip that the crew member can view and download as a PDF.

**Payslip contents**

- BEROS Hygiene Care name and logo
- Crew member's name, pay period (month), and payment date
- Hours: list of approved jobs with date, booking, hours, and line amount
- Total hours × hourly rate = hours pay
- Claims: list of approved claims with date, type, and amount, then the claims total
- **Total paid** = hours pay + claims
- Payslip number for reference

**Access**

- Crew: a **Download payslip** button on each Paid month in History, plus a link in the "Payment sent" email.
- Admin: view or download any crew member's payslip from the monthly payout summary.

Straight payout: no CPF or other deductions are shown.

## Out of scope for v1

- Bank transfer integration (payouts done manually)
- GPS clock-in and clock-out
- Overtime or differing rates by job type

## Crew guide: how to use the timesheet

This is the text crew see in the welcome cards and the How it works page. Keep it short and friendly.

**Welcome to the BEROS timesheet.** Log your hours and claims here, and you'll get paid at the end of each month.

1. **Log in** with the email and password BEROS gave you. Save the page to your phone's home screen for quick access.
2. **Log your hours after every job.** Tap **Hours**, pick the date, choose the job from the list, and enter how many hours you worked. You'll see your pay for that job straight away ($20 per hour).
3. **Can't find the job?** Pick **Admin matters** for non-cleaning work, and add a short note. If a booking is missing, message Shafiq.
4. **Claim your expenses.** Tap **Claims**, choose Transport, Food or Others, enter the amount and date, and add a receipt photo if you have one.
5. **Check your status.** Your monthly timesheet and each claim show **Pending** until Shafiq reviews it, then **Approved** or **Rejected**. If rejected, the reason is shown so you can fix it and resubmit.
6. **Month end.** Tap Save anytime to keep a draft. When your month is complete, tap Submit by the last day. You'll be notified once it's approved, and payout follows within 24 to 48 hours.
7. **See past payouts.** Tap **History** to see every month, what you logged, and when it was **Paid**.

**Tips**

- Log on the same day, while you still remember the hours.
- One entry per job, even if you worked two jobs that day.
- Questions? WhatsApp Shafiq.

## Supabase setup (step 1)

Run this once in the Supabase SQL editor. It creates the crew portal tables, row-level security (crew see only their own data, admins see everything) and storage buckets for receipts and payslips. It assumes your existing bookings table is `public.bookings` with an `id` uuid; change the reference if it differs.

**Run first: services, add-ons and bookings.** The main script below references `public.bookings`, so create these tables before it. Skip this block if the BEROS app already has its own bookings table, and add the `source` column to it instead.

```sql
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
```

```sql
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
```

**Add-on: booking assignments.** Run this after the script above.

```sql
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
```

**Policies for services, add-ons and bookings** (run last):

```sql
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
```

Prices for services and add-ons are copied onto each booking when it is created, so changing a price later never alters past bookings.

**After running it:** sign up once with your own email, then run `update crew set role = 'admin', status = 'active' where email = '<your email>';` to make yourself admin. Turn on Google sign-in under Authentication, Providers, and disable open sign-ups so only invited crew can join.

## Build plan

Stack: **Next.js (App Router, TypeScript) + Tailwind** on **Vercel**, using **Supabase** for auth, database, storage and edge functions. Live at **crew.beros.online**.

### Phase 1: Foundations

1. In Supabase, run the SQL in this order: services, add-ons and bookings; the main crew script; the booking assignments add-on; the policies block.
2. Authentication: enable Email and Google, turn off open sign-ups, and set the site URL to https://crew.beros.online.
3. Create the Next.js project, add Supabase client helpers, and protect routes by role (crew vs admin).
4. Deploy to Vercel, add the domain crew.beros.online, then add a CNAME record for `crew` pointing to `cname.vercel-dns.com` in your domain settings.

### Phase 2: Crew app (mobile first)

1. Login, Google sign-in, forgot and reset password.
2. Home: earnings card with period filter, recent cards, fixed actions, empty state.
3. Timesheet: monthly view, To log from assigned bookings, add hours sheet, save, submit and withdraw.
4. Claims: list, new claim sheet (Others needs a description), receipt upload to the private receipts bucket.
5. History, Payslips (download PDF), Profile with phone and PayNow editing and validation.

### Phase 3: Admin

1. Overview, Timesheet review, Claims review with receipt preview.
2. Bookings: list, assign crew, create bookings with multiple items and add-ons.
3. Service catalogue: categories, services, variants, add-ons.
4. Crew: invite, edit, deactivate, PayNow edit.
5. Payouts: totals per crew, Mark as paid generates the payslip PDF into the payslips bucket.

### Phase 4: Notifications and polish

1. Emails (e.g. Resend) for: timesheet submitted, approved, rejected, payment sent, claim reviewed, crew invite, and crew PayNow change to admin.
2. Desktop layouts with sidebar, safe areas on iPhone, loading and error states.
3. Seed placeholder catalogue data, test with one crew account, then invite the team.

### Prompt for Claude Code

Open an empty folder in Claude Code and paste:

```text
Build the BEROS Crew Portal, a mobile-first web app deployed on Vercel at crew.beros.online.
Stack: Next.js App Router with TypeScript, Tailwind CSS, Supabase (auth, Postgres, storage).
The full product spec and database SQL are in SPEC.md in this folder; follow it exactly.
Design: minimal black and white, light grey page background, white cards with thin borders,
Inter font, 8pt spacing, status pills (green paid/approved, amber pending/submitted, red rejected, grey draft).
Roles: crew and admin, enforced by Supabase row-level security and route guards.
Work phase by phase from the Build plan section. After each phase, run the app, fix errors,
and summarise what is done before moving on. Start with Phase 1.
```

Save this whole spec as SPEC.md in that folder before pasting the prompt.

### Prompt for Claude Code: Vercel setup

Run this first, in the same folder as SPEC.md:

```text
Set up hosting for the BEROS Crew Portal on Vercel.
1. Create a Next.js App Router project (TypeScript, Tailwind) in this folder if none exists,
   initialise git, and push it to a new private GitHub repo called beros-crew.
2. Install the Vercel CLI, run vercel login (I will approve it in my browser),
   then link and deploy this folder as a Vercel project named beros-crew, connected to the GitHub repo.
3. Add the domain crew.beros.online to the project with the Vercel CLI.
   Tell me the exact DNS record Vercel needs (type, host, value) so I can add it in Wix.
4. Ask me for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY,
   add them as Vercel environment variables for production and preview, and redeploy.
5. Confirm the deployment URL works, then stop and summarise. Do not start building features yet.
```
