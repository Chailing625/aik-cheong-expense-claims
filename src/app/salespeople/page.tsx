"use client";
import { useState } from "react";
import { Ban, CheckCircle2, Lock, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useUser } from "@/lib/user-context";
import { useStore } from "@/lib/store";
import { BANKS, type Salesperson } from "@/lib/data";

type Form = { id?: string; name: string; accountName: string; position: string; area: string; bank: string; accountNo: string };
const empty: Form = { name: "", accountName: "", position: "", area: "", bank: BANKS[0], accountNo: "" };
const inp = "w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";

export default function SalesPeople() {
  const { user } = useUser();
  const { salespeople, saveSalesperson, toggleSuspend } = useStore();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"all" | "active" | "suspended">("all");
  const [form, setForm] = useState<Form | null>(null);
  const [confirm, setConfirm] = useState<Salesperson | null>(null);

  if (user.role !== "admin")
    return (
      <div className="mx-auto mt-16 max-w-sm text-center text-gray-600">
        <Lock className="mx-auto mb-3 size-10 text-gray-400" />
        <p className="font-medium">Sales Person is managed by the Admin.</p>
      </div>
    );

  const list = salespeople.filter(
    (s) =>
      (show === "all" || (show === "suspended") === s.suspended) &&
      [s.name, s.position, s.area, s.accountNo].some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );
  const valid = form && form.name.trim() && form.position.trim() && form.area.trim() && form.accountNo.trim();

  return (
    <>
      <PageHeader
        title="Sales Person"
        subtitle={`${salespeople.filter((s) => !s.suspended).length} active · ${salespeople.filter((s) => s.suspended).length} suspended`}
        action={<Button className="gap-2" onClick={() => setForm(empty)}><Plus className="size-4" /> Add sales person</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-3 size-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, area, position or account no." className={inp + " pl-9"} />
        </div>
        <select value={show} onChange={(e) => setShow(e.target.value as typeof show)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Bank account</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {list.map((s) => (
              <tr key={s.id} className={s.suspended ? "bg-gray-50 text-gray-400" : ""}>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.position}</td>
                <td className="px-4 py-3">{s.area}</td>
                <td className="px-4 py-3"><div>{s.accountNo}</div><div className="text-xs text-gray-500">{s.bank}</div></td>
                <td className="px-4 py-3"><Pill s={s} /></td>
                <td className="px-4 py-3"><Actions s={s} onEdit={() => setForm({ ...s })} onToggle={() => setConfirm(s)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="divide-y md:hidden">
          {list.map((s) => (
            <li key={s.id} className={`space-y-1 p-4 text-sm ${s.suspended ? "bg-gray-50" : ""}`}>
              <div className="flex items-start justify-between gap-2"><span className="font-semibold">{s.name}</span><Pill s={s} /></div>
              <div className="text-gray-600">{s.position} · {s.area}</div>
              <div className="text-gray-600">{s.bank} {s.accountNo}</div>
              <div className="pt-1"><Actions s={s} onEdit={() => setForm({ ...s })} onToggle={() => setConfirm(s)} /></div>
            </li>
          ))}
        </ul>
        {list.length === 0 && <div className="p-10 text-center text-sm text-gray-500">No sales person found.</div>}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">{form.id ? "Edit sales person" : "Add sales person"}</h3>
            <div className="mt-4 space-y-3">
              <F label="Name"><input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></F>
              <F label="Bank account name (as in bank)"><input className={inp} value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value.toUpperCase() })} placeholder="Defaults to the name" /></F>
              <F label="Position"><input className={inp} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Sales Executive" /></F>
              <F label="Area"><input className={inp} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Klang Valley" /></F>
              <F label="Bank">
                <select className={inp} value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select>
              </F>
              <F label="Bank account number"><input className={inp} inputMode="numeric" value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} /></F>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>Cancel</Button>
              <Button className="flex-1" disabled={!valid} onClick={() => { void saveSalesperson({ ...form, name: form.name.trim(), accountName: (form.accountName.trim() || form.name.trim()).toUpperCase(), position: form.position.trim(), area: form.area.trim(), accountNo: form.accountNo.trim() }); setForm(null); }}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">{confirm.suspended ? "Reactivate" : "Suspend"} {confirm.name}?</h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirm.suspended ? "They will be active again." : "They will be marked as suspended. Their details are kept and you can reactivate them anytime."}
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button className={`flex-1 ${confirm.suspended ? "" : "bg-red-600 hover:bg-red-700"}`} onClick={() => { toggleSuspend(confirm.id).catch((e: Error) => alert(e.message)); setConfirm(null); }}>
                {confirm.suspended ? "Reactivate" : "Suspend"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Pill({ s }: { s: Salesperson }) {
  return s.suspended ? (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Suspended</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
  );
}

function Actions({ s, onEdit, onToggle }: { s: Salesperson; onEdit: () => void; onToggle: () => void }) {
  return (
    <div className="flex gap-2 md:justify-end">
      <Button size="sm" variant="outline" className="gap-1" onClick={onEdit}><Pencil className="size-3.5" /> Edit</Button>
      <Button size="sm" variant="outline" className={`gap-1 ${s.suspended ? "" : "border-red-300 text-red-600 hover:bg-red-50"}`} onClick={onToggle}>
        {s.suspended ? <><CheckCircle2 className="size-3.5" /> Reactivate</> : <><Ban className="size-3.5" /> Suspend</>}
      </Button>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
