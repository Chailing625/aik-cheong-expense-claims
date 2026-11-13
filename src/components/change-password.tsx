"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const inp = "w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";

/** Lets a signed-in person choose their own password. */
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
    if (pw !== pw2) return setMsg({ ok: false, text: "The two passwords are not the same." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw, data: { must_change_password: false } });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setPw("");
    setPw2("");
    setMsg({ ok: true, text: "Password changed." });
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">New password</label>
        <input className={inp} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Type it again</label>
        <input className={inp} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </div>
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button>
    </form>
  );
}
