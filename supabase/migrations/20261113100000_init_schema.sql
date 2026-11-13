-- Aik Cheong Coffee Roaster Sdn Bhd – Salesman expense claims
-- Roles: admin (keys in claims) and hod (approves). Every table has Row Level Security.

create or replace function public.malaysia_today() returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Kuala_Lumpur')::date $$;

-- ---------- profiles (one row per login) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role text check (role in ('admin', 'hod')),   -- null = signed up but not given access yet
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.current_app_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "read own profile or admin reads all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.current_app_role()) = 'admin');

-- ---------- salespeople ----------
create table public.salespeople (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_name text not null,
  position text not null,
  area text not null,
  bank text not null,
  account_no text not null,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.salespeople enable row level security;

create policy "admin and hod read salespeople" on public.salespeople
  for select to authenticated using ((select public.current_app_role()) in ('admin', 'hod'));
create policy "admin adds salespeople" on public.salespeople
  for insert to authenticated with check ((select public.current_app_role()) = 'admin');
create policy "admin edits salespeople" on public.salespeople
  for update to authenticated
  using ((select public.current_app_role()) = 'admin')
  with check ((select public.current_app_role()) = 'admin');

-- ---------- claims ----------
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null default '',
  salesperson_id uuid not null references public.salespeople (id),
  period_month text not null check (period_month ~ '^\d{4}-\d{2}$'),
  half smallint not null check (half in (1, 2)),
  period_text text not null,
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at date not null default public.malaysia_today(),
  submitted_at date not null default public.malaysia_today(),
  checked_by_name text,
  checked_by_date date,
  reject_reason text,
  updated_at timestamptz not null default now()
);
create index claims_salesperson_idx on public.claims (salesperson_id);
create index claims_status_idx on public.claims (status);
alter table public.claims enable row level security;

create policy "admin and hod read claims" on public.claims
  for select to authenticated using ((select public.current_app_role()) in ('admin', 'hod'));
create policy "admin adds claims" on public.claims
  for insert to authenticated
  with check ((select public.current_app_role()) = 'admin' and status = 'pending');
create policy "admin edits open claims" on public.claims
  for update to authenticated
  using ((select public.current_app_role()) = 'admin' and status in ('pending', 'rejected'))
  with check ((select public.current_app_role()) = 'admin' and status = 'pending');

-- daily rows of the claim form (amounts are numeric, never float)
create table public.claim_days (
  claim_id uuid not null references public.claims (id) on delete cascade,
  day smallint not null check (day between 1 and 31),
  location text not null default '',
  food numeric(10, 2) not null default 0 check (food >= 0),
  accom numeric(10, 2) not null default 0 check (accom >= 0),
  toll numeric(10, 2) not null default 0 check (toll >= 0),
  parking numeric(10, 2) not null default 0 check (parking >= 0),
  petrol numeric(10, 2) not null default 0 check (petrol >= 0),
  ent numeric(10, 2) not null default 0 check (ent >= 0),
  others numeric(10, 2) not null default 0 check (others >= 0),
  primary key (claim_id, day)
);
alter table public.claim_days enable row level security;

create policy "admin and hod read claim days" on public.claim_days
  for select to authenticated using ((select public.current_app_role()) in ('admin', 'hod'));
create policy "admin writes days of open claims" on public.claim_days
  for all to authenticated
  using ((select public.current_app_role()) = 'admin'
         and exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pending', 'rejected')))
  with check ((select public.current_app_role()) = 'admin'
         and exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pending', 'rejected')));

-- approval timeline
create table public.claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  label text not null,
  actor text not null,
  event_date date not null default public.malaysia_today(),
  type text not null check (type in ('saved', 'approved', 'rejected', 'pending')),
  comment text,
  created_at timestamptz not null default now()
);
create index claim_events_claim_idx on public.claim_events (claim_id);
alter table public.claim_events enable row level security;

create policy "admin and hod read events" on public.claim_events
  for select to authenticated using ((select public.current_app_role()) in ('admin', 'hod'));
create policy "admin adds events" on public.claim_events
  for insert to authenticated with check ((select public.current_app_role()) = 'admin');

-- receipt files (the files live in Storage bucket "receipts")
create table public.claim_receipts (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  name text not null,
  type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index claim_receipts_claim_idx on public.claim_receipts (claim_id);
alter table public.claim_receipts enable row level security;

create policy "admin and hod read receipts" on public.claim_receipts
  for select to authenticated using ((select public.current_app_role()) in ('admin', 'hod'));
create policy "admin adds receipts to open claims" on public.claim_receipts
  for insert to authenticated
  with check ((select public.current_app_role()) = 'admin'
         and exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pending', 'rejected')));
create policy "admin removes receipts from open claims" on public.claim_receipts
  for delete to authenticated
  using ((select public.current_app_role()) = 'admin'
         and exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pending', 'rejected')));

-- ---------- rules the database enforces itself ----------
create or replace function public.guard_claim_update() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'approved' then
    raise exception 'Approved claims cannot be changed';
  end if;
  if new.status = 'approved' and (select public.current_app_role()) is distinct from 'hod' then
    raise exception 'Only the HOD can approve a claim';
  end if;
  if new.status = 'rejected' and old.status <> 'rejected' and (select public.current_app_role()) is distinct from 'hod' then
    raise exception 'Only the HOD can reject a claim';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
create trigger claims_guard before update on public.claims
  for each row execute function public.guard_claim_update();

-- HOD approves or rejects one or more claims
create or replace function public.decide_claims(p_ids uuid[], p_approve boolean, p_comment text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_today date := public.malaysia_today();
begin
  if (select public.current_app_role()) is distinct from 'hod' then
    raise exception 'Only the HOD can approve or reject claims';
  end if;
  if not p_approve and coalesce(trim(p_comment), '') = '' then
    raise exception 'A comment is required when rejecting';
  end if;
  select coalesce(nullif(full_name, ''), email, 'HOD') into v_name from public.profiles where id = (select auth.uid());

  insert into public.claim_events (claim_id, label, actor, event_date, type, comment)
  select c.id, case when p_approve then 'Approved by HOD' else 'Rejected by HOD' end, v_name, v_today,
         case when p_approve then 'approved' else 'rejected' end, nullif(trim(p_comment), '')
  from public.claims c where c.id = any (p_ids) and c.status = 'pending';

  delete from public.claim_events e
  using public.claims c
  where e.claim_id = c.id and c.id = any (p_ids) and c.status = 'pending' and e.type = 'pending';

  update public.claims
  set status = case when p_approve then 'approved' else 'rejected' end,
      checked_by_name = case when p_approve then v_name end,
      checked_by_date = case when p_approve then v_today end,
      reject_reason = case when p_approve then null else trim(p_comment) end
  where id = any (p_ids) and status = 'pending';
end;
$$;

revoke execute on function public.decide_claims(uuid[], boolean, text) from public, anon;
grant execute on function public.decide_claims(uuid[], boolean, text) to authenticated;
revoke execute on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_claim_update() from public, anon, authenticated;

-- ---------- receipt file storage (private bucket) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "admin and hod read receipt files" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (select public.current_app_role()) in ('admin', 'hod'));
create policy "admin uploads receipt files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (select public.current_app_role()) = 'admin');
create policy "admin deletes receipt files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (select public.current_app_role()) = 'admin');
