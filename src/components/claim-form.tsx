"use client";
import { useEffect, useRef, useState } from "react";
import { COLS, claimTotals, formatDate, money, type DayRow, type Salesperson } from "@/lib/data";

export interface FormData {
  period: string;
  referenceNo: string;
  salesperson?: Salesperson;
  rows: DayRow[];
  notes: string;
  checkedBy?: { name: string; date: string };
}

const B = "1px solid #000";
const cellBase: React.CSSProperties = { border: B, padding: "0 4px", height: 21, fontSize: 10.5, textAlign: "center", color: "#000" };
const head: React.CSSProperties = { border: B, padding: "3px 3px", fontSize: 9.5, textAlign: "center", color: "#000", fontWeight: 500, lineHeight: 1.15 };

/** Replica of the Aik Cheong salesman expenses claim form (ECF). Fixed width so it prints and downloads the same everywhere. */
export function ClaimForm({ data, watermark }: { data: FormData; watermark?: string }) {
  const t = claimTotals(data.rows);
  const sp = data.salesperson;
  const line = (label: string, value: string, w = 300) => (
    <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 3 }}>
      <span style={{ width: 92, flexShrink: 0 }}>{label}</span>
      <span style={{ width: 8 }}>:</span>
      <span style={{ width: w, borderBottom: B, minHeight: 15, fontWeight: 600, paddingLeft: 4, whiteSpace: "nowrap", overflow: "hidden" }}>{value}</span>
    </div>
  );
  const colW = [30, 136, 92, 86, 80, 80, 76, 76, 88];

  return (
    <div style={{ position: "relative", width: 800, background: "#fff", color: "#000", padding: "26px 28px 24px", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 11, boxSizing: "border-box" }}>
      {watermark && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 5 }}>
          <div style={{ transform: "rotate(-28deg)", fontSize: 44, fontWeight: 800, color: "rgba(220,38,38,0.13)", textAlign: "center", lineHeight: 1.1, whiteSpace: "pre-line" }}>{watermark}</div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ background: "#000", color: "#fff", width: 62, height: 62, display: "flex", alignItems: "flex-end", padding: 5, fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>ACC</div>
          <div style={{ letterSpacing: 9, fontSize: 18, fontWeight: 500 }}>AIK CHEONG</div>
        </div>
        <div style={{ fontSize: 8, color: "#444" }}>ECF_2026_</div>
      </div>

      <div style={{ marginTop: 18, display: "flex", alignItems: "flex-end" }}>
        <span style={{ fontWeight: 600, width: 232 }}>EXPENSES CLAIM &nbsp;FOR THE MONTH OF</span>
        <span style={{ width: 8 }}>:</span>
        <span style={{ borderBottom: B, width: 320, fontWeight: 700, minHeight: 15, paddingLeft: 4 }}>{data.period}</span>
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 10.5 }}>
        <div>
          {line("BANK ACC. NAME", sp?.accountName ?? "", 280)}
          {line("BANK NAME", sp?.bank ?? "", 280)}
          {line("BANK ACC. NO.", sp?.accountNo ?? "", 280)}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 3 }}>
            <span style={{ width: 98 }}>REFERENCE NO</span>
            <span style={{ width: 8 }} />
            <span style={{ width: 232, borderBottom: B, minHeight: 15, fontWeight: 600, paddingLeft: 4 }}>{data.referenceNo}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 3 }}>
            <span style={{ width: 98 }}>POSITION :</span>
            <span style={{ width: 8 }} />
            <span style={{ width: 232, borderBottom: B, minHeight: 15, fontWeight: 600, paddingLeft: 4 }}>{sp?.position.toUpperCase() ?? ""}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 3 }}>
            <span style={{ width: 98 }}>AREA :</span>
            <span style={{ width: 8 }} />
            <span style={{ width: 232, borderBottom: B, minHeight: 15, fontWeight: 600, paddingLeft: 4 }}>{sp?.area.toUpperCase() ?? ""}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 9.5, lineHeight: 1.5 }}>
        <div>* Kindly attach Original / Approved Receipts / Bills ; Copies are <b><u><i>NOT ACCEPTABLE</i></u></b> ; Attach Exchange Rate Verification (if applicable)</div>
        <div>* Below transaction in <b>RINGGIT MALAYSIA</b></div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, tableLayout: "fixed" }}>
        <colgroup>{colW.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <thead>
          <tr>
            <th rowSpan={3} style={head}>Day</th>
            <th style={head}>Location</th>
            <th style={head}>Food Allowance</th>
            <th colSpan={4} style={head}>Travelling</th>
            <th style={head}>Entertainment</th>
            <th style={head}>Others</th>
          </tr>
          <tr>
            <th rowSpan={2} style={head}>GL CODE :</th>
            {COLS.map((c) => <th key={c.key} style={{ ...head, fontSize: 8.5 }}>{c.sub}</th>)}
          </tr>
          <tr>
            {COLS.map((c) => <th key={c.key} style={{ ...head, fontSize: 8, whiteSpace: "nowrap", padding: "3px 1px" }}>GL CODE :{c.gl && <><br />{c.gl}</>}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.day}>
              <td style={cellBase}>{r.day}</td>
              <td style={{ ...cellBase, whiteSpace: "nowrap", overflow: "hidden", textTransform: "uppercase" }}>{r.location}</td>
              {COLS.map((c) => <td key={c.key} style={cellBase}>{r[c.key] ? money(r[c.key]) : ""}</td>)}
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ ...cellBase, height: 24, fontWeight: 600 }}>TOTAL (RM) :</td>
            {COLS.map((c) => <td key={c.key} style={{ ...cellBase, fontWeight: 700 }}>{money(t[c.key])}</td>)}
          </tr>
          <tr>
            <td colSpan={6} style={{ ...cellBase, height: 54, textAlign: "left", verticalAlign: "top", padding: 4, fontSize: 9.5, whiteSpace: "pre-wrap" }}>
              <b>NOTES:</b> {data.notes}
            </td>
            <td style={{ ...cellBase, textAlign: "left", fontWeight: 700, fontSize: 9.5, lineHeight: 1.3 }}>GRAND<br />TOTAL (RM):</td>
            <td colSpan={2} style={{ ...cellBase, fontWeight: 800, fontSize: 13 }}>{money(t.grand)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 18, fontSize: 9.5 }}>
        <Sig title="SUBMITTED BY :" name={sp?.name.toUpperCase() ?? ""} sub={sp?.position.toUpperCase() ?? ""} />
        <Sig title="CHECKED BY:" name={data.checkedBy?.name.toUpperCase() ?? ""} sub={data.checkedBy ? "Approved " + formatDate(data.checkedBy.date) : ""} role="(HOD / ADMIN )" bold />
        <Sig title="VERIFIED BY:" name="" sub="" role="HR" />
        <Sig title="APPROVED BY:" name="" sub="" role="GENERAL MANAGER / DIRECTOR" />
      </div>
    </div>
  );
}

function Sig({ title, name, sub, role, bold }: { title: string; name: string; sub: string; role?: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ height: 42, display: "flex", alignItems: "flex-end", fontWeight: bold ? 700 : 400, color: "#1d4ed8" }}>{bold ? name : ""}</div>
      <div style={{ borderTop: B, paddingTop: 2, fontWeight: 500, minHeight: 28 }}>
        {!bold && name && <div>{name}</div>}
        {sub && <div style={{ color: bold ? "#166534" : "#000" }}>{sub}</div>}
        {role && <div style={{ fontWeight: 700 }}>{role}</div>}
      </div>
    </div>
  );
}

/** Shrinks the fixed-width form to fit its container (for the on-screen preview). */
export function ScaledPage({ children, width = 800 }: { children: React.ReactNode; width?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(1100);
  useEffect(() => {
    const measure = () => {
      if (outer.current) setScale(Math.min(1, outer.current.clientWidth / width));
      if (inner.current) setH(inner.current.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={outer} className="w-full overflow-hidden rounded-lg border bg-white shadow-sm" style={{ height: h * scale }}>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

/** Turns the form into an A4 PDF, adds every attachment after it in the given order (photos and PDF files), and downloads one file. */
export async function downloadClaimPdf(el: HTMLElement, filename: string, attachments: { blob: Blob; type: string }[] = []) {
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");
  const { PDFDocument } = await import("pdf-lib");
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210, ph = 297, m = 8;
  let w = pw - 2 * m;
  let h = (canvas.height * w) / canvas.width;
  if (h > ph - 2 * m) {
    h = ph - 2 * m;
    w = (canvas.width * h) / canvas.height;
  }
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", (pw - w) / 2, m, w, h);

  const out = await PDFDocument.load(pdf.output("arraybuffer"));
  const PW = 595.28, PH = 841.89, M = 23; // A4 in points
  for (const a of attachments) {
    const bytes = new Uint8Array(await a.blob.arrayBuffer());
    if (a.type === "application/pdf") {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      continue;
    }
    const img = a.type === "image/png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
    const scale = Math.min((PW - 2 * M) / img.width, (PH - 2 * M) / img.height);
    const iw = img.width * scale, ih = img.height * scale;
    const page = out.addPage([PW, PH]);
    page.drawImage(img, { x: (PW - iw) / 2, y: PH - M - ih, width: iw, height: ih });
  }

  const blob = new Blob([new Uint8Array(await out.save())], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
