-- DEMO DATA ONLY: made-up names and bank numbers. Never put real staff or bank details in this file.
insert into public.salespeople (id, name, account_name, position, area, bank, account_no, suspended) values
('a0000000-0000-4000-8000-000000000001', 'Sample Salesman One', 'SAMPLE SALESMAN ONE', 'Senior Deputy Manager', 'KL', 'Maybank', '0000 1111 2221', false),
('a0000000-0000-4000-8000-000000000002', 'Sample Salesman Two', 'SAMPLE SALESMAN TWO', 'Sales Executive', 'Penang', 'Public Bank', '0000 1111 2222', false),
('a0000000-0000-4000-8000-000000000003', 'Sample Salesman Three', 'SAMPLE SALESMAN THREE', 'Sales Executive', 'Johor Bahru', 'CIMB Bank', '0000 1111 2223', false),
('a0000000-0000-4000-8000-000000000004', 'Sample Salesman Four', 'SAMPLE SALESMAN FOUR', 'Area Sales Manager', 'Perak', 'RHB Bank', '0000 1111 2224', false),
('a0000000-0000-4000-8000-000000000005', 'Sample Salesman Five', 'SAMPLE SALESMAN FIVE', 'Sales Executive', 'Melaka / Negeri Sembilan', 'Hong Leong Bank', '0000 1111 2225', false),
('a0000000-0000-4000-8000-000000000006', 'Sample Salesman Six', 'SAMPLE SALESMAN SIX', 'Sales Representative', 'Kuantan / Pahang', 'Bank Islam', '0000 1111 2226', false),
('a0000000-0000-4000-8000-000000000007', 'Sample Salesman Seven', 'SAMPLE SALESMAN SEVEN', 'Sales Executive', 'Kota Kinabalu / Sabah', 'AmBank', '0000 1111 2227', true);
insert into public.claims (id, reference_no, salesperson_id, period_month, half, period_text, notes, status, created_at, submitted_at, checked_by_name, checked_by_date, reject_reason) values ('b0000000-0000-4000-8000-000000000001', 'LCS 2026', 'a0000000-0000-4000-8000-000000000001', '2026-10', 2, '16 - 31 OCTOBER 2026', '', 'pending', '2026-11-02', '2026-11-02', null, null, null);
insert into public.claim_days (claim_id, day, location, food, accom, toll, parking, petrol, ent, others) values
('b0000000-0000-4000-8000-000000000001', 16, 'TUMPAT', 15.00, 0.00, 0.00, 0.00, 45.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 17, 'ANNUAL LEAVE', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 18, 'REST DAY', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 19, 'ANNUAL LEAVE', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 20, 'KUALA KRAI', 15.00, 0.00, 0.00, 0.00, 0.00, 0.00, 7.00),
('b0000000-0000-4000-8000-000000000001', 21, 'KB', 15.00, 0.00, 0.00, 0.00, 0.00, 39.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 22, 'KB', 15.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 23, 'RANTAU PANJANG', 15.00, 0.00, 0.00, 0.00, 75.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 24, 'KB', 15.00, 0.00, 0.00, 0.00, 0.00, 0.00, 70.00),
('b0000000-0000-4000-8000-000000000001', 25, 'REST DAY', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 26, 'KT', 20.00, 160.00, 0.00, 0.00, 80.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 27, 'KT', 20.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 28, 'JERTEH', 20.00, 0.00, 0.00, 0.00, 0.00, 0.00, 80.00),
('b0000000-0000-4000-8000-000000000001', 29, 'TUMPAT', 15.00, 0.00, 0.00, 0.00, 76.55, 0.00, 170.00),
('b0000000-0000-4000-8000-000000000001', 30, 'PASIR MAS', 15.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000001', 31, 'KB', 15.00, 0.00, 0.00, 0.00, 70.00, 0.00, 0.00);
insert into public.claim_events (claim_id, label, actor, event_date, type, comment) values
('b0000000-0000-4000-8000-000000000001', 'Saved and sent to HOD', 'Admin', '2026-11-02', 'saved', null),
('b0000000-0000-4000-8000-000000000001', 'Waiting for HOD approval', 'HOD', '2026-11-02', 'pending', null);
insert into public.claims (id, reference_no, salesperson_id, period_month, half, period_text, notes, status, created_at, submitted_at, checked_by_name, checked_by_date, reject_reason) values ('b0000000-0000-4000-8000-000000000002', 'LCS 2026', 'a0000000-0000-4000-8000-000000000002', '2026-10', 1, '1 - 15 OCTOBER 2026', 'Penang market visit week.', 'approved', '2026-10-18', '2026-10-18', 'Head of Department', '2026-10-20', null);
insert into public.claim_days (claim_id, day, location, food, accom, toll, parking, petrol, ent, others) values
('b0000000-0000-4000-8000-000000000002', 1, 'GEORGETOWN', 15.00, 0.00, 0.00, 0.00, 60.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000002', 2, 'BUTTERWORTH', 15.00, 0.00, 12.40, 0.00, 55.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000002', 3, 'REST DAY', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000002', 6, 'BALIK PULAU', 20.00, 0.00, 0.00, 5.00, 48.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000002', 7, 'GEORGETOWN', 15.00, 0.00, 0.00, 0.00, 0.00, 86.50, 0.00),
('b0000000-0000-4000-8000-000000000002', 8, 'BAYAN LEPAS', 15.00, 0.00, 0.00, 0.00, 52.30, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000002', 10, 'KULIM', 20.00, 0.00, 8.60, 0.00, 66.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000002', 13, 'GEORGETOWN', 15.00, 0.00, 0.00, 6.00, 0.00, 0.00, 25.00);
insert into public.claim_events (claim_id, label, actor, event_date, type, comment) values
('b0000000-0000-4000-8000-000000000002', 'Saved and sent to HOD', 'Admin', '2026-10-18', 'saved', null),
('b0000000-0000-4000-8000-000000000002', 'Approved by HOD', 'Head of Department', '2026-10-20', 'approved', 'OK.');
insert into public.claims (id, reference_no, salesperson_id, period_month, half, period_text, notes, status, created_at, submitted_at, checked_by_name, checked_by_date, reject_reason) values ('b0000000-0000-4000-8000-000000000003', 'LCS 2026', 'a0000000-0000-4000-8000-000000000003', '2026-11', 1, '1 - 15 NOVEMBER 2026', '', 'pending', '2026-11-12', '2026-11-12', null, null, null);
insert into public.claim_days (claim_id, day, location, food, accom, toll, parking, petrol, ent, others) values
('b0000000-0000-4000-8000-000000000003', 2, 'JOHOR BAHRU', 15.00, 0.00, 9.80, 0.00, 70.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000003', 3, 'SKUDAI', 15.00, 0.00, 0.00, 0.00, 40.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000003', 4, 'KLUANG', 20.00, 0.00, 14.20, 0.00, 85.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000003', 9, 'PONTIAN', 20.00, 0.00, 0.00, 4.00, 62.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000003', 10, 'JOHOR BAHRU', 15.00, 0.00, 0.00, 0.00, 0.00, 120.00, 0.00);
insert into public.claim_events (claim_id, label, actor, event_date, type, comment) values
('b0000000-0000-4000-8000-000000000003', 'Saved and sent to HOD', 'Admin', '2026-11-12', 'saved', null),
('b0000000-0000-4000-8000-000000000003', 'Waiting for HOD approval', 'HOD', '2026-11-12', 'pending', null);
insert into public.claims (id, reference_no, salesperson_id, period_month, half, period_text, notes, status, created_at, submitted_at, checked_by_name, checked_by_date, reject_reason) values ('b0000000-0000-4000-8000-000000000004', 'LCS 2026', 'a0000000-0000-4000-8000-000000000004', '2026-10', 2, '16 - 31 OCTOBER 2026', '', 'rejected', '2026-11-03', '2026-11-03', null, null, 'Others RM300 on 20th has no receipt or explanation. Please correct and resubmit.');
insert into public.claim_days (claim_id, day, location, food, accom, toll, parking, petrol, ent, others) values
('b0000000-0000-4000-8000-000000000004', 19, 'IPOH', 15.00, 0.00, 0.00, 0.00, 90.00, 0.00, 0.00),
('b0000000-0000-4000-8000-000000000004', 20, 'TAIPING', 20.00, 0.00, 0.00, 0.00, 0.00, 0.00, 300.00),
('b0000000-0000-4000-8000-000000000004', 21, 'IPOH', 15.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00);
insert into public.claim_events (claim_id, label, actor, event_date, type, comment) values
('b0000000-0000-4000-8000-000000000004', 'Saved and sent to HOD', 'Admin', '2026-11-03', 'saved', null),
('b0000000-0000-4000-8000-000000000004', 'Rejected by HOD', 'Head of Department', '2026-11-04', 'rejected', 'Others RM300 on 20th has no receipt or explanation. Please correct and resubmit.');
