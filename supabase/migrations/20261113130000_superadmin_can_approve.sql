-- The Super Admin may approve and reject claims, as well as the HOD.

create or replace function public.can_decide() returns boolean
language sql stable security definer set search_path = ''
as $$ select (select public.current_app_role()) = 'hod' or (select public.is_superadmin()) $$;
revoke execute on function public.can_decide() from public, anon;
grant execute on function public.can_decide() to authenticated;

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
  if new.status = 'approved' and not (select public.can_decide()) then
    raise exception 'Only the HOD or Super Admin can approve a claim';
  end if;
  if new.status = 'rejected' and old.status <> 'rejected' and not (select public.can_decide()) then
    raise exception 'Only the HOD or Super Admin can reject a claim';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.decide_claims(p_ids uuid[], p_approve boolean, p_comment text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_label text;
  v_today date := public.malaysia_today();
begin
  if not (select public.can_decide()) then
    raise exception 'Only the HOD or Super Admin can approve or reject claims';
  end if;
  if not p_approve and coalesce(trim(p_comment), '') = '' then
    raise exception 'A comment is required when rejecting';
  end if;
  select coalesce(nullif(full_name, ''), email, 'HOD') into v_name from public.profiles where id = (select auth.uid());
  v_label := case when (select public.is_superadmin()) then 'Super Admin' else 'HOD' end;

  insert into public.claim_events (claim_id, label, actor, event_date, type, comment)
  select c.id, case when p_approve then 'Approved by ' else 'Rejected by ' end || v_label, v_name, v_today,
         case when p_approve then 'approved' else 'rejected' end, nullif(trim(p_comment), '')
  from public.claims c where c.id = any (p_ids) and c.status = 'pending' and c.deleted_at is null;

  delete from public.claim_events e
  using public.claims c
  where e.claim_id = c.id and c.id = any (p_ids) and c.status = 'pending' and e.type = 'pending';

  update public.claims
  set status = case when p_approve then 'approved' else 'rejected' end,
      checked_by_name = case when p_approve then v_name end,
      checked_by_date = case when p_approve then v_today end,
      reject_reason = case when p_approve then null else trim(p_comment) end
  where id = any (p_ids) and status = 'pending' and deleted_at is null;
end;
$$;
