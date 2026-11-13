-- Super admin role + ability to switch an account off.
-- Super admin gets everything the admin has (current_app_role() maps it to 'admin'),
-- plus the right to see and manage all accounts.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('superadmin', 'admin', 'hod'));
alter table public.profiles add column if not exists active boolean not null default true;

create or replace function public.current_app_role() returns text
language sql stable security definer set search_path = ''
as $$
  select case when not p.active then null when p.role = 'superadmin' then 'admin' else p.role end
  from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select p.role = 'superadmin' and p.active from public.profiles p where p.id = (select auth.uid())), false)
$$;
revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

drop policy if exists "read own profile or admin reads all" on public.profiles;
create policy "read own profile or super admin reads all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_superadmin()));
