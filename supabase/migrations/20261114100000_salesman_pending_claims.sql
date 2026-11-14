-- Let a salesperson login key in and correct their OWN claims in the app's normal flow
-- (saved as "pending", then approved/rejected by the HOD). Only adds rules; nothing is removed.

create policy "salesman adds own pending claims" on public.claims
  for insert to authenticated
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and salesperson_id = (select public.my_salesperson_id())
    and status = 'pending' and deleted_at is null
  );

create policy "salesman edits own pending claims" on public.claims
  for update to authenticated
  using (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and salesperson_id = (select public.my_salesperson_id())
    and status in ('pending', 'rejected') and deleted_at is null
  )
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and salesperson_id = (select public.my_salesperson_id())
    and status = 'pending' and deleted_at is null
  );

create policy "salesman writes days of own pending claims" on public.claim_days
  for all to authenticated
  using (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_days.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('pending', 'rejected') and c.deleted_at is null)
  )
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_days.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('pending', 'rejected') and c.deleted_at is null)
  );

create policy "salesman adds receipts to own pending claims" on public.claim_receipts
  for insert to authenticated
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_receipts.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('pending', 'rejected') and c.deleted_at is null)
  );

create policy "salesman removes receipts from own pending claims" on public.claim_receipts
  for delete to authenticated
  using (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_receipts.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('pending', 'rejected') and c.deleted_at is null)
  );
