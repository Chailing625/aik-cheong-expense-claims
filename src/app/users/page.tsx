"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Lock, Plus, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";

interface Account {
  id: string;
  email: string | null;
  full_name: string;
  role: "superadmin" | "admin" | "hod" | null;
  active: boolean;
}

const ROLE_NAME = { superadmin: "Super Admin", admin: "Admin (key in claims)", hod: "HOD (approves)" } as const;
const inp = "w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";

/** Easy-to-read temporary password, e.g. "Maple-Coast-4821" */
function makePassword() {
  const words = ["Maple", "Coast", "River", "Amber", "Cedar", "Pearl", "Stone", "Lotus", "Harbor", "Orchid", "Tiger", "Bamboo"];
  const r = crypto.getRandomValues(new Uint32Array(3));
  return `${words[r[0] % words.length]}-${words[r[1] % words.length]}-${1000 + (r[2] % 9000)}`;
}

async function call(method: "GET" | "POST" | "PATCH", body?: unknown) {
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
  const [form, setForm] = useState<null | { fullName: string; email: string; role: "admin" | "hod"; password: string }>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<null | { title: string; email: string; password: string }>(null);
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
      setReveal({ title: "Account created", email: form.email.trim().toLowerCase(), password: form.password });
      setForm(null);
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    }
    setBusy(false);
  };

  const patch = async (body: Record<string, unknown>, reveal_?: { email: string; password: string }) => {
    setError("");
    try {
      await call("PATCH", body);
      if (reveal_) setReveal({ title: "New temporary password", ...reveal_ });
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
          <p className="mt-1 text-sm text-gray-500">Staff cannot sign themselves up. Create their account here and give them the email and temporary password.</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm({ fullName: "", email: "", role: "admin", password: makePassword() }); setFormError(""); }}>
          <Plus className="size-4" /> Add staff account
        </Button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {list.map((a) => {
              const isSuper = a.role === "superadmin";
              return (
                <tr key={a.id} className={a.active ? "" : "bg-gray-50 text-gray-400"}>
                  <td className="px-4 py-3 font-medium">{a.full_name || "—"}</td>
                  <td className="px-4 py-3">{a.email}</td>
                  <td className="px-4 py-3">
                    {isSuper ? (
                      <span className="font-medium">Super Admin</span>
                    ) : (
                      <select value={a.role ?? ""} onChange={(e) => void patch({ id: a.id, role: e.target.value })} className="rounded-md border bg-white px-2 py-1 text-sm">
                        <option value="admin">{ROLE_NAME.admin}</option>
                        <option value="hod">{ROLE_NAME.hod}</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${a.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{a.active ? "Active" : "Switched off"}</span>
                  </td>
                  <td className="px-4 py-3">
                    {!isSuper && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { const pw = makePassword(); if (confirm(`Set a new temporary password for ${a.full_name || a.email}? They must change it at next sign-in.`)) void patch({ id: a.id, password: pw }, { email: a.email ?? "", password: pw }); }}>
                          <KeyRound className="size-3.5" /> New password
                        </Button>
                        <Button size="sm" variant="outline" className={`gap-1 ${a.active ? "border-red-300 text-red-600 hover:bg-red-50" : ""}`} onClick={() => { if (!a.active || confirm(`Switch off ${a.full_name || a.email}? They will not be able to sign in.`)) void patch({ id: a.id, active: !a.active }); }}>
                          {a.active ? <><UserX className="size-3.5" /> Switch off</> : <><UserCheck className="size-3.5" /> Switch on</>}
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
                <label className="mb-1 block text-sm font-medium">Email (they sign in with this)</label>
                <input className={inp} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select className={inp} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "hod" })}>
                  <option value="admin">{ROLE_NAME.admin}</option>
                  <option value="hod">{ROLE_NAME.hod}</option>
                </select>
              </div>
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
              <Button className="flex-1" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create account"}</Button>
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
              <div>Email: <b>{reveal.email}</b></div>
              <div>Temporary password: <b className="font-mono">{reveal.password}</b></div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => void copy(`Email: ${reveal.email}\nPassword: ${reveal.password}`)}>
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
