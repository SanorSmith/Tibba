/**
 * On-screen preview of a lab receipt, with the same Print / PDF controls the
 * pharmacy POS offers. Reprinting is a decision made by eye — the cashier
 * checks it really is the right receipt before putting a second copy of a
 * paid receipt into circulation — so the paper is shown, not just printed.
 */
"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReceiptData } from "./LabReceipt";

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

const titleFor = (kind: ReceiptData["kind"]) =>
  kind === "PAYMENT" ? "PAYMENT RECEIPT" : kind === "REFUND" ? "REFUND NOTE" : "SHIFT SUMMARY";

export default function LabReceiptTemplate({
  data,
  isReprint = false,
  printFormat = "THERMAL",
}: {
  data: ReceiptData;
  isReprint?: boolean;
  printFormat?: "THERMAL" | "PDF" | "BROWSER";
}) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const handleBrowserPrint = useReactToPrint({ contentRef: receiptRef });

  const title = titleFor(data.kind);

  const handlePDFDownload = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text(data.facility, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, 28, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Receipt: ${data.number}`, 15, 44);
    doc.text(`Date: ${new Date(data.dateTime).toLocaleString()}`, pageWidth - 15, 44, { align: "right" });

    if (isReprint) {
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(14);
      doc.text("*** REPRINT ***", pageWidth / 2, 54, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
    }

    let y = 66;
    if (data.patientName) { doc.text(`Patient: ${data.patientName}`, 15, y); y += 6; }
    if (data.invoiceNumber) { doc.text(`Invoice: ${data.invoiceNumber}`, 15, y); y += 6; }
    if (data.method) { doc.text(`Method: ${data.method}`, 15, y); y += 6; }
    if (data.cashier) { doc.text(`Cashier: ${data.cashier}`, 15, y); y += 6; }
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Description", "Qty", "Amount (IQD)"]],
      body: data.lines.map((l) => [
        l.label,
        l.qty != null ? String(l.qty) : "",
        l.amount != null ? money(l.amount) : "",
      ]),
      theme: "plain",
      styles: { fontSize: 9 },
      headStyles: { fontStyle: "bold" },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    const totals = totalRows(data);
    doc.setFontSize(10);
    for (const [label, value] of totals) {
      doc.text(`${label}: ${value}`, pageWidth - 15, y, { align: "right" });
      y += 6;
    }

    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you", pageWidth / 2, y, { align: "center" });

    doc.save(`${data.kind.toLowerCase()}-${data.number}.pdf`);
  };

  const totals = totalRows(data);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleBrowserPrint}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handlePDFDownload}>
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button>
      </div>

      <div
        ref={receiptRef}
        className={`bg-white p-4 mx-auto ${printFormat === "THERMAL" ? "max-w-[58mm]" : "max-w-[210mm]"}`}
      >
        {isReprint && (
          <div className="text-center text-red-600 font-bold text-sm mb-2">*** REPRINT ***</div>
        )}

        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">{data.facility}</h2>
          <p className="text-xs tracking-widest">{title}</p>
        </div>

        <div className="flex justify-between text-xs mb-4 border-b pb-2">
          <span>{data.number}</span>
          <span>{new Date(data.dateTime).toLocaleString()}</span>
        </div>

        <div className="text-xs space-y-1 mb-4">
          {data.patientName && <p>Patient: {data.patientName}</p>}
          {data.invoiceNumber && <p>Invoice: {data.invoiceNumber}</p>}
          {data.method && <p>Method: {data.method}</p>}
          {data.cashier && <p>Cashier: {data.cashier}</p>}
        </div>

        <div className="border-t border-b py-2 mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Description</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1">{l.label}</td>
                  <td className="text-right">{l.qty ?? ""}</td>
                  <td className="text-right">{l.amount != null ? money(l.amount) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs space-y-1 text-right">
          {totals.map(([label, value], i) => (
            <p key={i} className={label === "Total" ? "font-bold text-sm" : ""}>
              {label}: {value} IQD
            </p>
          ))}
        </div>

        <div className="text-center text-xs text-gray-500 mt-4 pt-2 border-t">
          <p>Thank you</p>
        </div>
      </div>
    </div>
  );
}

/** The money summary, in the order a reader expects to scan it. */
function totalRows(d: ReceiptData): [string, string][] {
  const rows: [string, string][] = [];
  if (d.total != null) rows.push(["Total", money(d.total)]);
  if (d.paid != null) rows.push([d.kind === "REFUND" ? "Refunded" : "Paid", money(d.paid)]);
  if (d.balance != null) rows.push(["Balance", money(d.balance)]);
  if (d.openingCash != null) rows.push(["Opening float", money(d.openingCash)]);
  if (d.expectedCash != null) rows.push(["Expected in drawer", money(d.expectedCash)]);
  if (d.countedCash != null) rows.push(["Counted", money(d.countedCash)]);
  if (d.variance != null) rows.push(["Variance", (d.variance > 0 ? "+" : "") + money(d.variance)]);
  return rows;
}
