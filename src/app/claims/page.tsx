"use client";
import Link from "next/link";
import { useState } from "react";
import { Download, Eye, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { claimTotal, formatDate, getSalesperson, money, STATUS_LABEL, type Status } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/user-context";

const FILTERS: ("all" | Status)[] = ["all", "pending", "approved", "rejected"];

export default function Claims() {
  const { user } = useUser();
  const { claims, salespeople, deleteClaim } = useStore();
  const [f, setF] = useState<"all" | Status>("all");
  const [q, setQ] = useState("");

  const list = claims
    .filter((c) => user.role !== "salesman" || c.salespersonId === user.salespersonId)
    .filter((c) => f === "all" || c.status === f)
    .filter((c) => (getSalesperson(salespeople, c.salespersonId)?.name ?? "").toLowerCase().includes(q.toLowerCase()) || c.period.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.submittedAt + b.id > a.submittedAt + a.id ? 1 : -1));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claims</h1>
          <p className="mt-1 text-sm text-gray-500">{user.role === "salesman" ? "Your claim forms." : "All salesman claim forms."} Only approved claims can be downloaded.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-3 size-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sales person or period" className="w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((s) => (
            <button key={s} onClick={() => setF(s)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${f === s ? "border-primary bg-primary text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
              {s === "all" ? "All" : s === "pending" ? "Pending" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Sales person</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Claim period</th>
              <th className="px-4 py-3">Date saved</th>
              <th className="px-4 py-3 text-right">Amount (RM)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((c, i) => {
              const sp = getSalesperson(salespeople, c.salespersonId);
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/claims/${c.id}`} className="font-semibold text-gray-900 hover:text-primary">{sp?.name ?? "Unknown"}</Link>
                    <div className="text-xs text-gray-500">{sp?.position}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{sp?.area}</td>
                  <td className="px-4 py-3 text-gray-600">{c.period}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(c.submittedAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(claimTotal(c))}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/claims/${c.id}`}><Button size="sm" variant="outline" className="gap-1"><Eye className="size-3.5" /> View</Button></Link>
                      {user.canEdit && (c.status === "pending" || c.status === "rejected") && (
                        <Link href={`/claims/new?edit=${c.id}`}><Button size="sm" variant="outline" className="gap-1"><Pencil className="size-3.5" /> Edit</Button></Link>
                      )}
                      {user.canDelete && c.status !== "approved" && (
                        <Button size="sm" variant="outline" className="gap-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => { if (confirm(`Delete the claim for ${sp?.name ?? "this person"} (${c.period})? It will be hidden from all lists.`)) deleteClaim(c.id).catch((e: Error) => alert(e.message)); }}>
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      )}
                      {c.status === "approved" && (
                        <Link href={`/claims/${c.id}?download=1`}><Button size="sm" className="gap-1"><Download className="size-3.5" /> Download</Button></Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <div className="p-10 text-center text-sm text-gray-500">No claims found.</div>}
      </div>
    </>
  );
}
