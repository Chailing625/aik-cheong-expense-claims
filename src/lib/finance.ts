// Finance dashboard maths: ageing of debtors/creditors and the main health ratios.
// Everything here is plain calculation, so it is easy to check against your accountant's figures.

export interface Invoice {
  id: string;
  party: string; // customer (debtors) or supplier (creditors)
  ref: string; // invoice number
  date: string; // invoice date, YYYY-MM-DD
  due: string; // due date, YYYY-MM-DD
  amount: number; // amount still unpaid
}

const pad = (n: number) => String(n).padStart(2, "0");
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayNo = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
export const daysBetween = (from: string, to: string) => dayNo(to) - dayNo(from);
export const addDays = (iso: string, n: number) => {
  const d = new Date(dayNo(iso) * 86400000 + n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Reads 2026-11-30, 30/11/2026, 30-11-2026 or 30.11.26 (day first, as used in Malaysia). */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/))) [d, mo, y] = [+m[1], +m[2], m[3].length === 2 ? 2000 + +m[3] : +m[3]];
  else return null;
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Reads 1,234.50 / RM 1,234.50 / (1,234.50) / -1234.5 */
export function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/rm/gi, "").replace(/[,\s]/g, "");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return neg ? -n : n;
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Turns pasted / uploaded rows into invoices.
 * Columns: Name, Invoice no, Invoice date, [Due date], Amount.  Due date is optional;
 * when it is left out we use invoice date + the credit terms.
 */
export function parseInvoices(text: string, termsDays: number): { rows: Invoice[]; skipped: number } {
  const rows: Invoice[] = [];
  let skipped = 0;
  let n = 0;
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const c = splitLine(line);
    const amount = c.length >= 4 ? parseAmount(c[c.length - 1]) : null;
    const date = c.length >= 4 ? parseDate(c[2]) : null;
    if (amount === null || !date || !c[0]) {
      if (i > 0) skipped++; // the first line is usually just the column headings
      return;
    }
    const due = c.length >= 5 ? parseDate(c[3]) ?? addDays(date, termsDays) : addDays(date, termsDays);
    rows.push({ id: `${Date.now()}-${n++}-${Math.random().toString(36).slice(2, 6)}`, party: c[0], ref: c[1], date, due, amount });
  });
  return { rows, skipped };
}

// ---------- ageing ----------

export type Basis = "due" | "invoice";
export const BUCKET_LABELS: Record<Basis, string[]> = {
  due: ["Not yet due", "1–30 days late", "31–60 days late", "61–90 days late", "Over 90 days late"],
  invoice: ["0–30 days", "31–60 days", "61–90 days", "91–120 days", "Over 120 days"],
};
const EDGES: Record<Basis, number[]> = { due: [0, 30, 60, 90], invoice: [30, 60, 90, 120] };

export function bucketOf(days: number, basis: Basis): number {
  const e = EDGES[basis];
  const i = e.findIndex((x) => days <= x);
  return i === -1 ? 4 : i;
}

export interface Ageing {
  buckets: number[];
  total: number;
  /** the three oldest buckets added together: what needs chasing (debtors) or paying (creditors) */
  old: number;
  parties: { party: string; buckets: number[]; total: number }[];
}

export function ageing(list: Invoice[], asOf: string, basis: Basis): Ageing {
  const buckets = [0, 0, 0, 0, 0];
  const map = new Map<string, number[]>();
  for (const inv of list) {
    const days = daysBetween(basis === "due" ? inv.due : inv.date, asOf);
    const b = bucketOf(days, basis);
    buckets[b] += inv.amount;
    const row = map.get(inv.party) ?? [0, 0, 0, 0, 0];
    row[b] += inv.amount;
    map.set(inv.party, row);
  }
  const parties = [...map.entries()]
    .map(([party, b]) => ({ party, buckets: b, total: b.reduce((a, x) => a + x, 0) }))
    .sort((a, b) => b.total - a.total);
  return { buckets, total: buckets.reduce((a, x) => a + x, 0), old: buckets[2] + buckets[3] + buckets[4], parties };
}

// ---------- ratios ----------

export interface Figures {
  cash: string;
  receivables: string; // leave blank to use the debtor list total
  inventory: string;
  otherCurrentAssets: string;
  payables: string; // leave blank to use the creditor list total
  shortTermBorrowings: string;
  otherCurrentLiabilities: string;
  longTermBorrowings: string;
  equity: string;
  annualSales: string;
  annualCostOfSales: string;
}
export const EMPTY_FIGURES: Figures = {
  cash: "",
  receivables: "",
  inventory: "",
  otherCurrentAssets: "",
  payables: "",
  shortTermBorrowings: "",
  otherCurrentLiabilities: "",
  longTermBorrowings: "",
  equity: "",
  annualSales: "",
  annualCostOfSales: "",
};

const num = (s: string) => parseAmount(s) ?? 0;
const has = (s: string) => parseAmount(s) !== null;
const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export interface Ratios {
  receivables: number;
  payables: number;
  currentAssets: number;
  currentLiabilities: number;
  borrowings: number;
  workingCapital: number;
  currentRatio: number | null;
  quickRatio: number | null;
  gearing: number | null; // total borrowings / equity
  netGearing: number | null; // (borrowings - cash) / equity
  debtToCapital: number | null; // borrowings / (borrowings + equity)
  debtorDays: number | null;
  creditorDays: number | null;
  /** true once enough figures are in to show something useful */
  ready: boolean;
}

export function ratios(f: Figures, debtorTotal: number, creditorTotal: number): Ratios {
  const receivables = has(f.receivables) ? num(f.receivables) : debtorTotal;
  const payables = has(f.payables) ? num(f.payables) : creditorTotal;
  const cash = num(f.cash);
  const currentAssets = cash + receivables + num(f.inventory) + num(f.otherCurrentAssets);
  const borrowings = num(f.shortTermBorrowings) + num(f.longTermBorrowings);
  const currentLiabilities = payables + num(f.shortTermBorrowings) + num(f.otherCurrentLiabilities);
  const equity = num(f.equity);
  const sales = num(f.annualSales);
  const cos = num(f.annualCostOfSales);
  return {
    receivables,
    payables,
    currentAssets,
    currentLiabilities,
    borrowings,
    workingCapital: currentAssets - currentLiabilities,
    currentRatio: ratio(currentAssets, currentLiabilities),
    quickRatio: ratio(currentAssets - num(f.inventory), currentLiabilities),
    gearing: ratio(borrowings, equity),
    netGearing: equity > 0 ? (borrowings - cash) / equity : null,
    debtToCapital: ratio(borrowings, borrowings + equity),
    debtorDays: ratio(receivables * 365, sales),
    creditorDays: ratio(payables * 365, cos),
    ready: currentAssets > 0 || currentLiabilities > 0 || borrowings > 0,
  };
}

export type Tone = "good" | "watch" | "bad" | "none";
export const toneOf = {
  workingCapital: (v: number): Tone => (v > 0 ? "good" : "bad"),
  currentRatio: (v: number | null): Tone => (v === null ? "none" : v >= 1.5 ? "good" : v >= 1 ? "watch" : "bad"),
  quickRatio: (v: number | null): Tone => (v === null ? "none" : v >= 1 ? "good" : v >= 0.7 ? "watch" : "bad"),
  gearing: (v: number | null): Tone => (v === null ? "none" : v <= 0.5 ? "good" : v <= 1 ? "watch" : "bad"),
};

// ---------- sample data so the dashboard can be tried straight away ----------

export function sampleInvoices(asOf: string, kind: "debtors" | "creditors"): Invoice[] {
  const d: [string, string, number, number, number][] =
    kind === "debtors"
      ? [
          ["Kopi Corner Cafe", "INV-1021", 62, 32, 8450],
          ["Kopi Corner Cafe", "INV-1056", 20, -10, 5120],
          ["Brew & Bean Sdn Bhd", "INV-1033", 95, 65, 12300],
          ["Brew & Bean Sdn Bhd", "INV-1060", 12, -18, 7800],
          ["Sunrise Hotel", "INV-1008", 140, 110, 21500],
          ["Sunrise Hotel", "INV-1049", 55, 25, 9600],
          ["Taman Mart", "INV-1062", 8, -22, 3980],
          ["Aroma Bistro", "INV-1040", 75, 45, 6720],
          ["Aroma Bistro", "INV-1058", 28, -2, 4410],
        ]
      : [
          ["Green Bean Traders", "PO-7781", 50, 20, 28400],
          ["Green Bean Traders", "PO-7802", 18, -12, 31900],
          ["Packwell Packaging", "PO-7755", 82, 52, 6350],
          ["Packwell Packaging", "PO-7810", 10, -20, 4120],
          ["Tenaga Nasional", "UT-1110", 24, -6, 2780],
          ["Bean Logistics", "PO-7740", 105, 75, 3900],
          ["City Rent Sdn Bhd", "RT-1111", 14, -16, 8000],
        ];
  return d.map(([party, ref, age, late, amount], i) => ({
    id: `sample-${kind}-${i}`,
    party,
    ref,
    date: addDays(asOf, -age),
    due: addDays(asOf, -late),
    amount,
  }));
}

export const SAMPLE_FIGURES: Figures = {
  cash: "86500",
  receivables: "",
  inventory: "94000",
  otherCurrentAssets: "6200",
  payables: "",
  shortTermBorrowings: "45000",
  otherCurrentLiabilities: "18400",
  longTermBorrowings: "120000",
  equity: "310000",
  annualSales: "1450000",
  annualCostOfSales: "980000",
};

export function toCSV(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(",")).join("\n");
}
