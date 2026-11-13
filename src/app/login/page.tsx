"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/user-context";
import { RoastStrip } from "@/components/roast-strip";

const inp = "w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm";

export default function LoginPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, password }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Wrong ID or password.");
      const { error } = await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
      if (error) throw error;
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl border bg-white p-7">
        <RoastStrip />
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-roast-dark font-heading text-sm font-bold text-white">AC</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-900">Aik Cheong Coffee Roaster Sdn Bhd</div>
            <div className="text-xs text-gray-500">Salesman Expense Claims</div>
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Sign in</h1>
        <div>
          <label className="mb-1 block text-sm font-medium">ID</label>
          <input className={inp} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} value={userId} onChange={(e) => setUserId(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input className={inp} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</Button>
        <p className="text-center text-xs text-gray-500">No account yet? Ask the Super Admin to create one for you.</p>
      </form>
    </div>
  );
}
