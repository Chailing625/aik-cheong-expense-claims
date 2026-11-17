"use client";
import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { getReceipt, type Receipt } from "@/lib/receipts";

/** Shows each attached receipt as a thumbnail. Click to view it full size. */
export function ReceiptGallery({ receipts, onRemove, onNoteChange }: { receipts: Receipt[]; onRemove?: (id: string) => void; onNoteChange?: (id: string, note: string) => void }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [open, setOpen] = useState<Receipt | null>(null);
  const key = receipts.map((r) => r.id).join("|");

  useEffect(() => {
    let alive = true;
    const created: string[] = [];
    (async () => {
      const next: Record<string, string | null> = {};
      for (const r of receipts) {
        const blob = await getReceipt(r);
        if (blob) {
          const u = URL.createObjectURL(blob);
          created.push(u);
          next[r.id] = u;
        } else next[r.id] = null;
      }
      if (alive) setUrls(next);
    })();
    return () => {
      alive = false;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!receipts.length) return <p className="text-sm text-gray-500">No receipts attached.</p>;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2">
        {receipts.map((r) => {
          const url = urls[r.id];
          const isImage = r.type.startsWith("image/");
          return (
            <li key={r.id} className="group relative overflow-hidden rounded-lg border bg-gray-50">
              {url ? (
                isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={r.name} onClick={() => setOpen(r)} className="h-28 w-full cursor-zoom-in object-cover" />
                ) : (
                  <a href={url} target="_blank" rel="noreferrer" className="flex h-28 flex-col items-center justify-center gap-1 text-primary">
                    <FileText className="size-8" />
                    <span className="text-xs">Open PDF</span>
                  </a>
                )
              ) : (
                <div className="flex h-28 flex-col items-center justify-center gap-1 px-2 text-center text-xs text-gray-400">
                  <FileText className="size-6" />
                  {urls[r.id] === undefined ? "Loading…" : "Sample file – no image stored"}
                </div>
              )}
              <div className="truncate border-t bg-white px-2 py-1 text-[11px] text-gray-600">{r.name}</div>
              {onNoteChange ? (
                <input value={r.note ?? ""} maxLength={200} onChange={(e) => onNoteChange(r.id, e.target.value)} placeholder="Note to print on this file" className="w-full border-t bg-white px-2 py-1 text-[11px] outline-none focus:bg-blue-50" />
              ) : r.note ? (
                <div className="border-t bg-yellow-50 px-2 py-1 text-[11px] text-gray-700">{r.note}</div>
              ) : null}
              {onRemove && (
                <button aria-label="Remove" onClick={() => onRemove(r.id)} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow">
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {open && urls[open.id] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(null)}>
          <button aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white p-2"><X className="size-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[open.id]!} alt={open.name} className="max-h-full max-w-full rounded bg-white object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

/** Every attachment shown full size, one after the other (earliest first), to read below the claim form. */
export function AttachmentPages({ receipts }: { receipts: Receipt[] }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const key = receipts.map((r) => r.id).join("|");

  useEffect(() => {
    let alive = true;
    const created: string[] = [];
    (async () => {
      const next: Record<string, string | null> = {};
      for (const r of receipts) {
        const blob = await getReceipt(r);
        if (blob) {
          const u = URL.createObjectURL(blob);
          created.push(u);
          next[r.id] = u;
        } else next[r.id] = null;
      }
      if (alive) setUrls(next);
    })();
    return () => {
      alive = false;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!receipts.length) return null;

  return (
    <div className="mt-4 space-y-4">
      {receipts.map((r, i) => {
        const url = urls[r.id];
        return (
          <div key={r.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">Attachment {i + 1} of {receipts.length} · {r.name}</div>
            {url ? (
              r.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={r.name} className="mx-auto block max-h-[1100px] w-full object-contain" />
              ) : (
                <iframe src={url} title={r.name} className="h-[800px] w-full" />
              )
            ) : (
              <div className="p-8 text-center text-sm text-gray-400">{url === undefined ? "Loading…" : "Sample file – no image stored"}</div>
            )}
            {r.note && <div className="border-t bg-white px-3 py-2 text-left text-sm text-gray-900"><b>Note:</b> {r.note}</div>}
          </div>
        );
      })}
    </div>
  );
}
