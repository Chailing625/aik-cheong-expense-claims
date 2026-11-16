"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, FileUp, Lock, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRM } from "@/lib/data";
import { useUser } from "@/lib/user-context";
import {
  BUCKET_LABELS,
  EMPTY_FIGURES,
  SAMPLE_FIGURES,
  ageing,
  parseInvoices,
  ratios,
  sampleInvoices,
  toCSV,
  todayISO,
  toneOf,
  type Ageing,
  type Basis,
  type Figures,
  type Invoice,
  type Tone,
} from "@/lib/finance";

const KEY = "aik-finance-v1";
const inp = "w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";
const BAR = ["bg-green-500", "bg-yellow-400", "bg-orange-400", "bg-red-500", "bg-red-800"];
const TONE: Record<Tone, { chip: string; text: string }> = {
  good: { chip: "bg-green-100 text-green-800", text: "Healthy" },
  watch: { chip: "bg-yellow-100 text-yellow-800", text: "Keep an eye" },
  bad: { chip: "bg-red-100 text-red-800", text: "Tight" },
  none: { chip: "bg-gray-100 text-gray-600", text: "Need more figures" },
};
const x2 = (v: number | null) => (v === null ? "—" : v.toFixed(2) + "x");
const pct = (v: number | null) => (v === null ? "—" : (v * 100).toFixed(0) + "%");
const dys = (v: number | null) => (v === null ? "—" : Math.round(v) + " days");

type Tab = "overview" | "debtors" | "creditors" | "figures";

export default function FinancePage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("overview");
  const [asOf, setAsOf] = useState(todayISO());
  const [basis, setBasis] = useState<Basis>("due");
  const [terms, setTerms] = useState(30);
  const [debtors, setDebtors] = useState<Invoice[]>([]);
  const [creditors, setCreditors] = useState<Invoice[]>([]);
  const [figures, setFigures] = useState<Figures>(EMPTY_FIGURES);
  const [loaded, setLoaded] = useState(false);

  // everything you type is kept in this browser only (nothing is sent anywhere)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- load saved figures from this browser once */
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (s) {
        if (s.asOf) setAsOf(s.asOf);
        if (s.basis) setBasis(s.basis);
        if (s.terms) setTerms(s.terms);
        if (s.debtors) setDebtors(s.debtors);
        if (s.creditors) setCreditors(s.creditors);
        if (s.figures) setFigures({ ...EMPTY_FIGURES, ...s.figures });
      }
    } catch {}
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ asOf, basis, terms, debtors, creditors, figures }));
    } catch {}
  }, [loaded, asOf, basis, terms, debtors, creditors, figures]);

  const dAge = useMemo(() => ageing(debtors, asOf, basis), [debtors, asOf, basis]);
  const cAge = useMemo(() => ageing(creditors, asOf, basis), [creditors, asOf, basis]);
  const r = useMemo(() => ratios(figures, dAge.total, cAge.total), [figures, dAge.total, cAge.total]);

  if (user.role !== "admin")
    return (
      <div className="mx-auto mt-16 max-w-sm text-center text-gray-600">
        <Lock className="mx-auto mb-3 size-10 text-gray-400" />
        <p className="font-medium">The Finance Dashboard is for the Admin only.</p>
      </div>
    );

  const loadSample = () => {
    setDebtors(sampleInvoices(asOf, "debtors"));
    setCreditors(sampleInvoices(asOf, "creditors"));
    setFigures(SAMPLE_FIGURES);
  };
  const empty = !debtors.length && !creditors.length && !r.ready;

  const tabs: [Tab, string][] = [
    ["overview", "Overview"],
    ["debtors", "Debtor aging"],
    ["creditors", "Creditor aging"],
    ["figures", "My figures"],
  ];

  return (
    <>
      <PageHeader
        title="Finance Dashboard"
        subtitle="Gearing, working capital, debtor and creditor aging — worked out for you."
        action={
          <label className="text-sm text-gray-600">
            Figures as at
            <input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} className={cn(inp, "mt-1 w-44")} />
          </label>
        }
      />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn("whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium", tab === k ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900")}
          >
            {label}
          </button>
        ))}
      </div>

      {empty && tab !== "figures" && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-gray-700">
            <b>Nothing here yet.</b> Want to see how it looks first? Load some made-up example numbers — you can clear them later.
          </div>
          <Button onClick={loadSample}>
            <Sparkles className="size-4" /> Try with example numbers
          </Button>
        </div>
      )}

      {tab === "overview" && <Overview r={r} dAge={dAge} cAge={cAge} basis={basis} go={setTab} />}
      {tab === "debtors" && (
        <AgeingTab
          kind="debtors"
          title="Debtor aging (money customers owe you)"
          partyLabel="Customer"
          list={debtors}
          setList={setDebtors}
          age={dAge}
          basis={basis}
          setBasis={setBasis}
          terms={terms}
          setTerms={setTerms}
          asOf={asOf}
        />
      )}
      {tab === "creditors" && (
        <AgeingTab
          kind="creditors"
          title="Creditor aging (money you owe suppliers)"
          partyLabel="Supplier"
          list={creditors}
          setList={setCreditors}
          age={cAge}
          basis={basis}
          setBasis={setBasis}
          terms={terms}
          setTerms={setTerms}
          asOf={asOf}
        />
      )}
      {tab === "figures" && <FiguresTab f={figures} setF={setFigures} r={r} onSample={loadSample} onClear={() => { setFigures(EMPTY_FIGURES); setDebtors([]); setCreditors([]); }} />}
    </>
  );
}

// ---------------- Overview ----------------

function Overview({ r, dAge, cAge, basis, go }: { r: ReturnType<typeof ratios>; dAge: Ageing; cAge: Ageing; basis: Basis; go: (t: Tab) => void }) {
  const gearTone = toneOf.gearing(r.gearing);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          label="Working capital"
          value={r.ready ? formatRM(r.workingCapital) : "—"}
          tone={r.ready ? toneOf.workingCapital(r.workingCapital) : "none"}
          help="What you own that turns into cash within a year, minus what you must pay within a year. Positive is good."
          sub={r.ready ? `${formatRM(r.currentAssets)} current assets − ${formatRM(r.currentLiabilities)} current liabilities` : undefined}
        />
        <Kpi
          label="Gearing ratio"
          value={pct(r.gearing)}
          tone={gearTone}
          help="Total bank loans compared with the owners' money in the business. Lower means less reliance on borrowing."
          sub={r.gearing !== null ? `Loans ${formatRM(r.borrowings)} ÷ equity · after cash: ${pct(r.netGearing)} · loans share of funding: ${pct(r.debtToCapital)}` : "Fill in loans and equity under My figures"}
        />
        <Kpi
          label="Current ratio"
          value={x2(r.currentRatio)}
          tone={toneOf.currentRatio(r.currentRatio)}
          help="Can you pay what is due this year from what you will collect this year? Above 1.5x is comfortable; below 1x is tight."
        />
        <Kpi
          label="Quick ratio"
          value={x2(r.quickRatio)}
          tone={toneOf.quickRatio(r.quickRatio)}
          help="Same as current ratio but ignoring stock (it can take time to sell). Above 1x is comfortable."
        />
        <Kpi label="Debtor days" value={dys(r.debtorDays)} tone="none" noChip help="On average, how many days customers take to pay you. Compare it with your credit terms." />
        <Kpi label="Creditor days" value={dys(r.creditorDays)} tone="none" noChip help="On average, how many days you take to pay suppliers." />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MiniAgeing title="Debtors — owed to you" age={dAge} basis={basis} onOpen={() => go("debtors")} oldLabel="Needs chasing" />
        <MiniAgeing title="Creditors — you owe" age={cAge} basis={basis} onOpen={() => go("creditors")} oldLabel="Needs paying soon" />
      </div>

      <details className="rounded-xl border bg-white p-4 text-sm text-gray-600">
        <summary className="cursor-pointer font-medium text-gray-900">How these are worked out</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li><b>Working capital</b> = current assets − current liabilities.</li>
          <li><b>Gearing ratio</b> = (short-term loans + long-term loans) ÷ shareholders&apos; equity.</li>
          <li><b>Current ratio</b> = current assets ÷ current liabilities.</li>
          <li><b>Quick ratio</b> = (current assets − inventory) ÷ current liabilities.</li>
          <li><b>Debtor days</b> = debtors ÷ yearly sales × 365. <b>Creditor days</b> = creditors ÷ yearly cost of sales × 365.</li>
          <li>Debtors and creditors come from the aging lists unless you type your own figure under My figures. Colours are rules of thumb, not advice from your accountant.</li>
        </ul>
      </details>
    </div>
  );
}

function Kpi({ label, value, tone, help, sub, noChip }: { label: string; value: string; tone: Tone; help: string; sub?: string; noChip?: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-gray-600">{label}</div>
        {!noChip && <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TONE[tone].chip)}>{TONE[tone].text}</span>}
      </div>
      <div className="mt-1 text-3xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
      <p className="mt-2 text-xs leading-relaxed text-gray-500">{help}</p>
    </div>
  );
}

function MiniAgeing({ title, age, basis, onOpen, oldLabel }: { title: string; age: Ageing; basis: Basis; onOpen: () => void; oldLabel: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <button onClick={onOpen} className="text-sm font-medium text-primary hover:underline">Details</button>
      </div>
      <div className="text-2xl font-semibold">{formatRM(age.total)}</div>
      <div className="mb-3 text-xs text-gray-500">
        {oldLabel}: <b className={age.old > 0 ? "text-red-700" : ""}>{formatRM(age.old)}</b>
      </div>
      <AgeBar age={age} basis={basis} />
    </div>
  );
}

function AgeBar({ age, basis }: { age: Ageing; basis: Basis }) {
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-gray-100" role="img" aria-label="Aging split">
        {age.buckets.map((v, i) => (v > 0 && age.total > 0 ? <div key={i} className={BAR[i]} style={{ width: `${(v / age.total) * 100}%` }} /> : null))}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {age.buckets.map((v, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-gray-600">
              <span className={cn("size-2.5 rounded-sm", BAR[i])} />
              {BUCKET_LABELS[basis][i]}
            </span>
            <span className="tabular-nums">
              {formatRM(v)} <span className="text-xs text-gray-400">{age.total ? `${Math.round((v / age.total) * 100)}%` : ""}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Debtor / creditor aging ----------------

function AgeingTab(props: {
  kind: "debtors" | "creditors";
  title: string;
  partyLabel: string;
  list: Invoice[];
  setList: (l: Invoice[]) => void;
  age: Ageing;
  basis: Basis;
  setBasis: (b: Basis) => void;
  terms: number;
  setTerms: (n: number) => void;
  asOf: string;
}) {
  const { kind, title, partyLabel, list, setList, age, basis, setBasis, terms, setTerms, asOf } = props;
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const { rows, skipped } = parseInvoices(raw, terms);
    if (!rows.length) {
      setMsg("I could not find any invoices in that. Each line needs: name, invoice no, invoice date, (due date), amount.");
      return;
    }
    setList([...list, ...rows]);
    setText("");
    setMsg(`Added ${rows.length} invoice${rows.length > 1 ? "s" : ""}${skipped ? ` (${skipped} line${skipped > 1 ? "s" : ""} skipped — could not read them)` : ""}.`);
  };
  const download = () => {
    const csv = toCSV([
      [partyLabel, ...BUCKET_LABELS[basis], "Total"],
      ...age.parties.map((p) => [p.party, ...p.buckets.map((b) => b.toFixed(2)), p.total.toFixed(2)]),
      ["TOTAL", ...age.buckets.map((b) => b.toFixed(2)), age.total.toFixed(2)],
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${kind}-aging-${asOf}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const template = () => {
    const csv = toCSV([[partyLabel + " name", "Invoice no", "Invoice date", "Due date (optional)", "Amount unpaid"], ["Example Sdn Bhd", "INV-001", "15/10/2026", "14/11/2026", "1250.00"]]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${kind}-template.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <div className="text-2xl font-semibold">{formatRM(age.total)}</div>
          </div>
          <div className="flex flex-wrap items-end gap-3 text-sm text-gray-600">
            <label>
              Count the days from
              <select value={basis} onChange={(e) => setBasis(e.target.value as Basis)} className={cn(inp, "mt-1 w-44")}>
                <option value="due">Due date (days late)</option>
                <option value="invoice">Invoice date</option>
              </select>
            </label>
            {list.length > 0 && (
              <Button variant="outline" onClick={download}>
                <Download className="size-4" /> Download
              </Button>
            )}
          </div>
        </div>
        <AgeBar age={age} basis={basis} />
      </div>

      {age.parties.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{partyLabel}</th>
                {BUCKET_LABELS[basis].map((l, i) => (
                  <th key={i} className="px-3 py-3 text-right font-medium">{l}</th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {age.parties.map((p) => (
                <tr key={p.party}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{p.party}</td>
                  {p.buckets.map((b, i) => (
                    <td key={i} className={cn("px-3 py-2.5 text-right tabular-nums", b === 0 && "text-gray-300", i >= 3 && b > 0 && "font-medium text-red-700")}>{b ? formatRM(b) : "–"}</td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatRM(p.total)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3">Total</td>
                {age.buckets.map((b, i) => (
                  <td key={i} className="px-3 py-3 text-right tabular-nums">{formatRM(b)}</td>
                ))}
                <td className="px-4 py-3 text-right tabular-nums">{formatRM(age.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold text-gray-900">Add invoices</h3>
        <p className="mb-3 mt-1 text-sm text-gray-500">
          Copy the rows from your Excel or accounting report and paste them below. Columns, in this order: <b>{partyLabel} name · Invoice no · Invoice date · Due date (optional) · Amount unpaid</b>.
          Dates like 15/10/2026 are fine.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"Kopi Corner Cafe\tINV-1021\t15/09/2026\t15/10/2026\t8,450.00"}
          className={cn(inp, "font-mono text-sm")}
        />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Button disabled={!text.trim()} onClick={() => add(text)}>Add these</Button>
          <input
            ref={file}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) add(await f.text());
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => file.current?.click()}>
            <FileUp className="size-4" /> Upload a CSV file
          </Button>
          <Button variant="ghost" onClick={template}>Get a blank template</Button>
          <label className="ml-auto text-sm text-gray-600">
            If no due date is given, assume credit terms of
            <span className="ml-2 inline-flex items-center gap-1">
              <input type="number" min={0} value={terms} onChange={(e) => setTerms(Math.max(0, Number(e.target.value) || 0))} className={cn(inp, "w-20")} /> days
            </span>
          </label>
        </div>
        {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}
      </div>

      {list.length > 0 && (
        <details className="rounded-xl border bg-white p-5">
          <summary className="cursor-pointer font-medium text-gray-900">All {list.length} invoices loaded</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-2 font-medium">{partyLabel}</th>
                  <th className="py-2 font-medium">Invoice</th>
                  <th className="py-2 font-medium">Invoice date</th>
                  <th className="py-2 font-medium">Due</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">{i.party}</td>
                    <td className="py-2">{i.ref}</td>
                    <td className="py-2">{i.date}</td>
                    <td className="py-2">{i.due}</td>
                    <td className="py-2 text-right tabular-nums">{formatRM(i.amount)}</td>
                    <td className="py-2 text-right">
                      <button aria-label="Remove" onClick={() => setList(list.filter((x) => x.id !== i.id))} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                if (window.confirm(`Remove all ${list.length} invoices from this list?`)) setList([]);
              }}
            >
              Remove all
            </Button>
          </div>
        </details>
      )}
    </div>
  );
}

// ---------------- My figures ----------------

const FIELDS: { group: string; items: { key: keyof Figures; label: string; hint?: string }[] }[] = [
  {
    group: "What you own (current assets)",
    items: [
      { key: "cash", label: "Cash and bank balances" },
      { key: "receivables", label: "Debtors (money customers owe)", hint: "Leave blank to use the total from Debtor aging" },
      { key: "inventory", label: "Stock / inventory" },
      { key: "otherCurrentAssets", label: "Other current assets", hint: "Deposits, prepayments, etc." },
    ],
  },
  {
    group: "What you owe (liabilities)",
    items: [
      { key: "payables", label: "Creditors (money you owe suppliers)", hint: "Leave blank to use the total from Creditor aging" },
      { key: "shortTermBorrowings", label: "Bank loans due within 1 year", hint: "Overdraft, trust receipts, loan instalments due this year" },
      { key: "otherCurrentLiabilities", label: "Other amounts due within 1 year", hint: "Accruals, tax, staff, etc." },
      { key: "longTermBorrowings", label: "Bank loans due after 1 year" },
    ],
  },
  {
    group: "Owners & business size",
    items: [
      { key: "equity", label: "Shareholders' equity", hint: "Total equity on your balance sheet" },
      { key: "annualSales", label: "Sales for the year", hint: "Used for debtor days" },
      { key: "annualCostOfSales", label: "Cost of sales for the year", hint: "Used for creditor days" },
    ],
  },
];

function FiguresTab({ f, setF, r, onSample, onClear }: { f: Figures; setF: (f: Figures) => void; r: ReturnType<typeof ratios>; onSample: () => void; onClear: () => void }): ReactNode {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Type the figures from your latest balance sheet (in RM). The dashboard works everything out as you type, and remembers them on this computer.
      </p>
      <div className="grid gap-5 lg:grid-cols-3">
        {FIELDS.map((g) => (
          <div key={g.group} className="space-y-4 rounded-xl border bg-white p-5">
            <h2 className="font-semibold text-gray-900">{g.group}</h2>
            {g.items.map((it) => (
              <label key={it.key} className="block text-sm text-gray-700">
                {it.label}
                <input
                  inputMode="decimal"
                  value={f[it.key]}
                  onChange={(e) => setF({ ...f, [it.key]: e.target.value })}
                  placeholder={it.key === "receivables" ? formatRM(r.receivables) : it.key === "payables" ? formatRM(r.payables) : "0.00"}
                  className={cn(inp, "mt-1")}
                />
                {it.hint && <span className="mt-1 block text-xs text-gray-400">{it.hint}</span>}
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onSample}>
          <Sparkles className="size-4" /> Fill with example numbers
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm("Clear all figures and both invoice lists? This cannot be undone.")) onClear();
          }}
        >
          <Trash2 className="size-4" /> Clear everything
        </Button>
      </div>
    </div>
  );
}
