/**
 * Printable lab documents: payment receipt, refund note, shift summary.
 *
 * Rendered into a hidden window rather than the page, so printing a receipt
 * never drags the surrounding dashboard onto the paper. Sized for 80mm
 * thermal roll, which is what counters actually use, but prints acceptably
 * on A4 too.
 */
"use client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export interface ReceiptLine {
  label: string;
  qty?: number;
  amount?: number;
}

export interface ReceiptData {
  kind: "PAYMENT" | "REFUND" | "SHIFT";
  /** Marks the copy so a duplicate can never be mistaken for the original. */
  isReprint?: boolean;
  facility: string;
  number: string;
  dateTime: string;
  patientName?: string | null;
  invoiceNumber?: string | null;
  lines: ReceiptLine[];
  total?: number;
  paid?: number;
  balance?: number;
  method?: string | null;
  cashier?: string | null;
  // Shift-only
  openingCash?: number;
  expectedCash?: number;
  countedCash?: number;
  variance?: number;
}

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

function buildHtml(d: ReceiptData): string {
  const title =
    d.kind === "PAYMENT" ? "PAYMENT RECEIPT" : d.kind === "REFUND" ? "REFUND NOTE" : "SHIFT SUMMARY";

  const rows = d.lines
    .map(
      (l) => `<tr>
        <td>${escapeHtml(l.label)}${l.qty != null ? ` <span class="muted">x${l.qty}</span>` : ""}</td>
        <td class="r">${l.amount != null ? money(l.amount) : ""}</td>
      </tr>`
    )
    .join("");

  const totals: string[] = [];
  if (d.total != null) totals.push(row("Total", money(d.total), true));
  if (d.paid != null) totals.push(row(d.kind === "REFUND" ? "Refunded" : "Paid", money(d.paid)));
  if (d.balance != null) totals.push(row("Balance", money(d.balance), d.balance > 0));
  if (d.openingCash != null) totals.push(row("Opening float", money(d.openingCash)));
  if (d.expectedCash != null) totals.push(row("Expected in drawer", money(d.expectedCash)));
  if (d.countedCash != null) totals.push(row("Counted", money(d.countedCash)));
  if (d.variance != null)
    totals.push(row("Variance", (d.variance > 0 ? "+" : "") + money(d.variance), d.variance !== 0));

  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} ${escapeHtml(d.number)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: ui-monospace, "Courier New", monospace; font-size: 12px; color: #000; margin: 0; }
  .wrap { width: 72mm; }
  h1 { font-size: 13px; text-align: center; margin: 0 0 2px; letter-spacing: 1px; }
  .facility { text-align: center; font-weight: bold; font-size: 13px; margin-bottom: 2px; }
  .meta { text-align: center; font-size: 11px; margin-bottom: 6px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; padding-left: 6px; }
  .muted { color: #555; }
  .bold td { font-weight: bold; }
  .foot { text-align: center; font-size: 10px; margin-top: 8px; }
  .reprint { text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 4px; }
  @media print { .noprint { display: none; } }
</style></head><body><div class="wrap">
  ${d.isReprint ? `<div class="reprint">*** REPRINT ***</div>` : ""}
  <div class="facility">${escapeHtml(d.facility)}</div>
  <h1>${title}</h1>
  <div class="meta">${escapeHtml(d.number)}<br/>${escapeHtml(d.dateTime)}</div>
  <hr/>
  ${d.patientName ? `<div>Patient: ${escapeHtml(d.patientName)}</div>` : ""}
  ${d.invoiceNumber ? `<div>Invoice: ${escapeHtml(d.invoiceNumber)}</div>` : ""}
  ${d.method ? `<div>Method: ${escapeHtml(d.method)}</div>` : ""}
  ${d.patientName || d.invoiceNumber || d.method ? "<hr/>" : ""}
  <table>${rows}</table>
  ${totals.length ? `<hr/><table>${totals.join("")}</table>` : ""}
  <hr/>
  <div class="foot">
    ${d.cashier ? `Served by ${escapeHtml(d.cashier)}<br/>` : ""}
    Thank you
  </div>
</div>
<script>window.onload = function () { window.print(); };</script>
</body></html>`;
}

function row(label: string, value: string, bold = false) {
  return `<tr class="${bold ? "bold" : ""}"><td>${label}</td><td class="r">${value}</td></tr>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

export function printReceipt(data: ReceiptData) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) {
    // Pop-ups blocked — say so rather than failing silently, since the user
    // is standing at a counter waiting for a piece of paper.
    alert("Allow pop-ups for this site to print receipts.");
    return;
  }
  w.document.write(buildHtml(data));
  w.document.close();
}

export default function PrintReceiptButton({
  data,
  label = "Print",
  size = "sm",
}: {
  data: ReceiptData;
  label?: string;
  size?: "sm" | "default";
}) {
  return (
    <Button size={size} variant="outline" className="gap-1" onClick={() => printReceipt(data)}>
      <Printer className="h-3 w-3" /> {label}
    </Button>
  );
}
