"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./user-context";
import { removeFiles, type Receipt } from "./receipts";
import { blankRows, type Claim, type DayRow, type Salesperson, type TimelineEvent, type User } from "./data";

export interface ClaimInput {
  referenceNo: string;
  salespersonId: string;
  period: string;
  periodMonth: string;
  half: 1 | 2;
  rows: DayRow[];
  notes: string;
  receipts: Receipt[];
}

interface Store {
  loading: boolean;
  error: string;
  claims: Claim[];
  salespeople: Salesperson[];
  saveClaim: (input: ClaimInput, actor: User, id?: string) => Promise<string>;
  submitClaim: (id: string, actor: User) => Promise<void>;
  decide: (ids: string[], approve: boolean, comment: string) => Promise<void>;
  deleteClaim: (id: string) => Promise<void>;
  saveSalesperson: (sp: Omit<Salesperson, "id" | "suspended"> & { id?: string }) => Promise<void>;
  toggleSuspend: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
const num = (v: unknown) => Number(v) || 0;
const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user: me } = useAuth();
  const isSalesman = me?.role === "salesman"; // drafts belong to the salesperson; nobody else sees them
  const [claims, setClaims] = useState<Claim[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const [sp, cl] = await Promise.all([
      supabase.from("salespeople").select("*").order("name"),
      supabase.from("claims").select("*, claim_days(*), claim_events(*), claim_receipts(*)").order("submitted_at", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    if (sp.error || cl.error) {
      setError((sp.error ?? cl.error)!.message);
      setLoading(false);
      return;
    }
    setError("");
    setSalespeople(
      sp.data.map((s) => ({ id: s.id, name: s.name, accountName: s.account_name, position: s.position, area: s.area, bank: s.bank, accountNo: s.account_no, suspended: s.suspended }))
    );
    setClaims(
      cl.data.filter((c) => isSalesman || c.status !== "draft").map((c): Claim => {
        const rows = blankRows().map((r): DayRow => {
          const d = c.claim_days.find((x) => x.day === r.day);
          return d
            ? { day: r.day, location: d.location, food: num(d.food), accom: num(d.accom), toll: num(d.toll), parking: num(d.parking), petrol: num(d.petrol), ent: num(d.ent), others: num(d.others) }
            : r;
        });
        // "waiting for HOD" is worked out from the status, so old waiting rows are ignored
        const timeline = [...c.claim_events]
          .filter((e) => e.type !== "pending")
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((e): TimelineEvent => ({ label: e.label, actor: e.actor, date: e.event_date, type: e.type as TimelineEvent["type"], comment: e.comment ?? undefined }));
        return {
          id: c.id, referenceNo: c.reference_no, salespersonId: c.salesperson_id, period: c.period_text, periodMonth: c.period_month, half: c.half as 1 | 2,
          rows, notes: c.notes, status: c.status as Claim["status"], createdAt: c.created_at, submittedAt: c.submitted_at, timeline,
          receipts: [...c.claim_receipts].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((r) => ({ id: r.id, name: r.name, type: r.type, path: r.storage_path })),
          checkedBy: c.checked_by_name ? { name: c.checked_by_name, date: c.checked_by_date ?? "" } : undefined,
          rejectReason: c.reject_reason ?? undefined,
        };
      })
    );
    setLoading(false);
  }, [isSalesman]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the database
    void reload();
  }, [reload]);

  const saveClaim: Store["saveClaim"] = async (input, actor, id) => {
    const base = id ? claims.find((c) => c.id === id) : undefined;
    const fields = {
      reference_no: input.referenceNo, salesperson_id: input.salespersonId, period_month: input.periodMonth, half: input.half,
      period_text: input.period, notes: input.notes, status: (actor.role === "salesman" ? "draft" : "pending") as "draft" | "pending", checked_by_name: null, checked_by_date: null, reject_reason: null,
    };
    let claimId = id;
    if (claimId) {
      fail((await supabase.from("claims").update({ ...fields, submitted_at: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }) }).eq("id", claimId)).error);
      fail((await supabase.from("claim_days").delete().eq("claim_id", claimId)).error);
    } else {
      const ins = await supabase.from("claims").insert(fields).select("id").single();
      fail(ins.error);
      claimId = ins.data!.id;
    }
    const days = input.rows
      .filter((r) => r.location || r.food || r.accom || r.toll || r.parking || r.petrol || r.ent || r.others)
      .map((r) => ({ claim_id: claimId!, day: r.day, location: r.location, food: r.food, accom: r.accom, toll: r.toll, parking: r.parking, petrol: r.petrol, ent: r.ent, others: r.others }));
    if (days.length) fail((await supabase.from("claim_days").insert(days)).error);

    // receipts: remove the ones taken off, add the new ones
    const keep = new Set(input.receipts.map((r) => r.id));
    const removed = (base?.receipts ?? []).filter((r) => !keep.has(r.id));
    if (removed.length) {
      fail((await supabase.from("claim_receipts").delete().in("id", removed.map((r) => r.id))).error);
      await removeFiles(removed.map((r) => r.path).filter(Boolean) as string[]);
    }
    const had = new Set((base?.receipts ?? []).map((r) => r.id));
    const added = input.receipts.filter((r) => !had.has(r.id) && r.path);
    // one by one, so each gets its own time and they stay in the order they were attached
    for (const r of added)
      fail((await supabase.from("claim_receipts").insert({ id: r.id, claim_id: claimId!, name: r.name, type: r.type, storage_path: r.path! })).error);

    const label = actor.role === "salesman" ? (base ? "Edited (draft, not yet submitted)" : "Saved as draft") : !base ? "Saved and sent to HOD" : base.status === "rejected" ? "Corrected and resubmitted to HOD" : "Edited by admin";
    fail((await supabase.from("claim_events").insert({ claim_id: claimId, label, actor: actor.name, type: "saved" })).error);
    await reload();
    return claimId;
  };

  const submitClaim: Store["submitClaim"] = async (id, actor) => {
    fail((await supabase.from("claims").update({ status: "pending", submitted_at: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }) }).eq("id", id)).error);
    fail((await supabase.from("claim_events").insert({ claim_id: id, label: "Submitted to HOD", actor: actor.name, type: "saved" })).error);
    await reload();
  };

  const decide: Store["decide"] = async (ids, approve, comment) => {
    fail((await supabase.rpc("decide_claims", { p_ids: ids, p_approve: approve, p_comment: comment })).error);
    await reload();
  };

  const deleteClaim: Store["deleteClaim"] = async (id) => {
    fail((await supabase.rpc("delete_claim", { p_id: id })).error);
    await reload();
  };

  const saveSalesperson: Store["saveSalesperson"] = async (sp) => {
    const row = { name: sp.name, account_name: sp.accountName, position: sp.position, area: sp.area, bank: sp.bank, account_no: sp.accountNo };
    fail(sp.id ? (await supabase.from("salespeople").update(row).eq("id", sp.id)).error : (await supabase.from("salespeople").insert(row)).error);
    await reload();
  };

  const toggleSuspend: Store["toggleSuspend"] = async (id) => {
    const cur = salespeople.find((s) => s.id === id);
    if (!cur) return;
    fail((await supabase.from("salespeople").update({ suspended: !cur.suspended }).eq("id", id)).error);
    await reload();
  };

  return (
    <Ctx.Provider value={{ loading, error, claims, salespeople, saveClaim, submitClaim, decide, deleteClaim, saveSalesperson, toggleSuspend, reload }}>{children}</Ctx.Provider>
  );
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
};
