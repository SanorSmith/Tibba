/**
 * Lab shifts — mirrors Pharmacy's shifts page: a current-shift card with a
 * green OPEN badge, dialogs to open and close, and the history below.
 *
 * Only cash is reconciled. Card and transfer settle with the bank, so
 * counting them in the drawer would report a variance on every shift.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Clock, LockOpen, Lock, Loader2, AlertCircle, Printer, Wallet,
} from "lucide-react";
import { printReceipt } from "./LabReceipt";

interface Shift {
  id: string; shiftnumber: string; cashiername: string | null; status: string;
  openingtime: string; closingtime: string | null; openingcash: string;
  expectedcash: string | null; actualcash: string | null; variance: string | null;
  variancereason: string | null; collected: string; cashCollected: string; transactions: number;
}

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function LabShiftsPage({
  workspaceid,
  onBack,
}: {
  workspaceid: string;
  onBack: () => void;
}) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [current, setCurrent] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lims/billing/shifts?workspaceid=${workspaceid}`);
      const d = await res.json();
      setShifts(d.shifts ?? []);
      setCurrent(d.openShift ?? null);
    } catch { setError("Could not load shifts"); }
    finally { setLoading(false); }
  }, [workspaceid]);

  useEffect(() => { load(); }, [load]);

  const doOpen = async () => {
    setProcessing(true); setError(null);
    try {
      const res = await fetch("/api/lims/billing/shifts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceid, openingCash: Number(openingCash) }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not open shift"); return; }
      setOpenDialog(false); setOpeningCash("0"); load();
    } finally { setProcessing(false); }
  };

  const doClose = async () => {
    if (!current) return;
    setProcessing(true); setError(null);
    try {
      const res = await fetch("/api/lims/billing/shifts", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceid, shiftId: current.id,
          actualCash: Number(closingCash), varianceReason: closeNotes,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not close shift"); return; }
      printReceipt({
        kind: "SHIFT", facility: "Laboratory", number: current.shiftnumber,
        dateTime: new Date().toLocaleString(),
        lines: [
          { label: "Transactions", qty: current.transactions },
          { label: "Collected (all methods)", amount: Number(current.collected) },
          { label: "Cash collected", amount: Number(current.cashCollected) },
        ],
        openingCash: Number(current.openingcash), expectedCash: d.expected,
        countedCash: d.actual, variance: d.variance, cashier: current.cashiername,
      });
      setCloseDialog(false); setClosingCash(""); setCloseNotes(""); load();
    } finally { setProcessing(false); }
  };

  const expected = current ? Number(current.openingcash) + Number(current.cashCollected) : 0;

  return (
    <div className="flex flex-1 flex-col h-full overflow-auto">
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold leading-tight">Shifts</h2>
            <p className="text-sm text-muted-foreground">Cash reconciliation and shift history</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : (
          <>
            {current ? (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {current.shiftnumber}
                    </span>
                    <Badge className="bg-green-100 text-green-700 border-green-300">OPEN</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground">Cashier</div>{current.cashiername ?? "—"}</div>
                    <div><div className="text-xs text-muted-foreground">Opened</div>{new Date(current.openingtime).toLocaleString()}</div>
                    <div><div className="text-xs text-muted-foreground">Transactions</div>{current.transactions}</div>
                    <div><div className="text-xs text-muted-foreground">Collected</div>{money(Number(current.collected))} IQD</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground">Opening float</div>{money(Number(current.openingcash))}</div>
                    <div><div className="text-xs text-muted-foreground">Cash taken</div>{money(Number(current.cashCollected))}</div>
                    <div>
                      <div className="text-xs text-muted-foreground">Expected in drawer</div>
                      <span className="font-semibold">{money(expected)} IQD</span>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
                    onClick={() => { setClosingCash(String(expected)); setCloseDialog(true); }}
                  >
                    <Lock className="h-4 w-4" /> Close Shift
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 flex flex-col items-center gap-3">
                  <Wallet className="h-10 w-10 opacity-30" />
                  <p className="text-sm text-muted-foreground">No shift is open</p>
                  <Button className="gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0]" onClick={() => setOpenDialog(true)}>
                    <LockOpen className="h-4 w-4" /> Open Shift
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">Shift History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {shifts.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No shifts yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2">Shift</th><th className="px-3 py-2">Cashier</th>
                        <th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Txns</th>
                        <th className="px-3 py-2 text-right">Collected</th>
                        <th className="px-3 py-2 text-right">Variance</th><th className="px-3 py-2"></th>
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
                              <Badge className={s.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                {s.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right">{s.transactions}</td>
                            <td className="px-3 py-2 text-right">{money(Number(s.collected))}</td>
                            <td className={`px-3 py-2 text-right ${v == null ? "" : v === 0 ? "text-green-700" : "text-red-700"}`}>
                              {v == null ? "—" : v === 0 ? "balanced" : money(v)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {s.status === "CLOSED" && (
                                <Button
                                  size="sm" variant="ghost" className="gap-1"
                                  onClick={() => printReceipt({
                                    kind: "SHIFT", facility: "Laboratory", number: s.shiftnumber,
                                    dateTime: s.closingtime ? new Date(s.closingtime).toLocaleString() : "",
                                    lines: [
                                      { label: "Transactions", qty: s.transactions },
                                      { label: "Collected", amount: Number(s.collected) },
                                      { label: "Cash collected", amount: Number(s.cashCollected) },
                                    ],
                                    openingCash: Number(s.openingcash),
                                    expectedCash: s.expectedcash ? Number(s.expectedcash) : undefined,
                                    countedCash: s.actualcash ? Number(s.actualcash) : undefined,
                                    variance: v ?? undefined, cashier: s.cashiername,
                                  })}
                                >
                                  <Printer className="h-3 w-3" />
                                </Button>
                              )}
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
        )}
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Open Shift</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Opening float</label>
            <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
            <p className="text-xs text-muted-foreground">Cash already in the drawer before any sales.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button className="bg-[#618FF5] text-white hover:bg-[#4a7ae0]" disabled={processing} onClick={doOpen}>
              {processing ? "Opening..." : "Open Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Close Shift</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected in drawer</span>
              <span className="font-semibold">{money(expected)} IQD</span>
            </div>
            <label className="text-xs text-muted-foreground">Counted cash</label>
            <Input type="number" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} />
            {closingCash !== "" && Number(closingCash) !== expected && (
              <div className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 rounded px-2 py-1.5">
                <AlertCircle className="h-3 w-3" />
                {Number(closingCash) > expected ? "Surplus" : "Shortfall"} of{" "}
                {money(Math.abs(Number(closingCash) - expected))} IQD
              </div>
            )}
            <label className="text-xs text-muted-foreground">Variance reason (if any)</label>
            <Input value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Only cash is counted — card and transfer settle with the bank.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancel</Button>
            <Button className="bg-[#618FF5] text-white hover:bg-[#4a7ae0]" disabled={processing || closingCash === ""} onClick={doClose}>
              {processing ? "Closing..." : "Close Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
