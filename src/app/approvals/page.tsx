"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Eye, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimTotal, claimTotals, COLS, formatDate, formatRM, getSalesperson } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/user-context";

export default function Approvals() {
  const { user } = useUser();
  const { claims, salespeople, decide } = useStore();
  const [sel, setSel] = useState<string[]>([]);
  const [dialog, setDialog] = useState<null | { type: "approve" | "reject" | "bulk"; id?: string }>(null);
  const [comment, setComment] = useState("");

  if (user.role !== "hod")
    return (
      <div className="mx-auto mt-16 max-w-sm text-center text-gray-600">
        <Lock className="mx-auto mb-3 size-10 text-gray-400" />
        <p className="font-medium">Approvals are for the HOD only.</p>
      </div>
    );

  const list = claims.filter((c) => c.status === "pending").sort((a, b) => (a.submittedAt > b.submittedAt ? 1 : -1));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const close = () => { setDialog(null); setComment(""); };

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">Claims waiting for your approval (oldest first). Open a claim to preview the full form.</p>
      </div>

      {sel.length > 0 && (
        <div className="sticky top-14 z-20 mb-4 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-white shadow-lg lg:top-4">
          <span className="text-sm font-medium">{sel.length} selected</span>
          <Button variant="secondary" size="sm" onClick={() => setDialog({ type: "bulk" })}>Approve selected</Button>
        </div>
      )}

      <div className="space-y-3">
        {list.map((c) => {
          const sp = getSalesperson(salespeople, c.salespersonId);
          const t = claimTotals(c.rows);
          return (
            <div key={c.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start gap-3">
                <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} className="mt-1 size-5 accent-[#2563eb]" aria-label="Select claim" />
                <div className="min-w-[200px] flex-1">
                  <div className="font-semibold text-gray-900">{sp?.name}</div>
                  <div className="text-xs text-gray-500">{c.period} · {sp?.position} · {sp?.area} · saved {formatDate(c.submittedAt)}</div>
                </div>
                <div className="text-right text-lg font-bold">{formatRM(c.rows.length ? claimTotal(c) : 0)}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                {COLS.map((col) => <span key={col.key}>{col.label}: <b className="text-gray-900">{t[col.key].toFixed(2)}</b></span>)}
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Link href={`/claims/${c.id}`}><Button variant="outline" size="sm" className="gap-1.5"><Eye className="size-4" /> Preview form</Button></Link>
                <Button variant="outline" size="sm" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => setDialog({ type: "reject", id: c.id })}><X className="size-4" /> Reject</Button>
                <Button size="sm" className="gap-1.5" onClick={() => setDialog({ type: "approve", id: c.id })}><Check className="size-4" /> Approve</Button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500">🎉 Nothing waiting for your approval.</div>}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">{dialog.type === "reject" ? "Reject this claim?" : dialog.type === "bulk" ? `Approve ${sel.length} claims?` : "Approve this claim?"}</h3>
            <label className="mb-1 mt-4 block text-sm font-medium">Comment {dialog.type === "reject" ? "(required – tell the admin why)" : "(optional)"}</label>
            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={close}>Cancel</Button>
              <Button
                className={`flex-1 ${dialog.type === "reject" ? "bg-red-600 hover:bg-red-700" : ""}`}
                disabled={dialog.type === "reject" && !comment.trim()}
                onClick={() => { decide(dialog.type === "bulk" ? sel : [dialog.id!], dialog.type !== "reject", comment.trim()).catch((e: Error) => alert(e.message)); setSel([]); close(); }}
              >
                {dialog.type === "reject" ? "Reject" : "Approve"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
