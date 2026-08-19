/**
 * Lab POS — collect payment on invoices, run the cash drawer, read the money.
 *
 * Three views: Collect (who owes what), Shift (open/close the drawer),
 * Reports (what was earned vs what came in).
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Receipt, Wallet, BarChart3, AlertCircle, CheckCircle2,
  RefreshCw, LockOpen, Lock, Undo2,
} from "lucide-react";

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
interface Reports {
  range: { from: string; to: string };
  invoiced: { count: number; total: number };
  collected: { total: number; byMethod: Array<{ method: string; amount: number; count: number }> };
  outstanding: { count: number; total: number };
  refunds: { count: number; total: number };
  topTests: Array<{ name: string; count: number; revenue: number }>;
  byCashier: Array<{ name: string; amount: number; count: number }>;
  daily: Array<{ day: string; invoiced: number; collected: number }>;
}

const METHODS = ["CASH", "CARD", "INSURANCE", "TRANSFER"] as const;

const statusColor: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  PARTIALLY_PAID: "bg-orange-100 text-orange-800",
  PENDING: "bg-gray-100 text-gray-800",
};

export default function LabPosTab({ workspaceid }: { workspaceid: string }) {
  const [view, setView] = useState<"collect" | "shift" | "reports">("collect");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [openShift, setOpenShift] = useState<ShiftRow | null>(null);
  const [reports, setReports] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Collect form
  const [payFor, setPayFor] = useState<InvoiceRow | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [cardLast4, setCardLast4] = useState("");
  const [insurer, setInsurer] = useState("");
  const [refundMode, setRefundMode] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  // Shift form
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [varianceReason, setVarianceReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, s, r] = await Promise.all([
        fetch(`/api/lims/billing/invoices?workspaceid=${workspaceid}`),
        fetch(`/api/lims/billing/shifts?workspaceid=${workspaceid}`),
        fetch(`/api/lims/billing/reports?workspaceid=${workspaceid}`),
      ]);
      const iv = await i.json(); const sh = await s.json(); const rp = await r.json();
      setInvoices(iv.invoices ?? []);
      setShifts(sh.shifts ?? []);
      setOpenShift(sh.openShift ?? null);
      setReports(rp.error ? null : rp);
    } catch { setError("Could not load POS data"); }
    finally { setLoading(false); }
  }, [workspaceid]);

  useEffect(() => { load(); }, [load]);

  const startPayment = (inv: InvoiceRow, refund = false) => {
    setPayFor(inv);
    setRefundMode(refund);
    setAmount(refund ? String(inv.paid) : String(inv.balance));
    setMethod("CASH"); setCardLast4(""); setInsurer(""); setRefundReason("");
    setError(null); setOk(null);
  };

  const submitPayment = async () => {
    if (!payFor) return;
    setBusy(true); setError(null); setOk(null);
    try {
      const res = await fetch("/api/lims/billing/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceid, invoiceId: payFor.id, amount: Number(amount), method,
          cardLast4: cardLast4 || undefined,
          insuranceCompany: insurer || undefined,
          isRefund: refundMode, refundReason: refundReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Payment failed"); return; }
      setOk(
        refundMode
          ? `Refunded ${Number(amount).toLocaleString()} — balance now ${data.newBalance.toLocaleString()}`
          : `Received ${Number(amount).toLocaleString()} — ${data.status === "PAID" ? "invoice settled" : `${data.newBalance.toLocaleString()} still owed`}`
      );
      setPayFor(null);
      load();
    } finally { setBusy(false); }
  };

  const openNewShift = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/lims/billing/shifts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceid, openingCash: Number(openingCash) }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not open shift"); return; }
      setOk(`Shift ${d.shift.shiftnumber} opened`);
      load();
    } finally { setBusy(false); }
  };

  const closeShift = async () => {
    if (!openShift) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/lims/billing/shifts", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceid, shiftId: openShift.id, actualCash: Number(actualCash), varianceReason }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not close shift"); return; }
      const v = Number(d.variance);
      setOk(
        v === 0 ? "Shift closed, drawer balanced"
          : `Shift closed with ${v > 0 ? "surplus" : "shortfall"} of ${Math.abs(v).toLocaleString()}`
      );
      setActualCash(""); setVarianceReason("");
      load();
    } finally { setBusy(false); }
  };

  const unpaid = invoices.filter((i) => i.balance > 0.001);
  const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">Lab POS</h2>
          <p className="text-xs text-muted-foreground">
            Collect payment on lab invoices, run the drawer, and read the finances.
          </p>
        </div>
        <div className="flex gap-1">
          {openShift ? (
            <Badge className="bg-green-100 text-green-800 gap-1">
              <LockOpen className="h-3 w-3" /> {openShift.shiftnumber} open
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800 gap-1">
              <Lock className="h-3 w-3" /> No shift open
            </Badge>
          )}
          <Button size="sm" variant={view === "collect" ? "default" : "outline"} onClick={() => setView("collect")} className="gap-1">
            <Receipt className="h-4 w-4" /> Collect
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

      {error && <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {ok && <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2"><CheckCircle2 className="h-4 w-4" /> {ok}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
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
                    No shift is open. The payment will be recorded but won't belong to a drawer.
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

          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0">
              <CardTitle className="text-sm font-semibold">
                Invoices ({invoices.length}) &mdash; {unpaid.length} unpaid
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {invoices.length === 0 ? (
                <div className="flex justify-center py-12 text-sm text-muted-foreground">
                  No invoices yet. Create one in the Billing tab.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Patient</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2"></th>
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
                          <Badge className={statusColor[inv.status ?? "PENDING"] ?? "bg-gray-100 text-gray-800"}>
                            {inv.status ?? "PENDING"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {inv.balance > 0.001 && (
                            <Button size="sm" onClick={() => startPayment(inv)} className="gap-1">
                              <Receipt className="h-3 w-3" /> Pay
                            </Button>
                          )}
                          {inv.paid > 0.001 && (
                            <Button size="sm" variant="outline" className="ml-1 gap-1" onClick={() => startPayment(inv, true)}>
                              <Undo2 className="h-3 w-3" /> Refund
                            </Button>
                          )}
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
        <>
          <Card className="flex-shrink-0">
            <CardHeader className="py-2 px-3 border-b">
              <CardTitle className="text-sm font-semibold">{openShift ? "Close shift" : "Open shift"}</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {openShift ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div><div className="text-xs text-muted-foreground">Opened</div>{new Date(openShift.openingtime).toLocaleString()}</div>
                    <div><div className="text-xs text-muted-foreground">Float</div>{money(Number(openShift.openingcash))}</div>
                    <div><div className="text-xs text-muted-foreground">Cash taken</div>{money(Number(openShift.cashCollected))}</div>
                    <div><div className="text-xs text-muted-foreground">Expected in drawer</div>
                      <span className="font-semibold">{money(Number(openShift.openingcash) + Number(openShift.cashCollected))}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="w-40">
                      <label className="text-xs text-muted-foreground">Counted cash</label>
                      <Input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Variance reason (if any)</label>
                      <Input value={varianceReason} onChange={(e) => setVarianceReason(e.target.value)} />
                    </div>
                    <Button onClick={closeShift} disabled={busy || actualCash === ""} className="gap-1">
                      <Lock className="h-4 w-4" /> Close Shift
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only cash is counted — card and transfer settle with the bank, so including them would always show a false variance.
                  </p>
                </div>
              ) : (
                <div className="flex gap-2 items-end">
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground">Opening float</label>
                    <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
                  </div>
                  <Button onClick={openNewShift} disabled={busy} className="gap-1">
                    <LockOpen className="h-4 w-4" /> Open Shift
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0">
              <CardTitle className="text-sm font-semibold">Shift History</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {shifts.length === 0 ? (
                <div className="flex justify-center py-12 text-sm text-muted-foreground">No shifts yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Shift</th><th className="px-3 py-2">Cashier</th>
                      <th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Txns</th>
                      <th className="px-3 py-2 text-right">Collected</th><th className="px-3 py-2 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => {
                      const v = s.variance != null ? Number(s.variance) : null;
                      return (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{s.shiftnumber}</td>
                          <td className="px-3 py-2">{s.cashiername ?? "—"}</td>
                          <td className="px-3 py-2">
                            <Badge className={s.status === "OPEN" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{s.status}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right">{s.transactions}</td>
                          <td className="px-3 py-2 text-right">{money(Number(s.collected))}</td>
                          <td className={`px-3 py-2 text-right ${v == null ? "" : v === 0 ? "text-green-700" : "text-red-700"}`}>
                            {v == null ? "—" : v === 0 ? "balanced" : money(v)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto space-y-2">
          {!reports ? (
            <div className="flex justify-center py-12 text-sm text-muted-foreground">No report data.</div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Invoiced ({reports.invoiced.count})</div>
                  <div className="text-xl font-bold">{money(reports.invoiced.total)}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">what the lab earned</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Collected</div>
                  <div className="text-xl font-bold text-green-700">{money(reports.collected.total)}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">money actually received</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Outstanding ({reports.outstanding.count})</div>
                  <div className="text-xl font-bold text-orange-700">{money(reports.outstanding.total)}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">still owed</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Refunds ({reports.refunds.count})</div>
                  <div className="text-xl font-bold">{money(reports.refunds.total)}</div>
                </CardContent></Card>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Card>
                  <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm">By payment method</CardTitle></CardHeader>
                  <CardContent className="p-3">
                    {reports.collected.byMethod.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Nothing collected yet.</div>
                    ) : reports.collected.byMethod.map((m) => (
                      <div key={m.method} className="flex justify-between py-1 text-sm">
                        <span>{m.method} <span className="text-muted-foreground">({m.count})</span></span>
                        <span className="font-medium">{money(m.amount)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm">By cashier</CardTitle></CardHeader>
                  <CardContent className="p-3">
                    {reports.byCashier.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No collections yet.</div>
                    ) : reports.byCashier.map((c) => (
                      <div key={c.name} className="flex justify-between py-1 text-sm">
                        <span>{c.name} <span className="text-muted-foreground">({c.count})</span></span>
                        <span className="font-medium">{money(c.amount)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm">Top tests by revenue</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {reports.topTests.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Nothing billed yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b"><tr className="text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2">Test</th><th className="px-3 py-2 text-right">Times billed</th><th className="px-3 py-2 text-right">Revenue</th>
                      </tr></thead>
                      <tbody>
                        {reports.topTests.map((t) => (
                          <tr key={t.name} className="border-b last:border-0">
                            <td className="px-3 py-2">{t.name}</td>
                            <td className="px-3 py-2 text-right">{t.count}</td>
                            <td className="px-3 py-2 text-right font-medium">{money(t.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-2 px-3 border-b">
                  <CardTitle className="text-sm">Daily — {reports.range.from} to {reports.range.to}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {reports.daily.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No activity in this period.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b"><tr className="text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2">Day</th><th className="px-3 py-2 text-right">Invoiced</th><th className="px-3 py-2 text-right">Collected</th>
                      </tr></thead>
                      <tbody>
                        {reports.daily.map((d) => (
                          <tr key={d.day} className="border-b last:border-0">
                            <td className="px-3 py-2">{d.day}</td>
                            <td className="px-3 py-2 text-right">{money(d.invoiced)}</td>
                            <td className="px-3 py-2 text-right text-green-700">{money(d.collected)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
