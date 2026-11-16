"use client";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Lock, Paperclip, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClaimForm, ScaledPage } from "@/components/claim-form";
import { COLS, MONTH_NAMES, TODAY, blankRows, canEditClaim, claimTotals, defaultPeriod, formatDate, formatRM, periodDays, periodText, round2, type AmountKey, type DayRow } from "@/lib/data";
import { useStore } from "@/lib/store";
import { saveFiles, type Receipt } from "@/lib/receipts";
import { ReceiptGallery } from "@/components/receipt-gallery";
import { useUser } from "@/lib/user-context";

type RowS = { day: number; location: string } & Record<AmountKey, string>;

const toRowS = (r: DayRow): RowS => ({
  day: r.day, location: r.location,
  ...(Object.fromEntries(COLS.map((c) => [c.key, r[c.key] ? String(r[c.key]) : ""])) as Record<AmountKey, string>),
});
const toRow = (r: RowS): DayRow => ({
  day: r.day, location: r.location.trim(),
  ...(Object.fromEntries(COLS.map((c) => [c.key, round2(Number(r[c.key]) || 0)])) as Record<AmountKey, number>),
});

const inp = "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const cell = "w-full border-0 bg-transparent px-1.5 py-1.5 text-xs outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-primary";

export default function NewClaimPage() {
  return (
    <Suspense>
      <WaitForData />
    </Suspense>
  );
}

// the form starts from saved data when editing, so wait until it has loaded
function WaitForData() {
  const { loading, claims } = useStore();
  const editId = useSearchParams().get("edit");
  // the page can be kept alive in the background, so give each claim (and each new blank claim) its own fresh form
  return loading ? <p className="text-sm text-gray-500">Loading…</p> : <ClaimEditor key={editId ?? `new-${claims.length}`} />;
}

function ClaimEditor() {
  const { user } = useUser();
  const router = useRouter();
  const editId = useSearchParams().get("edit");
  const { claims, salespeople, saveClaim } = useStore();
  const editing = claims.find((c) => c.id === editId && canEditClaim(user, c));

  const [spId, setSpId] = useState(editing?.salespersonId ?? (user.role === "salesman" ? user.salespersonId ?? "" : ""));
  const dp = defaultPeriod(TODAY);
  // periods this sales person already has a claim for (the claim being edited does not count)
  const takenFor = (id: string) => new Set(claims.filter((c) => c.id !== editing?.id && c.salespersonId === id).map((c) => `${c.periodMonth}|${c.half}`));
  // first period from the given one onwards that has no claim yet
  const nextFree = (id: string, m: string, h: 1 | 2): { month: string; half: 1 | 2 } => {
    const t = takenFor(id);
    let [y, mo] = m.split("-").map(Number);
    let hh: 1 | 2 = h;
    for (let i = 0; i < 48 && t.has(`${y}-${String(mo).padStart(2, "0")}|${hh}`); i++) {
      if (hh === 1) hh = 2;
      else { hh = 1; mo++; if (mo > 12) { mo = 1; y++; } }
    }
    return { month: `${y}-${String(mo).padStart(2, "0")}`, half: hh };
  };
  const start = editing ? { month: editing.periodMonth, half: editing.half } : nextFree(spId, dp.periodMonth, dp.half);
  const [month, setMonth] = useState(start.month);
  const [half, setHalf] = useState<1 | 2>(start.half);
  const taken = takenFor(spId);
  const isTaken = (m: string, h: 1 | 2) => taken.has(`${m}|${h}`);
  const period = periodText(month, half);
  const { from: dayFrom, to: dayTo } = periodDays(month, half);
  const [yy, mm] = month.split("-").map(Number);
  const [ref, setRef] = useState(editing?.referenceNo ?? "LCS 2026");
  const [rows, setRows] = useState<RowS[]>((editing?.rows ?? blankRows()).map(toRowS));
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [receipts, setReceipts] = useState<Receipt[]>(editing?.receipts ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"fill" | "preview">("fill");
  const [errors, setErrors] = useState<string[]>([]);

  const numericRows = useMemo(() => rows.map(toRow), [rows]);
  const totals = claimTotals(numericRows);
  const sp = salespeople.find((s) => s.id === spId);

  if (!user.canEdit)
    return (
      <div className="mx-auto mt-16 max-w-sm text-center text-gray-600">
        <Lock className="mx-auto mb-3 size-10 text-gray-400" />
        <p className="font-medium">You do not have permission to key in or edit claims.</p>
      </div>
    );

  const changePeriod = (newMonth: string, wantedHalf: 1 | 2) => {
    // if that half is already claimed, use the other half of the month
    const newHalf: 1 | 2 = isTaken(newMonth, wantedHalf) && !isTaken(newMonth, wantedHalf === 1 ? 2 : 1) ? (wantedHalf === 1 ? 2 : 1) : wantedHalf;
    const { from, to } = periodDays(newMonth, newHalf);
    // clear anything keyed on days that fall outside the new period
    setRows((l) => l.map((r) => (r.day >= from && r.day <= to ? r : { ...r, location: "", food: "", accom: "", toll: "", parking: "", petrol: "", ent: "", others: "" })));
    setMonth(newMonth);
    setHalf(newHalf);
  };

  const setCell = (day: number, key: "location" | AmountKey, value: string) =>
    setRows((l) => l.map((r) => (r.day === day ? { ...r, [key]: value } : r)));

  const onEnter = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    (document.querySelector(`[data-cell="${rowIdx + 1}-${colIdx}"]`) as HTMLInputElement | null)?.focus();
  };

  const save = async () => {
    const errs: string[] = [];
    if (!spId) errs.push("Choose the sales person.");
    if (totals.grand <= 0) errs.push("Key in at least one amount.");
    // (an old claim that already shares its period with another can still be edited, as long as its period is kept)
    if ((!editing || editing.periodMonth !== month || editing.half !== half) && claims.some((c) => c.id !== editing?.id && c.salespersonId === spId && c.periodMonth === month && c.half === half))
      errs.push(`There is already a claim for this sales person for ${period}. Please edit that claim, or choose a different claim period.`);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    try {
      const id = await saveClaim({ referenceNo: ref.trim(), salespersonId: spId, period, periodMonth: month, half, rows: numericRows, notes: notes.trim(), receipts }, user, editing?.id);
      router.push(`/claims/${id}`);
    } catch (err) {
      setErrors([(err as Error).message]);
      setSaving(false);
    }
  };

  const active = salespeople.filter((s) => (user.role !== "salesman" || s.id === user.salespersonId) && (!s.suspended || s.id === editing?.salespersonId));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{editing ? "Edit claim" : "New claim"}</h1>
          <p className="text-sm text-gray-500">Fill in on the left. The claim form on the right updates as you type.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500">Grand total</div>
            <div className="text-xl font-bold text-primary">{formatRM(totals.grand)}</div>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2"><Save className="size-4" /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="mb-3 flex gap-2 xl:hidden">
        <button onClick={() => setTab("fill")} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${tab === "fill" ? "border-primary bg-primary text-white" : "bg-white"}`}>Fill in</button>
        <button onClick={() => setTab("preview")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium ${tab === "preview" ? "border-primary bg-primary text-white" : "bg-white"}`}><Eye className="size-4" /> Preview</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <div className={`${tab === "fill" ? "" : "hidden"} space-y-4 xl:block`}>
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {errors.map((e) => <div key={e}>• {e}</div>)}
            </div>
          )}

          <section className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Claim details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Sales person</label>
                <select value={spId} onChange={(e) => { setSpId(e.target.value); if (!editing) { const f = nextFree(e.target.value, month, half); setMonth(f.month); setHalf(f.half); } }} disabled={user.role === "salesman"} className={inp}>
                  <option value="">Select sales person…</option>
                  {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {sp && (
                  <div className="mt-2 grid gap-x-4 gap-y-0.5 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 sm:grid-cols-2">
                    <span>Bank acc. name: <b className="text-gray-900">{sp.accountName}</b></span>
                    <span>Position: <b className="text-gray-900">{sp.position}</b></span>
                    <span>Bank: <b className="text-gray-900">{sp.bank}</b></span>
                    <span>Area: <b className="text-gray-900">{sp.area}</b></span>
                    <span>Account no.: <b className="text-gray-900">{sp.accountNo}</b></span>
                    {user.role !== "salesman" && <span className="text-gray-400">Change these in <Link href="/salespeople" className="underline">Sales Person</Link></span>}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Claim period</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={mm} onChange={(e) => changePeriod(`${yy}-${String(e.target.value).padStart(2, "0")}`, half)} className={inp} aria-label="Month">
                    {MONTH_NAMES.map((n, i) => { const m = `${yy}-${String(i + 1).padStart(2, "0")}`; return <option key={n} value={i + 1} disabled={isTaken(m, 1) && isTaken(m, 2)}>{n[0] + n.slice(1).toLowerCase()}{isTaken(m, 1) && isTaken(m, 2) ? " (claimed)" : ""}</option>; })}
                  </select>
                  <select value={yy} onChange={(e) => changePeriod(`${e.target.value}-${String(mm).padStart(2, "0")}`, half)} className={inp} aria-label="Year">
                    {[yy - 1, yy, yy + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={half} onChange={(e) => changePeriod(month, Number(e.target.value) as 1 | 2)} className={inp} aria-label="Half of month">
                    <option value={1} disabled={isTaken(month, 1)}>1st half{isTaken(month, 1) ? " (claimed)" : ""}</option>
                    <option value={2} disabled={isTaken(month, 2)}>2nd half{isTaken(month, 2) ? " (claimed)" : ""}</option>
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  From <b className="text-gray-800">{formatDate(`${month}-${String(dayFrom).padStart(2, "0")}`)}</b> to <b className="text-gray-800">{formatDate(`${month}-${String(dayTo).padStart(2, "0")}`)}</b>. Only the days in this period are shown below; change the period to key other days.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Reference no.</label>
                <input value={ref} onChange={(e) => setRef(e.target.value)} className={inp} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold text-gray-900">Daily expenses (RM)</h2>
              <span className="text-xs text-gray-400">Days {dayFrom}–{dayTo} · Enter = next row</span>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="w-9 px-1 py-2">Day</th>
                    <th className="px-1 text-left">Location</th>
                    {COLS.map((c) => (
                      <th key={c.key} className="w-[78px] px-1 text-right align-top" title={c.sub}>
                        {c.label}
                        {c.gl && <div className="mt-0.5 text-[9px] font-normal normal-case leading-tight text-gray-400">GL CODE:<br />{c.gl}</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => (r.day < dayFrom || r.day > dayTo ? null : (
                    <tr key={r.day} className={r.day < dayFrom || r.day > dayTo ? "bg-gray-100 opacity-50" : Number(r.food) + Number(r.accom) + Number(r.toll) + Number(r.parking) + Number(r.petrol) + Number(r.ent) + Number(r.others) > 0 ? "bg-blue-50/40" : ""}>
                      <td className="px-1 text-center text-xs text-gray-500">{r.day}</td>
                      <td>
                        <input data-cell={`${i}-0`} onKeyDown={(e) => onEnter(e, i, 0)} disabled={r.day < dayFrom || r.day > dayTo} className={cell + " uppercase"} value={r.location} onChange={(e) => setCell(r.day, "location", e.target.value)} placeholder="" />
                      </td>
                      {COLS.map((c, ci) => (
                        <td key={c.key}>
                          <input
                            data-cell={`${i}-${ci + 1}`} onKeyDown={(e) => onEnter(e, i, ci + 1)}
                            inputMode="decimal" disabled={r.day < dayFrom || r.day > dayTo} className={cell + " text-right"} value={r[c.key]}
                            onBlur={(e) => e.target.value !== "" && setCell(r.day, c.key, (Number(e.target.value) || 0).toFixed(2))}
                            onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setCell(r.day, c.key, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  )))}
                </tbody>
                <tfoot className="bg-gray-50 text-xs font-semibold">
                  <tr>
                    <td colSpan={2} className="px-2 py-2.5 text-right">TOTAL (RM)</td>
                    {COLS.map((c) => <td key={c.key} className="px-1.5 text-right">{totals[c.key].toFixed(2)}</td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-white p-4">
              <label className="mb-1 block text-sm font-semibold text-gray-900">Notes</label>
              <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explain Others (e.g. 20th: sample delivery RM7) ..." className={inp} />
            </div>
            <div className="rounded-xl border bg-white p-4">
              <label className="mb-1 block text-sm font-semibold text-gray-900">Receipts / bills</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm text-gray-600 hover:border-primary hover:text-primary">
                <Paperclip className="size-4" /> {uploading ? "Adding…" : "Attach files or photos"}
                <input type="file" multiple accept="image/*,application/pdf" capture="environment" className="sr-only"
                  onChange={async (e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; setUploading(true); try { const added = await saveFiles(files, user.id); setReceipts((l) => [...l, ...added]); } catch (err) { setErrors([(err as Error).message]); } finally { setUploading(false); } }} />
              </label>
              <div className="mt-2"><ReceiptGallery receipts={receipts} onRemove={(id) => setReceipts((l) => l.filter((r) => r.id !== id))} /></div>
            </div>
          </section>

          <div className="flex items-center justify-between rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">{user.role === "salesman" ? "Saving keeps the claim as a draft. Open it afterwards and press Submit to send it to the HOD." : "Saving sends the claim to the HOD for approval."}</p>
            <Button onClick={save} disabled={saving} className="gap-2"><Save className="size-4" /> {saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>

        <div className={`${tab === "preview" ? "" : "hidden"} xl:block`}>
          <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500"><Eye className="size-4" /> Live preview of the claim form</div>
            <ScaledPage>
              <ClaimForm data={{ period, referenceNo: ref, salesperson: sp, rows: numericRows, notes }} watermark="PREVIEW" />
            </ScaledPage>
          </div>
        </div>
      </div>
    </>
  );
}
