"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Lock, Pencil, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/user-context";

interface Account {
  id: string;
  username: string | null;
  full_name: string;
  role: "superadmin" | "admin" | "hod" | "salesman" | "manager" | null;
  active: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  salesperson_id: string | null;
}

const PERMS = [
  { key: "can_view", label: "View" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
] as const;

const ROLE_CHOICE = { admin: "Admin (key in claims)", hod: "HOD (approves)", salesman: "Salesperson (own claims only)" } as const;
const ROLE_NAME = { superadmin: "Super Admin", admin: "Admin (key in claims)", hod: "HOD (approves)", salesman: "Salesperson", manager: "Sales Manager" } as const;
const inp = "w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";

/** Easy-to-read temporary password, e.g. "Maple-Coast-4821" */
function makePassword() {
  const words = ["Maple", "Coast", "River", "Amber", "Cedar", "Pearl", "Stone", "Lotus", "Harbor", "Orchid", "Tiger", "Bamboo"];
  const r = crypto.getRandomValues(new Uint32Array(3));
  return `${words[r[0] % words.length]}-${words[r[1] % words.length]}-${1000 + (r[2] % 9000)}`;
}

async function call(method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/users", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json;
}

export default function UsersPage() {
  const { user } = useUser();
  const [list, setList] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { salespeople } = useStore();
  const [form, setForm] = useState<null | { fullName: string; id: string; role: "admin" | "hod" | "salesman"; salespersonId: string; password: string }>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<null | { id: string; fullName: string; username: string; role: "admin" | "hod" | "salesman" | null; salespersonId: string; label: string }>(null);
  const [editError, setEditError] = useState("");
  const [reveal, setReveal] = useState<null | { title: string; id: string; password: string }>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await call("GET");
      setList(j.users);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    if (user?.isSuper) void load();
  }, [user?.isSuper, load]);

  if (!user.isSuper)
    return (
      <div className="mx-auto mt-16 max-w-sm text-center text-gray-600">
        <Lock className="mx-auto mb-3 size-10 text-gray-400" />
        <p className="font-medium">Only the Super Admin can manage staff accounts.</p>
      </div>
    );

  const create = async () => {
    if (!form) return;
    setBusy(true);
    setFormError("");
    try {
      await call("POST", form);
      setReveal({ title: "Account created", id: form.id.trim().toLowerCase(), password: form.password });
      setForm(null);
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    }
    setBusy(false);
  };

  const patch = async (body: Record<string, unknown>, reveal_?: { id: string; password: string }) => {
    setError("");
    try {
      await call("PATCH", body);
      if (reveal_) setReveal({ title: "New temporary password", ...reveal_ });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    setBusy(true);
    setEditError("");
    try {
      await call("PATCH", { id: edit.id, fullName: edit.fullName, username: edit.username, ...(edit.role ? { role: edit.role } : {}), ...(edit.role === "salesman" ? { salespersonId: edit.salespersonId } : {}) });
      setEdit(null);
      await load();
    } catch (e) {
      setEditError((e as Error).message);
    }
    setBusy(false);
  };

  const remove = async (a: Account) => {
    if (!confirm(`Delete the account of ${a.full_name || a.username} for good? They will not be able to sign in any more. This cannot be undone.`)) return;
    setError("");
    try {
      await call("DELETE", { id: a.id });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">Staff cannot sign themselves up. Create their account here, then tick what each person may do with claims. Edit and Delete only work on claims not yet approved. Approving stays with the HOD.</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm({ fullName: "", id: "", role: "admin", salespersonId: "", password: makePassword() }); setFormError(""); }}>
          <Plus className="size-4" /> Add staff account
        </Button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">ID</th><th className="px-4 py-3">Role</th>{PERMS.map((p) => <th key={p.key} className="px-3 py-3 text-center">{p.label}</th>)}<th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {list.map((a) => {
              const isSuper = a.role === "superadmin";
              return (
                <tr key={a.id} className={a.active ? "" : "bg-gray-50 text-gray-400"}>
                  <td className="px-4 py-3 font-medium">{a.full_name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{a.username}</td>
                  <td className="px-4 py-3">
                    {isSuper ? (
                      <span className="font-medium">Super Admin</span>
                    ) : a.role !== "admin" && a.role !== "hod" ? (
                      <span className="font-medium">{a.role ? ROLE_NAME[a.role] : "—"}{a.role === "salesman" && <span className="block text-xs font-normal text-gray-500">{salespeople.find((s) => s.id === a.salesperson_id)?.name}</span>}</span>
                    ) : (
                      <select value={a.role ?? ""} onChange={(e) => void patch({ id: a.id, role: e.target.value })} className="rounded-md border bg-white px-2 py-1 text-sm">
                        <option value="admin">{ROLE_NAME.admin}</option>
                        <option value="hod">{ROLE_NAME.hod}</option>
                      </select>
                    )}
                  </td>
                  {PERMS.map((p) => (
                    <td key={p.key} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${p.label} claims: ${a.full_name || a.username}`}
                        className="size-4 accent-[#2563eb]"
                        checked={isSuper ? true : a[p.key]}
                        disabled={isSuper}
                        onChange={(e) => void patch({ id: a.id, [p.key]: e.target.checked })}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${a.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{a.active ? "Active" : "Switched off"}</span>
                  </td>
                  <td className="px-4 py-3">
                    {!isSuper && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEdit({ id: a.id, fullName: a.full_name, username: a.username ?? "", role: a.role === "admin" || a.role === "hod" || a.role === "salesman" ? a.role : null, salespersonId: a.salesperson_id ?? "", label: a.role ? ROLE_NAME[a.role] : "" }); setEditError(""); }}>
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { const pw = makePassword(); if (confirm(`Set a new temporary password for ${a.full_name || a.username}? They must change it at next sign-in.`)) void patch({ id: a.id, password: pw }, { id: a.username ?? "", password: pw }); }}>
                          <KeyRound className="size-3.5" /> New password
                        </Button>
                        <Button size="sm" variant="outline" className={`gap-1 ${a.active ? "border-red-300 text-red-600 hover:bg-red-50" : ""}`} onClick={() => { if (!a.active || confirm(`Switch off ${a.full_name || a.username}? They will not be able to sign in.`)) void patch({ id: a.id, active: !a.active }); }}>
                          {a.active ? <><UserX className="size-3.5" /> Switch off</> : <><UserCheck className="size-3.5" /> Switch on</>}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => void remove(a)}>
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <div className="p-6 text-center text-sm text-gray-500">Loading…</div>}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Add staff account</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input className={inp} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ID (they sign in with this)</label>
                <input className={inp} type="text" autoCapitalize="none" spellCheck={false} placeholder="e.g. mary.tan" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, "") })} />
                <p className="mt-1 text-xs text-gray-500">3 to 30 letters, numbers, dots, dashes or underscores. No spaces.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select className={inp} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "hod" | "salesman" })}>
                  <option value="admin">{ROLE_CHOICE.admin}</option>
                  <option value="hod">{ROLE_CHOICE.hod}</option>
                  <option value="salesman">{ROLE_CHOICE.salesman}</option>
                </select>
              </div>
              {form.role === "salesman" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Which sales person is this?</label>
                  <select className={inp} value={form.salespersonId} onChange={(e) => setForm({ ...form, salespersonId: e.target.value })}>
                    <option value="">Choose a sales person…</option>
                    {salespeople.filter((s) => !s.suspended).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Their claims, name and bank details come from this person on the Sales Person list.</p>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">Temporary password</label>
                <div className="flex gap-2">
                  <input className={inp} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: makePassword() })}>New</Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">At least 8 characters. They will be asked to choose their own password at first sign-in.</p>
              </div>
            </div>
            {formError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>Cancel</Button>
              <Button className="flex-1" disabled={busy || (form.role === "salesman" && !form.salespersonId)} onClick={create}>{busy ? "Creating…" : "Create account"}</Button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Edit staff account</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input className={inp} value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ID (they sign in with this)</label>
                <input className={inp} type="text" autoCapitalize="none" spellCheck={false} value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value.toLowerCase().replace(/\s/g, "") })} />
                <p className="mt-1 text-xs text-gray-500">If you change the ID, tell the person their new ID. Their password stays the same.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                {edit.role ? (
                  <select className={inp} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as "admin" | "hod" | "salesman" })}>
                    <option value="admin">{ROLE_CHOICE.admin}</option>
                    <option value="hod">{ROLE_CHOICE.hod}</option>
                    <option value="salesman">{ROLE_CHOICE.salesman}</option>
                  </select>
                ) : (
                  <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700">{edit.label}</p>
                )}
              </div>
              {edit.role === "salesman" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Which sales person is this?</label>
                  <select className={inp} value={edit.salespersonId} onChange={(e) => setEdit({ ...edit, salespersonId: e.target.value })}>
                    <option value="">Choose a sales person…</option>
                    {salespeople.filter((s) => !s.suspended || s.id === edit.salespersonId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            {editError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEdit(null)}>Cancel</Button>
              <Button className="flex-1" disabled={busy || !edit.fullName.trim() || (edit.role === "salesman" && !edit.salespersonId)} onClick={saveEdit}>{busy ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </div>
      )}

      {reveal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">{reveal.title}</h3>
            <p className="mt-1 text-sm text-gray-600">Give these to the staff member. The password is shown only now, so copy it before closing.</p>
            <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
              <div>ID: <b>{reveal.id}</b></div>
              <div>Temporary password: <b className="font-mono">{reveal.password}</b></div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => void copy(`ID: ${reveal.id}\nPassword: ${reveal.password}`)}>
                {copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy</>}
              </Button>
              <Button className="flex-1" onClick={() => setReveal(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
