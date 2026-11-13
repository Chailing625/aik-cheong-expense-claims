// Data model for Aik Cheong Coffee Roaster Sdn Bhd – Salesman Expenses Claim Form (ECF)

import type { Receipt } from "./receipts";

export type Role = "admin" | "hod";
export type Status = "pending" | "approved" | "rejected";

export const TODAY = "2026-11-13";

export interface User {
  id: string;
  name: string;
  role: Role; // a super admin counts as "admin" everywhere
  isSuper?: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}


export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", hod: "HOD" };

export const BANKS = [
  "Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank", "AmBank",
  "Bank Islam", "Bank Rakyat", "BSN", "OCBC Bank", "UOB Malaysia", "Affin Bank",
];

// ---------- Sales people ----------
export interface Salesperson {
  id: string;
  name: string;
  accountName: string; // bank account name (as in the bank)
  position: string;
  area: string;
  bank: string;
  accountNo: string;
  suspended: boolean;
}


// ---------- Claim form (matches the ECF template columns) ----------
export type AmountKey = "food" | "accom" | "toll" | "parking" | "petrol" | "ent" | "others";

export const COLS: { key: AmountKey; group: string; label: string; sub: string; gl: string }[] = [
  { key: "food", group: "Food Allowance", label: "Food", sub: "In-station / Out-station", gl: "9001/026LCLFOM" },
  { key: "accom", group: "Travelling", label: "Accom.", sub: "Accomodation / Transportation", gl: "9001/026LCLTAM" },
  { key: "toll", group: "Travelling", label: "Toll", sub: "Toll", gl: "9001/026LCLTOM" },
  { key: "parking", group: "Travelling", label: "Parking", sub: "Parking", gl: "9001/026LCLPAM" },
  { key: "petrol", group: "Travelling", label: "Petrol", sub: "Petrol", gl: "9001/026LCLPDM" },
  { key: "ent", group: "Entertainment", label: "Entert.", sub: "Entertainment", gl: "9001/026LCLETM" },
  { key: "others", group: "Others", label: "Others", sub: "(Please specify)", gl: "" },
];

export interface DayRow {
  day: number;
  location: string;
  food: number;
  accom: number;
  toll: number;
  parking: number;
  petrol: number;
  ent: number;
  others: number;
}

export interface TimelineEvent {
  label: string;
  actor: string;
  date: string;
  type: "saved" | "approved" | "rejected" | "pending";
  comment?: string;
}

export interface Claim {
  id: string;
  referenceNo: string;
  salespersonId: string;
  period: string; // text printed on the form, e.g. "16 - 31 OCTOBER 2026"
  periodMonth: string; // "2026-10"
  half: 1 | 2; // 1 = 1st half (1-15), 2 = 2nd half (16 to end of month)
  rows: DayRow[]; // always 31 rows
  notes: string;
  receipts: Receipt[]; // photos / PDFs of the bills
  status: Status;
  createdAt: string;
  submittedAt: string;
  timeline: TimelineEvent[];
  checkedBy?: { name: string; date: string };
  rejectReason?: string;
}

export const blankRows = (): DayRow[] =>
  Array.from({ length: 31 }, (_, i) => ({ day: i + 1, location: "", food: 0, accom: 0, toll: 0, parking: 0, petrol: 0, ent: 0, others: 0 }));

export const MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

/** First day and last day of a half-month claim period. */
export function periodDays(periodMonth: string, half: 1 | 2) {
  const [y, m] = periodMonth.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return half === 1 ? { from: 1, to: 15 } : { from: 16, to: last };
}

export function periodText(periodMonth: string, half: 1 | 2) {
  const [y, m] = periodMonth.split("-").map(Number);
  const { from, to } = periodDays(periodMonth, half);
  return `${from} - ${to} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** The claim period you most likely key in today: the half-month that just finished. */
export function defaultPeriod(today: string): { periodMonth: string; half: 1 | 2 } {
  const [y, m, d] = today.split("-").map(Number);
  if (d > 15) return { periodMonth: `${y}-${String(m).padStart(2, "0")}`, half: 1 };
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return { periodMonth: `${py}-${String(pm).padStart(2, "0")}`, half: 2 };
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function claimTotals(rows: DayRow[]) {
  const t = { food: 0, accom: 0, toll: 0, parking: 0, petrol: 0, ent: 0, others: 0 } as Record<AmountKey, number>;
  rows.forEach((r) => COLS.forEach((c) => (t[c.key] += r[c.key] || 0)));
  COLS.forEach((c) => (t[c.key] = round2(t[c.key])));
  const grand = round2(COLS.reduce((s, c) => s + t[c.key], 0));
  return { ...t, grand };
}

export const claimTotal = (c: Pick<Claim, "rows">) => claimTotals(c.rows).grand;

export function formatRM(n: number) {
  return "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const money = (n: number) => n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatDate(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending HOD approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const getSalesperson = (list: Salesperson[], id: string) => list.find((s) => s.id === id);
