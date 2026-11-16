"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, Clock, Download, Paperclip, Pencil, Send, Trash2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentPages, ReceiptGallery } from "@/components/receipt-gallery";
import { getReceipt } from "@/lib/receipts";
import { StatusBadge } from "@/components/status-badge";
import { ClaimForm, ScaledPage, downloadClaimPdf } from "@/components/claim-form";
import { canEditClaim, claimTotal, formatDate, formatRM, getSalesperson } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/user-context";

export default function ClaimPage() {
  return (
    <Suspense>
      <ClaimDetail />
    </Suspense>
  );
}

function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const autoDownload = useSearchParams().get("download") === "1";
  const { user } = useUser();
  const { claims, salespeople, decide, deleteClaim, submitClaim } = useStore();
  const router = useRouter();
  const claim = claims.find((c) => c.id === id);
  const exportRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<null | "approve" | "reject" | "submit">(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const autoDone = useRef(false);

  const sp = claim ? getSalesperson(salespeople, claim.salespersonId) : undefined;
  const approved = claim?.status === "approved";

  const download = async () => {
    if (!claim || !approved || !exportRef.current) return;
    setBusy(true);
    setError("");
    try {
      // every attachment (photos and PDF files), earliest first
      const files: { blob: Blob; type: string }[] = [];
      for (const r of claim.receipts) {
        const blob = await getReceipt(r);
        if (blob) files.push({ blob, type: r.type });
      }
      await downloadClaimPdf(exportRef.current, `Claim - ${sp?.name ?? "salesman"} - ${claim.period}.pdf`.replace(/[\\/:*?"<>|]/g, "-"), files);
    } catch {
      setError("Could not create the PDF. Please try again.");
    }
    setBusy(false);
  };

  useEffect(() => {
    if (autoDownload && approved && !autoDone.current) {
      autoDone.current = true;
      const t = setTimeout(() => void download(), 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload, approved]);

  if (!claim)
    return <p className="text-gray-600">Claim not found. <Link href="/claims" className="text-primary underline">Back to Claims</Link></p>;

  const data = { period: claim.period, referenceNo: claim.referenceNo, salesperson: sp, rows: claim.rows, notes: claim.notes, checkedBy: claim.checkedBy };
  const watermark = claim.status === "approved" ? undefined : claim.status === "rejected" ? "REJECTED" : claim.status === "draft" ? "DRAFT\nNOT SUBMITTED" : "PENDING\nHOD APPROVAL";

  return (
    <>
      <Link href={user.role === "hod" ? "/approvals" : "/claims"} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{sp?.name ?? "Unknown"}</h1>
            <StatusBadge status={claim.status} className="text-sm" />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {claim.period} · Ref {claim.referenceNo} · Saved {formatDate(claim.submittedAt)} · <b className="text-gray-900">{formatRM(claimTotal(claim))}</b>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditClaim(user, claim) && (
            <Link href={`/claims/new?edit=${claim.id}`}>
              <Button variant="outline" className="gap-2"><Pencil className="size-4" /> Edit</Button>
            </Link>
          )}
          {user.canDelete && claim.status !== "approved" && (
            <Button
              variant="outline"
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm(`Delete the claim for ${sp?.name ?? "this person"} (${claim.period})? It will be hidden from all lists.`))
                  deleteClaim(claim.id).then(() => router.push("/claims")).catch((e: Error) => alert(e.message));
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
          {user.role === "salesman" && user.canEdit && claim.status === "draft" && (
            <Button className="gap-2" onClick={() => setDialog("submit")}><Send className="size-4" /> Submit to HOD</Button>
          )}
          {(user.role === "hod" || user.isSuper) && claim.status === "pending" && (
            <>
              <Button variant="outline" className="gap-2 border-red-300 text-red-600 hover:bg-red-50" onClick={() => setDialog("reject")}><X className="size-4" /> Reject</Button>
              <Button className="gap-2" onClick={() => setDialog("approve")}><Check className="size-4" /> Approve</Button>
            </>
          )}
          <Button className="gap-2" disabled={!approved || busy} onClick={download} title={approved ? "" : "Download is available after HOD approval"}>
            <Download className="size-4" /> {busy ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {claim.status === "draft" && user.role === "salesman" && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-900"><b>This claim is saved as a draft.</b> The HOD cannot see it yet. Check the form and attachments, then press <b>Submit to HOD</b>.</div>
      )}
      {!approved && (
        <p className="mb-3 text-xs text-gray-500">Download is only available after the HOD approves this claim.</p>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {claim.status === "rejected" && claim.rejectReason && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"><b>Rejected by HOD:</b> {claim.rejectReason}</div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <ScaledPage>
            <ClaimForm data={data} watermark={watermark} />
          </ScaledPage>
          <AttachmentPages receipts={claim.receipts} />
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 font-semibold text-gray-900">Approval timeline</h2>
            <ol className="relative space-y-4 border-l-2 border-gray-200 pl-5">
              {claim.timeline.map((e, i) => {
                const Icon = e.type === "approved" ? CheckCircle2 : e.type === "rejected" ? XCircle : e.type === "pending" ? Clock : CheckCircle2;
                const color = e.type === "approved" ? "text-green-600" : e.type === "rejected" ? "text-red-600" : e.type === "pending" ? "text-yellow-600" : "text-primary";
                return (
                  <li key={i} className="relative">
                    <span className="absolute -left-[29px] flex size-5 items-center justify-center rounded-full bg-white"><Icon className={`size-5 ${color}`} /></span>
                    <div className="text-sm font-semibold text-gray-900">{e.label}</div>
                    <div className="text-xs text-gray-500">{e.actor} · {formatDate(e.date)}</div>
                    {e.comment && <div className="mt-1 rounded-md bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700">“{e.comment}”</div>}
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="rounded-xl border bg-white p-4">
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-gray-900"><Paperclip className="size-4" /> Receipts attached</h2>
            <ReceiptGallery receipts={claim.receipts} />
          </section>
        </div>
      </div>

      {/* Hidden full-size copy used to build the PDF (only for approved claims) */}
      {approved && (
        <div aria-hidden style={{ position: "fixed", left: -10000, top: 0 }}>
          <div ref={exportRef}><ClaimForm data={data} /></div>
        </div>
      )}

      {dialog === "submit" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Submit this claim to the HOD?</h3>
            <p className="mt-1 text-sm text-gray-500">{sp?.name} · {claim.period} · {formatRM(claimTotal(claim))}</p>
            <p className="mt-3 text-sm text-gray-700">Once submitted, the HOD will review it and you cannot change it unless it is rejected.</p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)}>Cancel</Button>
              <Button className="flex-1" disabled={busy} onClick={() => { setBusy(true); submitClaim(claim.id, user).catch((e: Error) => alert(e.message)).finally(() => { setBusy(false); setDialog(null); }); }}>
                {busy ? "Submitting…" : "Yes, submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {(dialog === "approve" || dialog === "reject") && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">{dialog === "approve" ? "Approve this claim?" : "Reject this claim?"}</h3>
            <p className="mt-1 text-sm text-gray-500">{sp?.name} · {claim.period} · {formatRM(claimTotal(claim))}</p>
            <label className="mb-1 mt-4 block text-sm font-medium">Comment {dialog === "reject" ? "(required)" : "(optional)"}</label>
            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDialog(null); setComment(""); }}>Cancel</Button>
              <Button
                className={`flex-1 ${dialog === "reject" ? "bg-red-600 hover:bg-red-700" : ""}`}
                disabled={dialog === "reject" && !comment.trim()}
                onClick={() => { decide([claim.id], dialog === "approve", comment.trim()).catch((e: Error) => alert(e.message)); setDialog(null); setComment(""); }}
              >
                {dialog === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
