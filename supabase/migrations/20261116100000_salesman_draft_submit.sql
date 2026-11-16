-- Salesperson claims are first saved as a "draft", then the salesperson presses Submit
-- (draft -> pending), and only then does the HOD see them. Existing claims are not changed.

alter table public.claims drop constraint if exists claims_status_check;
alter table public.claims add constraint claims_status_check
  check (status = any (array['draft','submitted','checked','returned','pending','approved','rejected']));

-- replace the earlier "own pending claims" rules with draft-aware ones
drop policy if exists "salesman adds own pending claims" on public.claims;
drop policy if exists "salesman edits own pending claims" on public.claims;
drop policy if exists "salesman writes days of own pending claims" on public.claim_days;
drop policy if exists "salesman adds receipts to own pending claims" on public.claim_receipts;
drop policy if exists "salesman removes receipts from own pending claims" on public.claim_receipts;

create policy "salesman adds own draft claims" on public.claims
  for insert to authenticated
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and salesperson_id = (select public.my_salesperson_id())
    and status = 'draft' and deleted_at is null
  );

-- may change a draft or a rejected claim; may save it again as a draft, or submit it (pending)
create policy "salesman edits own draft claims" on public.claims
  for update to authenticated
  using (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and salesperson_id = (select public.my_salesperson_id())
    and status in ('draft', 'rejected') and deleted_at is null
  )
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and salesperson_id = (select public.my_salesperson_id())
    and status in ('draft', 'pending') and deleted_at is null
  );

create policy "salesman writes days of own draft claims" on public.claim_days
  for all to authenticated
  using (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_days.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('draft', 'rejected') and c.deleted_at is null)
  )
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_days.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('draft', 'rejected') and c.deleted_at is null)
  );

create policy "salesman adds receipts to own draft claims" on public.claim_receipts
  for insert to authenticated
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_receipts.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('draft', 'rejected') and c.deleted_at is null)
  );

create policy "salesman removes receipts from own draft claims" on public.claim_receipts
  for delete to authenticated
  using (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_receipts.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('draft', 'rejected') and c.deleted_at is null)
  );
