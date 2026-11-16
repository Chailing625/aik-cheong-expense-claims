"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Download, Send, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { claimTotal, formatDate, formatRM, getSalesperson, round2, TODAY } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/user-context";

export default function Dashboard() {
  const { user } = useUser();
  const { claims: allClaims, salespeople } = useStore();
  // a salesperson only ever sees their own claims here
  const claims = user.role === "salesman" ? allClaims.filter((c) => c.salespersonId === user.salespersonId) : allClaims;
  const by = (s: string) => claims.filter((c) => c.status === s);
  const sum = (l: typeof claims) => round2(l.reduce((a, c) => a + claimTotal(c), 0));
  const submitted = claims.filter((c) => c.status !== "draft"); // everything already sent to the HOD
  const recent = [...claims].sort((a, b) => (b.submittedAt + b.id > a.submittedAt + a.id ? 1 : -1)).slice(0, 6);
  const month = TODAY.slice(0, 7);
  const approvedMonth = by("approved").filter((c) => (c.checkedBy?.date ?? "").startsWith(month));

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

      <div className={`grid grid-cols-2 gap-3 ${user.role === "salesman" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        <Stat icon={<Clock className="size-4 text-yellow-600" />} label="Waiting for HOD" value={String(by("pending").length)} sub={formatRM(sum(by("pending")))} />
        {user.role === "salesman" && (
          <Stat icon={<Send className="size-4 text-primary" />} label="Submitted (all sent to HOD)" value={String(submitted.length)} sub={formatRM(sum(submitted))} />
        )}
        <Stat icon={<CheckCircle2 className="size-4 text-green-600" />} label="Approved (ready to download)" value={String(by("approved").length)} sub={formatRM(sum(by("approved")))} />
        <Stat icon={<XCircle className="size-4 text-red-600" />} label="Rejected (needs fixing)" value={String(by("rejected").length)} sub={formatRM(sum(by("rejected")))} />
        <Stat icon={<Download className="size-4 text-primary" />} label="Approved this month" value={formatRM(sum(approvedMonth))} sub={`${approvedMonth.length} claim${approvedMonth.length === 1 ? "" : "s"}`} />
      </div>

      <div className="mt-5 rounded-xl border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent claims</h2>
          <Link href="/claims" className="text-sm font-medium text-primary hover:underline">View all</Link>
        </div>
        <ul className="divide-y">
          {recent.map((c) => (
            <li key={c.id}>
              <Link href={`/claims/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900">{getSalesperson(salespeople, c.salespersonId)?.name}</div>
                  <div className="text-xs text-gray-500">{c.period} · saved {formatDate(c.submittedAt)}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold">{formatRM(claimTotal(c))}</span>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">{icon} {label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
