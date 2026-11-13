-- BEROS Crew Portal: security hardening (run once, after setup.sql).
-- Paste into Supabase → SQL Editor and Run. Safe to run again.
--
-- The policies in setup.sql decide WHICH rows a crew member can write, but not
-- WHAT they may put in them. Anyone signed in can talk to the database directly
-- with the public key, so these rules close the gaps on the database side:
--
--   1. Crew can only create timesheets as drafts, and can only submit or
--      withdraw them (not approve, pay, re-date or edit review fields).
--   2. Hours entries always use the crew member's real hourly rate, must be
--      dated in the timesheet's month, may only reference jobs assigned to them,
--      and each job can be logged once.
--   3. Claims can't be pre-approved, pre-paid or future-dated, and a receipt
--      must be one of the crew member's own files.
--   4. Receipt and payslip uploads have file size and type limits.
--   5. The "To log" view respects row-level security.
--   6. Fixes from Supabase's Security Advisor: a pinned search path, and the
--      SECURITY DEFINER functions can't be called by signed-out visitors.
--
-- Admins (is_admin()) and the server (service role / SQL editor) are not
-- restricted by these triggers.

begin;

-- Whether the current request comes from a signed-in (or anonymous) app user
-- who is not an admin. The service role and the SQL editor run as other roles.
create or replace function public.is_restricted_user() returns boolean
language sql stable set search_path = public as $$
  select current_user in ('authenticated', 'anon') and not public.is_admin();
$$;

-- 1. Timesheets ---------------------------------------------------------------

drop policy if exists ts_crew_write on public.timesheets;
create policy ts_crew_write on public.timesheets for insert with check (
  crew_id = auth.uid()
  and status = 'draft'
  and submitted_at is null and reviewed_at is null and paid_at is null and reject_reason is null
);

create or replace function public.guard_timesheet_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.is_restricted_user() then
    return new;
  end if;
  if new.crew_id is distinct from old.crew_id
     or new.month is distinct from old.month
     or new.reviewed_at is distinct from old.reviewed_at
     or new.paid_at is distinct from old.paid_at
     or new.reject_reason is distinct from old.reject_reason then
    raise exception 'You can only submit or withdraw your timesheet.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not (
       (old.status in ('draft', 'rejected') and new.status = 'submitted')
    or (old.status = 'submitted' and new.status = 'draft')
  ) then
    raise exception 'A timesheet can''t go from % to %.', old.status, new.status using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_timesheet_update on public.timesheets;
create trigger trg_guard_timesheet_update before update on public.timesheets
for each row execute function public.guard_timesheet_update();

-- 2. Timesheet entries --------------------------------------------------------

create or replace function public.guard_timesheet_entry() returns trigger
language plpgsql set search_path = public as $$
declare
  ts public.timesheets;
begin
  if not public.is_restricted_user() then
    return new;
  end if;
  select * into ts from public.timesheets where id = new.timesheet_id;

  if tg_op = 'INSERT' then
    -- Always the crew member's current rate, whatever the request says.
    select hourly_rate into new.rate from public.crew where id = ts.crew_id;
  else
    if new.timesheet_id is distinct from old.timesheet_id then
      raise exception 'An entry can''t be moved to another timesheet.' using errcode = '42501';
    end if;
    new.rate := old.rate;
  end if;

  if new.work_date < ts.month or new.work_date >= (ts.month + interval '1 month')::date then
    raise exception 'The date must be in the timesheet''s month.' using errcode = '22023';
  end if;

  if new.booking_id is not null then
    if not exists (select 1 from public.booking_crew bc where bc.booking_id = new.booking_id and bc.crew_id = ts.crew_id) then
      raise exception 'That job isn''t assigned to you.' using errcode = '42501';
    end if;
    if exists (
      select 1 from public.timesheet_entries e
      join public.timesheets t on t.id = e.timesheet_id
      where e.booking_id = new.booking_id and t.crew_id = ts.crew_id
        and (tg_op = 'INSERT' or e.id <> new.id)
    ) then
      raise exception 'You''ve already logged hours for this job.' using errcode = '23505';
    end if;
  end if;
  new.is_admin_matter := new.booking_id is null;
  return new;
end $$;

drop trigger if exists trg_guard_timesheet_entry on public.timesheet_entries;
create trigger trg_guard_timesheet_entry before insert or update on public.timesheet_entries
for each row execute function public.guard_timesheet_entry();

-- 3. Claims -------------------------------------------------------------------

create or replace function public.guard_claim() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.is_restricted_user() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.reviewed_at is not null or new.paid_at is not null or new.reject_reason is not null then
      raise exception 'A new claim can''t be reviewed or paid yet.' using errcode = '42501';
    end if;
  else
    if new.crew_id is distinct from old.crew_id or new.paid_at is distinct from old.paid_at then
      raise exception 'You can''t change that on a claim.' using errcode = '42501';
    end if;
    -- Review fields may only be cleared (when resubmitting), never set.
    if (new.reviewed_at is not null and new.reviewed_at is distinct from old.reviewed_at)
       or (new.reject_reason is not null and new.reject_reason is distinct from old.reject_reason) then
      raise exception 'You can''t change review details on a claim.' using errcode = '42501';
    end if;
  end if;
  if new.receipt_path is not null and split_part(new.receipt_path, '/', 1) <> auth.uid()::text then
    raise exception 'The receipt must be one of your own uploads.' using errcode = '42501';
  end if;
  if new.claim_date > (now() at time zone 'Asia/Singapore')::date then
    raise exception 'The claim date can''t be in the future.' using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_claim on public.claims;
create trigger trg_guard_claim before insert or update on public.claims
for each row execute function public.guard_claim();

-- 4. Upload limits ------------------------------------------------------------

update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'receipts';

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['application/pdf']
where id = 'payslips';

-- 5. "To log" view runs with the caller's permissions -------------------------

alter view public.my_bookings_to_log set (security_invoker = true);

-- 6. Supabase Security Advisor fixes ------------------------------------------

-- Pin the search path of the booking-totals trigger function.
alter function public.sync_booking_totals() set search_path = public;

-- Signed-out visitors can't call the SECURITY DEFINER functions. Signed-in
-- users still can: is_admin() is used by the RLS policies on every request,
-- and update_my_contact() is how crew change their own phone and PayNow.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.update_my_contact(text, text, text) from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.update_my_contact(text, text, text) to authenticated, service_role;
revoke execute on function public.is_restricted_user() from public, anon;
grant execute on function public.is_restricted_user() to authenticated, service_role;

commit;
