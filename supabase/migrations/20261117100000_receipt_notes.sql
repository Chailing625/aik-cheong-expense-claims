-- A short note for each attached file, printed on that file's page in the preview and the download.
alter table public.claim_receipts add column if not exists note text not null default '';

-- allow the note to be changed on claims that can still be edited
create policy "salesman updates receipts of own draft claims" on public.claim_receipts
  for update to authenticated
  using (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_receipts.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('draft', 'rejected') and c.deleted_at is null)
  )
  with check (
    (select public.is_salesman()) and (select public.has_perm('edit'))
    and exists (select 1 from public.claims c where c.id = claim_receipts.claim_id
      and c.salesperson_id = (select public.my_salesperson_id())
      and c.status in ('draft', 'rejected') and c.deleted_at is null)
  );

create policy "editors update receipts of open claims" on public.claim_receipts
  for update to authenticated
  using (
    (select public.has_perm('edit')) and not (select public.is_salesman()) and not (select public.is_manager())
    and exists (select 1 from public.claims c where c.id = claim_receipts.claim_id
      and c.status in ('checked', 'pending', 'rejected') and c.deleted_at is null)
  )
  with check (
    (select public.has_perm('edit')) and not (select public.is_salesman()) and not (select public.is_manager())
    and exists (select 1 from public.claims c where c.id = claim_receipts.claim_id
      and c.status in ('checked', 'pending', 'rejected') and c.deleted_at is null)
  );
