"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Download, FileText, Send, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { claimTotal, formatDate, formatRM, getSalesperson, round2, TODAY } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/user-context";

type Sel = null | "draft" | "submitted" | "pending" | "approved" | "rejected" | "range";

const monthEnd = (m: string) => `${m}-${String(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;

export default function Dashboard() {
  const { user } = useUser();
  const { claims: allClaims, salespeople } = useStore();
  // a salesperson only ever sees their own claims here
  const claims = user.role === "salesman" ? allClaims.filter((c) => c.salespersonId === user.salespersonId) : allClaims;
  const by = (s: string) => claims.filter((c) => c.status === s);
  const sum = (l: typeof claims) => round2(l.reduce((a, c) => a + claimTotal(c), 0));
  const submitted = claims.filter((c) => c.status !== "draft"); // everything already sent to the HOD
  const month = TODAY.slice(0, 7);
  const [from, setFrom] = useState(`${month}-01`);
  const [to, setTo] = useState(monthEnd(month));
  const [sel, setSel] = useState<Sel>(null);
  const pick = (v: Sel) => setSel((cur) => (cur === v ? null : v));
  const showDraft = user.isSuper === true;
  const showSubmitted = user.role === "salesman" || user.isSuper === true;

  // approved claims whose approval date falls inside the chosen dates
  const approvedRange = by("approved").filter((c) => (c.checkedBy?.date ?? "") >= from && (c.checkedBy?.date ?? "") <= to);
  const isThisMonth = from === `${month}-01` && to === monthEnd(month);
  const byApproval = (a: (typeof claims)[number], b: (typeof claims)[number]) => ((b.checkedBy?.date ?? "") + b.id > (a.checkedBy?.date ?? "") + a.id ? 1 : -1);

  const groups: Record<Exclude<Sel, null>, { title: string; list: typeof claims }> = {
    draft: { title: "Draft claims (not submitted)", list: by("draft") },
    submitted: { title: "Submitted claims", list: submitted },
    pending: { title: "Pending HOD approval", list: by("pending") },
    approved: { title: "Approved claims", list: by("approved") },
    rejected: { title: "Rejected claims", list: by("rejected") },
    range: { title: `Approved ${isThisMonth ? "this month" : `from ${formatDate(from)} to ${formatDate(to)}`}`, list: [...approvedRange].sort(byApproval) },
  };
  const shown = sel
    ? groups[sel].list
    : [...claims].sort((a, b) => (b.submittedAt + b.id > a.submittedAt + a.id ? 1 : -1)).slice(0, 6);
  const listTitle = sel ? groups[sel].title : "Recent claims";

  const pendingStat = <Stat active={sel === "pending"} onClick={() => pick("pending")} icon={<Clock className="size-4 text-yellow-600" />} label="Pending HOD approval" value={String(by("pending").length)} sub={formatRM(sum(by("pending")))} />;
  const cols = user.isSuper ? "lg:grid-cols-3 xl:grid-cols-6" : user.role === "salesman" ? "lg:grid-cols-5" : "lg:grid-cols-4";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.role === "admin" ? "Hello, Admin 👋" : user.role === "salesman" ? `Hello, ${user.name} 👋` : "Hello, HOD 👋"}</h1>
          <p className="mt-1 text-sm text-gray-500">{formatDate(TODAY)} · {user.role === "salesman" ? "Your expense claims" : "Salesman expense claims"}</p>
        </div>
      </div>

      {(user.role === "hod" || user.isSuper) && by("pending").length > 0 && (
        <Link href="/approvals" className="mb-5 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-primary" />
            <div>
              <div className="font-semibold text-gray-900">{by("pending").length} claim{by("pending").length > 1 ? "s" : ""} waiting for your approval</div>
              <div className="text-sm text-gray-600">Total {formatRM(sum(by("pending")))}</div>
            </div>
          </div>
          <ArrowRight className="size-5 text-primary" />
        </Link>
      )}

      {user.role === "salesman" && by("draft").length > 0 && (
        <Link href="/claims" className="mb-5 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-primary" />
            <div className="font-semibold text-gray-900">You have {by("draft").length} draft claim{by("draft").length > 1 ? "s" : ""} not submitted yet</div>
          </div>
          <ArrowRight className="size-5 text-primary" />
        </Link>
      )}

      <div className={`grid grid-cols-2 gap-3 ${cols}`}>
        {showDraft && <Stat active={sel === "draft"} onClick={() => pick("draft")} icon={<FileText className="size-4 text-gray-500" />} label="Draft (not submitted)" value={String(by("draft").length)} sub={formatRM(sum(by("draft")))} />}
        {showSubmitted && <Stat active={sel === "submitted"} onClick={() => pick("submitted")} icon={<Send className="size-4 text-primary" />} label="Submitted (all sent to HOD)" value={String(submitted.length)} sub={formatRM(sum(submitted))} />}
        {pendingStat}
        <Stat active={sel === "approved"} onClick={() => pick("approved")} icon={<CheckCircle2 className="size-4 text-green-600" />} label="Approved (ready to download)" value={String(by("approved").length)} sub={formatRM(sum(by("approved")))} />
        <Stat active={sel === "rejected"} onClick={() => pick("rejected")} icon={<XCircle className="size-4 text-red-600" />} label="Rejected (needs fixing)" value={String(by("rejected").length)} sub={formatRM(sum(by("rejected")))} />
        <Stat active={sel === "range"} onClick={() => pick("range")} icon={<Download className="size-4 text-primary" />} label={isThisMonth ? "Approved this month" : "Approved in chosen dates"} value={formatRM(sum(approvedRange))} sub={`${approvedRange.length} claim${approvedRange.length === 1 ? "" : "s"}`}>
          <div className="mt-2 space-y-1 text-[11px] text-gray-500" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <label className="flex items-center justify-between gap-1">From <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="w-[8.5rem] rounded border bg-white px-1 py-0.5 text-xs text-gray-800" /></label>
            <label className="flex items-center justify-between gap-1">To <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="w-[8.5rem] rounded border bg-white px-1 py-0.5 text-xs text-gray-800" /></label>
            {!isThisMonth && <button type="button" className="text-primary underline" onClick={() => { setFrom(`${month}-01`); setTo(monthEnd(month)); }}>Back to this month</button>}
          </div>
        </Stat>
      </div>

      <div className="mt-5 rounded-xl border bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-gray-900">{listTitle}</h2>
            {sel && <p className="text-xs text-gray-500">{shown.length} claim{shown.length === 1 ? "" : "s"} · total <b className="text-gray-900">{formatRM(sum(shown))}</b></p>}
          </div>
          {sel ? (
            <button type="button" onClick={() => setSel(null)} className="text-sm font-medium text-primary hover:underline">Show recent claims</button>
          ) : (
            <Link href="/claims" className="text-sm font-medium text-primary hover:underline">View all</Link>
          )}
        </div>
        <ul className="divide-y">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/claims/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900">{getSalesperson(salespeople, c.salespersonId)?.name}</div>
                  <div className="text-xs text-gray-500">{c.period} · saved {formatDate(c.submittedAt)}{c.status === "approved" && c.checkedBy?.date ? ` · approved ${formatDate(c.checkedBy.date)}` : ""}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold">{formatRM(claimTotal(c))}</span>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No claims here.</p>}
      </div>
    </>
  );
}

function Stat({ icon, label, value, sub, active, onClick, children }: { icon: React.ReactNode; label: string; value: string; sub?: string; active?: boolean; onClick?: () => void; children?: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
      title="Click to list these claims below"
      className={`cursor-pointer rounded-xl border bg-white p-4 transition-colors hover:bg-gray-50 ${active ? "border-primary ring-2 ring-primary/30" : ""}`}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">{icon} {label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
      {children}
    </div>
  );
}
