/**
 * Lab Billing & POS — the whole money workflow in one place.
 *
 * Four views following the order work actually happens:
 *   To Bill  — unbilled tests the lab has been asked to run → invoice
 *   Collect  — invoices → take payment or refund
 *   Shift    — open/close the cash drawer
 *   Reports  — what was earned vs what came in
 *
 * Billing never touches reagent stock: stock moves when a test is run
 * (Pull Items), not when it is invoiced.
 */
"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, Search, Receipt, CheckCircle2, AlertCircle, RefreshCw,
  Wallet, BarChart3, ClipboardList, LockOpen, Lock, Undo2, ShoppingCart, Ban,
} from "lucide-react";
import { printReceipt } from "./LabReceipt";
import LabPosPage from "./LabPosPage";
import LabShiftsPage from "./LabShiftsPage";
import LabReportsPage from "./LabReportsPage";

interface PendingLine {
  source: "LIMS" | "EHR"; ref: string; orderId: string;
  patientId: string | null; patientName: string;
  testCode: string | null; testName: string; price: number;
  orderedAt: string | null; orderingProvider: string | null; status: string | null;
}
interface PaymentRow {
  id: string; amount: string; method: string; isrefund: boolean;
  receivedbyname: string | null; createdat: string;
}
interface InvoiceRow {
  id: string; invoiceNumber: string; invoiceDate: string;
  patientName: string | null; total: number; paid: number; balance: number;
  status: string | null; lineCount: number; payments: PaymentRow[];
}
interface ShiftRow {
  id: string; shiftnumber: string; cashiername: string | null; status: string;
  openingtime: string; closingtime: string | null; openingcash: string;
  expectedcash: string | null; actualcash: string | null; variance: string | null;
  collected: string; cashCollected: string; transactions: number;
}

const METHODS = ["CASH", "CARD", "INSURANCE", "TRANSFER"] as const;
const statusColor: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  PARTIALLY_PAID: "bg-orange-100 text-orange-800",
  PENDING: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};
const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function BillingTab({ workspaceid }: { workspaceid: string }) {
  const [view, setView] = useState<"pos" | "bill" | "collect" | "shift" | "reports">("pos");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingLine[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [openShift, setOpenShift] = useState<ShiftRow | null>(null);

  const [query, setQuery] = useState("");
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());

  const [payFor, setPayFor] = useState<InvoiceRow | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [cardLast4, setCardLast4] = useState("");
  const [insurer, setInsurer] = useState("");
  const [refundMode, setRefundMode] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const [cancelFor, setCancelFor] = useState<InvoiceRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, i, s] = await Promise.all([
        fetch(`/api/lims/billing/pending?workspaceid=${workspaceid}`),
        fetch(`/api/lims/billing/invoices?workspaceid=${workspaceid}`),
        fetch(`/api/lims/billing/shifts?workspaceid=${workspaceid}`),
      ]);
      const pj = await p.json(), ij = await i.json(), sj = await s.json();
      setPending(pj.pending ?? []);
      setInvoices(ij.invoices ?? []);
      setOpenShift(sj.openShift ?? null);
    } catch { setError("Could not load billing data"); }
    finally { setLoading(false); }
  }, [workspaceid]);

  useEffect(() => { load(); }, [load]);

  // ── To Bill ───────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((l) =>
      l.patientName.toLowerCase().includes(q) ||
      l.testName.toLowerCase().includes(q) ||
      (l.testCode ?? "").toLowerCase().includes(q) ||
      (l.orderingProvider ?? "").toLowerCase().includes(q));
  }, [pending, query]);

  const selectedLines = pending.filter((l) => selectedRefs.has(l.ref));
  const selectedTotal = selectedLines.reduce((s, l) => s + (l.price || 0), 0);
  const mixedPatients = new Set(selectedLines.map((l) => l.patientId ?? l.patientName)).size > 1;

  const toggle = (ref: string) => setSelectedRefs((prev) => {
    const n = new Set(prev);
    if (n.has(ref)) n.delete(ref); else n.add(ref);
    return n;
  });
  const toggleAll = () => {
    const all = visible.length > 0 && visible.every((l) => selectedRefs.has(l.ref));
    setSelectedRefs((prev) => {
      const n = new Set(prev);
      visible.forEach((l) => (all ? n.delete(l.ref) : n.add(l.ref)));
      return n;
    });
  };

  const createInvoice = async () => {
    if (selectedLines.length === 0 || mixedPatients) return;
    setBusy(true); setError(null); setOk(null);
    try {
      const res = await fetch("/api/lims/billing/invoice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceid, patientid: selectedLines[0].patientId, lines: selectedLines }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not create invoice"); return; }
      setOk(`Invoice ${d.invoice?.invoice_number} created — collect it under Collect`);
      setSelectedRefs(new Set());
      load();
    } finally { setBusy(false); }
  };

  // ── Collect ───────────────────────────────────────────────────────────
  const startPayment = (inv: InvoiceRow, refund = false) => {
    setPayFor(inv); setRefundMode(refund);
    setAmount(refund ? String(inv.paid) : String(inv.balance));
    setMethod("CASH"); setCardLast4(""); setInsurer(""); setRefundReason("");
    setError(null); setOk(null);
  };

  const submitPayment = async () => {
    if (!payFor) return;
    setBusy(true); setError(null); setOk(null);
    try {
      const res = await fetch("/api/lims/billing/payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceid, invoiceId: payFor.id, amount: Number(amount), method,
          cardLast4: cardLast4 || undefined, insuranceCompany: insurer || undefined,
          isRefund: refundMode, refundReason: refundReason || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Payment failed"); return; }
      setOk(refundMode
        ? `Refunded ${money(Number(amount))} — balance now ${money(d.newBalance)}`
        : `Received ${money(Number(amount))} — ${d.status === "PAID" ? "invoice settled" : `${money(d.newBalance)} still owed`}`);
      // Hand the counter its paper immediately; re-printable from the row later.
      printReceipt({
        kind: refundMode ? "REFUND" : "PAYMENT",
        facility: "Laboratory",
        number: d.payment?.id ? String(d.payment.id).slice(0, 8).toUpperCase() : payFor.invoiceNumber,
        dateTime: new Date().toLocaleString(),
        patientName: payFor.patientName,
        invoiceNumber: payFor.invoiceNumber,
        lines: [{ label: refundMode ? "Refund" : "Payment received", amount: Number(amount) }],
        total: payFor.total, paid: d.newPaid, balance: d.newBalance,
        method, cashier: undefined,
      });
      setPayFor(null); load();
    } finally { setBusy(false); }
  };

  // Cancelling is not refunding. A refund returns money while the debt
  // stands; cancelling says the work was never billable, so the tests go back
  // on the pending list to be billed correctly or left alone.
  const cancelInvoice = async () => {
    if (!cancelFor || !cancelReason.trim()) return;
    setBusy(true); setError(null); setOk(null);
    try {
      const res = await fetch("/api/lims/billing/invoice/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceid, invoiceId: cancelFor.id, reason: cancelReason }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not cancel"); return; }
      setOk(
        d.released
          ? `${d.invoiceNumber} cancelled — ${d.released} test(s) back on the billing list`
          : `${d.invoiceNumber} cancelled`
      );
      setCancelFor(null); setCancelReason(""); load();
    } finally { setBusy(false); }
  };

  // ── Shift ─────────────────────────────────────────────────────────────


  const unpaidCount = invoices.filter((i) => i.balance > 0.001).length;

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold leading-tight">Lab Billing &amp; POS</h2>
          <p className="text-xs text-muted-foreground">
            Invoice lab orders, take payment, reconcile the drawer. Reagent stock is unaffected.
          </p>
        </div>
        <div className="flex gap-1 items-center flex-wrap">
          {openShift ? (
            <Badge className="bg-green-100 text-green-800 gap-1"><LockOpen className="h-3 w-3" /> {openShift.shiftnumber}</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800 gap-1"><Lock className="h-3 w-3" /> No shift</Badge>
          )}
          <Button size="sm" variant={view === "pos" ? "default" : "outline"} onClick={() => setView("pos")} className="gap-1">
            <ShoppingCart className="h-4 w-4" /> POS
          </Button>
          <Button size="sm" variant={view === "bill" ? "default" : "outline"} onClick={() => setView("bill")} className="gap-1">
            <ClipboardList className="h-4 w-4" /> To Bill{pending.length ? ` (${pending.length})` : ""}
          </Button>
          <Button size="sm" variant={view === "collect" ? "default" : "outline"} onClick={() => setView("collect")} className="gap-1">
            <Receipt className="h-4 w-4" /> Collect{unpaidCount ? ` (${unpaidCount})` : ""}
          </Button>
          <Button size="sm" variant={view === "shift" ? "default" : "outline"} onClick={() => setView("shift")} className="gap-1">
            <Wallet className="h-4 w-4" /> Shift
          </Button>
          <Button size="sm" variant={view === "reports" ? "default" : "outline"} onClick={() => setView("reports")} className="gap-1">
            <BarChart3 className="h-4 w-4" /> Reports
          </Button>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2 flex-shrink-0"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {ok && <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2 flex-shrink-0"><CheckCircle2 className="h-4 w-4" /> {ok}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : view === "pos" ? (
        <LabPosPage
          workspaceid={workspaceid}
          onNavigate={(v) => setView(v === "refunds" ? "collect" : v)}
        />
      ) : view === "bill" ? (
        <>
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Filter by patient, test or provider..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0">
              <CardTitle className="text-sm font-semibold">
                Unbilled Tests ({visible.length}{query && pending.length !== visible.length ? ` of ${pending.length}` : ""})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {visible.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  {pending.length === 0 ? "Nothing left to bill." : "No matches."}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 w-8">
                        <Checkbox checked={visible.length > 0 && visible.every((l) => selectedRefs.has(l.ref))} onCheckedChange={toggleAll} aria-label="Select all" />
                      </th>
                      <th className="px-3 py-2">Patient</th><th className="px-3 py-2">Test</th>
                      <th className="px-3 py-2">Source</th><th className="px-3 py-2">Provider</th>
                      <th className="px-3 py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((l) => (
                      <tr key={l.ref} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2"><Checkbox checked={selectedRefs.has(l.ref)} onCheckedChange={() => toggle(l.ref)} /></td>
                        <td className="px-3 py-2 font-medium">{l.patientName}</td>
                        <td className="px-3 py-2">{l.testName}{l.testCode && <span className="text-muted-foreground"> ({l.testCode})</span>}</td>
                        <td className="px-3 py-2">
                          <Badge className={l.source === "LIMS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                            {l.source === "LIMS" ? "Lab Order" : "EHR Referral"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{l.orderingProvider ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {l.price ? money(l.price) : <span className="text-orange-600">no price</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
            <div className="flex items-center justify-between border-t p-3 flex-shrink-0">
              <div className="text-sm">
                <span className="text-muted-foreground">Selected: </span><span className="font-semibold">{selectedLines.length}</span>
                <span className="text-muted-foreground ml-3">Total: </span><span className="font-semibold">{money(selectedTotal)}</span>
                {mixedPatients && <span className="ml-3 text-orange-700">Selection spans several patients — invoice one at a time.</span>}
              </div>
              <Button disabled={selectedLines.length === 0 || busy || mixedPatients} onClick={createInvoice} className="gap-1">
                <Receipt className="h-4 w-4" />{busy ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </Card>
        </>
      ) : view === "collect" ? (
        <>
          {payFor && (
            <Card className="flex-shrink-0 border-blue-300">
              <CardHeader className="py-2 px-3 border-b">
                <CardTitle className="text-sm font-semibold">
                  {refundMode ? "Refund" : "Take payment"} — {payFor.invoiceNumber} ({payFor.patientName})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {!openShift && !refundMode && (
                  <div className="text-xs text-orange-700 bg-orange-50 rounded p-2">
                    No shift is open — the payment will be recorded but won&apos;t belong to a drawer.
                  </div>
                )}
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="w-32">
                    <label className="text-xs text-muted-foreground">Amount</label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground">Method</label>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                      {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {method === "CARD" && (
                    <div className="w-28">
                      <label className="text-xs text-muted-foreground">Card last 4</label>
                      <Input maxLength={4} value={cardLast4} onChange={(e) => setCardLast4(e.target.value)} />
                    </div>
                  )}
                  {method === "INSURANCE" && (
                    <div className="w-48">
                      <label className="text-xs text-muted-foreground">Insurer</label>
                      <Input value={insurer} onChange={(e) => setInsurer(e.target.value)} />
                    </div>
                  )}
                  {refundMode && (
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-xs text-muted-foreground">Reason</label>
                      <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
                    </div>
                  )}
                  <Button onClick={submitPayment} disabled={busy || !(Number(amount) > 0)} className="gap-1">
                    {refundMode ? <Undo2 className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                    {busy ? "Saving..." : refundMode ? "Refund" : "Take Payment"}
                  </Button>
                  <Button variant="ghost" onClick={() => setPayFor(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {cancelFor && (
            <Card className="flex-shrink-0 border-red-300">
              <CardHeader className="py-2 px-3 border-b">
                <CardTitle className="text-sm font-semibold">Cancel {cancelFor.invoiceNumber}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Voids the invoice and puts its tests back on the billing list. Use this when the work should not
                  have been billed &mdash; to give money back while the debt stands, refund instead.
                </p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Reason (required)</label>
                    <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. billed in error" />
                  </div>
                  <Button variant="destructive" onClick={cancelInvoice} disabled={busy || !cancelReason.trim()} className="gap-1">
                    <Ban className="h-4 w-4" /> Cancel Invoice
                  </Button>
                  <Button variant="ghost" onClick={() => { setCancelFor(null); setCancelReason(""); }}>Keep</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0">
              <CardTitle className="text-sm font-semibold">Invoices ({invoices.length}) &mdash; {unpaidCount} unpaid</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {invoices.length === 0 ? (
                <div className="flex justify-center py-12 text-sm text-muted-foreground">No invoices yet — create one under To Bill.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Patient</th>
                      <th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Balance</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2">{inv.patientName ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{money(inv.total)}</td>
                        <td className="px-3 py-2 text-right">{money(inv.paid)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{money(inv.balance)}</td>
                        <td className="px-3 py-2">
                          <Badge className={statusColor[inv.status ?? "PENDING"] ?? "bg-gray-100 text-gray-800"}>{inv.status ?? "PENDING"}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {inv.balance > 0.001 && <Button size="sm" onClick={() => startPayment(inv)} className="gap-1"><Receipt className="h-3 w-3" /> Pay</Button>}
                          {inv.paid > 0.001 && <Button size="sm" variant="outline" className="ml-1 gap-1" onClick={() => startPayment(inv, true)}><Undo2 className="h-3 w-3" /> Refund</Button>}
                          {inv.paid <= 0.001 && inv.status !== "CANCELLED" && (
                            <Button size="sm" variant="ghost" className="ml-1 gap-1 text-destructive" onClick={() => setCancelFor(inv)}>
                              <Ban className="h-3 w-3" /> Cancel
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="ml-1" onClick={() => printReceipt({
                            kind: "PAYMENT", facility: "Laboratory", number: inv.invoiceNumber,
                            dateTime: new Date(inv.invoiceDate).toLocaleDateString(),
                            patientName: inv.patientName, invoiceNumber: inv.invoiceNumber,
                            lines: inv.payments.map((p) => ({ label: `${p.isrefund ? "Refund" : "Payment"} — ${p.method}`, amount: Number(p.amount) })),
                            total: inv.total, paid: inv.paid, balance: inv.balance,
                          })}>Receipt</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      ) : view === "shift" ? (
        <LabShiftsPage workspaceid={workspaceid} onBack={() => setView("pos")} />
      ) : (
        <LabReportsPage workspaceid={workspaceid} onBack={() => setView("pos")} />
      )}
    </div>
  );
}
