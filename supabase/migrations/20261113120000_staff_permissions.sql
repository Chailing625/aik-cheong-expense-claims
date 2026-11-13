-- Per-person permissions: view / edit / delete claims.
-- The Super Admin always has all three. Approving stays with the HOD role.
-- Deleting is a "soft delete": the claim is hidden from every list but kept in the database.

alter table public.profiles
  add column if not exists can_view boolean not null default true,
  add column if not exists can_edit boolean not null default false,
  add column if not exists can_delete boolean not null default false;

-- Existing admins keep what they could already do.
update public.profiles set can_edit = true where role in ('admin', 'superadmin');

alter table public.claims
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users (id);

create or replace function public.has_perm(p_perm text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select pr.active and pr.role is not null and (
      pr.role = 'superadmin' or case p_perm
        when 'view' then pr.can_view
        when 'edit' then pr.can_edit
        when 'delete' then pr.can_delete
        else false end)
    from public.profiles pr where pr.id = (select auth.uid())
  ), false)
$$;
revoke execute on function public.has_perm(text) from public, anon;
grant execute on function public.has_perm(text) to authenticated;

-- ---------- claims ----------
drop policy if exists "admin and hod read claims" on public.claims;
drop policy if exists "admin adds claims" on public.claims;
drop policy if exists "admin edits open claims" on public.claims;

create policy "viewers read claims" on public.claims
  for select to authenticated
  using ((select public.has_perm('view')) and deleted_at is null);
create policy "editors add claims" on public.claims
  for insert to authenticated
  with check ((select public.has_perm('edit')) and status = 'pending' and deleted_at is null);
create policy "editors edit open claims" on public.claims
  for update to authenticated
  using ((select public.has_perm('edit')) and status in ('pending', 'rejected') and deleted_at is null)
  with check ((select public.has_perm('edit')) and status = 'pending' and deleted_at is null);

-- ---------- claim days ----------
drop policy if exists "admin and hod read claim days" on public.claim_days;
drop policy if exists "admin writes days of open claims" on public.claim_days;
create policy "viewers read claim days" on public.claim_days
  for select to authenticated using ((select public.has_perm('view')));
create policy "editors write days of open claims" on public.claim_days
  for all to authenticated
  using ((select public.has_perm('edit'))
         and exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pending', 'rejected') and c.deleted_at is null))
  with check ((select public.has_perm('edit'))
         and exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pending', 'rejected') and c.deleted_at is null));

-- ---------- timeline ----------
drop policy if exists "admin and hod read events" on public.claim_events;
drop policy if exists "admin adds events" on public.claim_events;
create policy "viewers read events" on public.claim_events
  for select to authenticated using ((select public.has_perm('view')));
create policy "editors add events" on public.claim_events
  for insert to authenticated with check ((select public.has_perm('edit')));

-- ---------- receipts ----------
drop policy if exists "admin and hod read receipts" on public.claim_receipts;
drop policy if exists "admin adds receipts to open claims" on public.claim_receipts;
drop policy if exists "admin removes receipts from open claims" on public.claim_receipts;
create policy "viewers read receipts" on public.claim_receipts
  for select to authenticated using ((select public.has_perm('view')));
create policy "editors add receipts to open claims" on public.claim_receipts
  for insert to authenticated
  with check ((select public.has_perm('edit'))
         and exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pending', 'rejected') and c.deleted_at is null));
create policy "editors remove receipts from open claims" on public.claim_receipts
  for delete to authenticated
  using ((select public.has_perm('edit'))
         and exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pending', 'rejected') and c.deleted_at is null));

-- ---------- receipt files ----------
drop policy if exists "admin and hod read receipt files" on storage.objects;
drop policy if exists "admin uploads receipt files" on storage.objects;
drop policy if exists "admin deletes receipt files" on storage.objects;
create policy "viewers read receipt files" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (select public.has_perm('view')));
create policy "editors upload receipt files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (select public.has_perm('edit')));
create policy "editors delete receipt files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (select public.has_perm('edit')));

-- ---------- guard: only delete_claim() may hide a claim ----------
create or replace function public.guard_claim_update() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by then
    if coalesce(current_setting('app.deleting', true), '') <> 'on' then
      raise exception 'Use the Delete button to delete a claim';
    end if;
  end if;
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

-- ---------- delete a claim (hide it, keep a record) ----------
create or replace function public.delete_claim(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
begin
  if not (select public.has_perm('delete')) then
    raise exception 'You do not have permission to delete claims';
  end if;
  select status into v_status from public.claims where id = p_id and deleted_at is null;
  if v_status is null then
    raise exception 'Claim not found';
  end if;
  if v_status = 'approved' then
    raise exception 'Approved claims cannot be deleted';
  end if;
  perform set_config('app.deleting', 'on', true);
  update public.claims set deleted_at = now(), deleted_by = (select auth.uid()) where id = p_id;
end;
$$;
revoke execute on function public.delete_claim(uuid) from public, anon;
grant execute on function public.delete_claim(uuid) to authenticated;
