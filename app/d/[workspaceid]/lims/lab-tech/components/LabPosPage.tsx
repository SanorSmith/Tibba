/**
 * Lab Point of Sale — the same shape as Pharmacy's POS terminal.
 *
 * Three columns: find the patient, see what they've been ordered, build the
 * cart, check out. Header carries Shifts / Refunds / Reports / Reprint, as
 * Pharmacy's does.
 *
 * The one structural difference from Pharmacy is deliberate and was agreed:
 * there is no free item search. A lab bills the tests it was asked to run, so
 * the middle column lists pending orders instead of a drug catalogue, and
 * checkout never touches reagent stock.
 */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, User, ClipboardList, Clock, RotateCcw, BarChart3, FileText,
  Plus, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import { LabCart, type LabCartItem } from "./LabCart";
import { LabCheckoutDialog } from "./LabCheckoutDialog";
import { printReceipt } from "./LabReceipt";

interface PendingLine {
  source: "LIMS" | "EHR"; ref: string; orderId: string;
  patientId: string | null; patientName: string;
  testCode: string | null; testName: string; price: number;
  orderedAt: string | null; orderingProvider: string | null; status: string | null;
}
interface InvoiceRow {
  id: string; invoiceNumber: string; invoiceDate: string; patientName: string | null;
  total: number; paid: number; balance: number; status: string | null;
  payments: Array<{ id: string; amount: string; method: string; isrefund: boolean }>;
}
interface ShiftRow {
  id: string; shiftnumber: string; cashiername: string | null; status: string;
  openingcash: string; collected: string; cashCollected: string; transactions: number;
}

export default function LabPosPage({
  workspaceid,
  onNavigate,
}: {
  workspaceid: string;
  onNavigate: (view: "shift" | "reports" | "refunds") => void;
}) {
  const [pending, setPending] = useState<PendingLine[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [openShift, setOpenShift] = useState<ShiftRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{ id: string | null; name: string } | null>(null);
  const [cart, setCart] = useState<LabCartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [savedCodes, setSavedCodes] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, i, s] = await Promise.all([
        fetch(`/api/lims/billing/pending?workspaceid=${workspaceid}`),
        fetch(`/api/lims/billing/invoices?workspaceid=${workspaceid}`),
        fetch(`/api/lims/billing/shifts?workspaceid=${workspaceid}`),
      ]);
      setPending((await p.json()).pending ?? []);
      setInvoices((await i.json()).invoices ?? []);
      setOpenShift((await s.json()).openShift ?? null);
    } catch { setError("Could not load POS data"); }
    finally { setLoading(false); }
  }, [workspaceid]);

  useEffect(() => { load(); }, [load]);

  // Patients who actually have something to bill — searching the whole patient
  // table would mostly return people with nothing outstanding.
  const patients = useMemo(() => {
    const m = new Map<string, { id: string | null; name: string; count: number }>();
    pending.forEach((l) => {
      const key = l.patientId ?? l.patientName;
      const e = m.get(key) ?? { id: l.patientId, name: l.patientName, count: 0 };
      e.count += 1;
      m.set(key, e);
    });
    const q = search.trim().toLowerCase();
    return [...m.values()].filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  }, [pending, search]);

  const patientTests = useMemo(
    () =>
      selectedPatient
        ? pending.filter((l) => (l.patientId ?? l.patientName) === (selectedPatient.id ?? selectedPatient.name))
        : [],
    [pending, selectedPatient]
  );

  const inCart = (ref: string) => cart.some((c) => c.ref === ref);

  const addToCart = (l: PendingLine) => {
    if (inCart(l.ref)) return;
    setCart((prev) => [
      ...prev,
      {
        cartItemId: nextId, ref: l.ref, source: l.source,
        patientId: l.patientId, patientName: l.patientName,
        testName: l.testName, testCode: l.testCode,
        unitPrice: l.price, discountPercent: 0, discountAmount: 0, totalAmount: l.price,
      },
    ]);
    setNextId((n) => n + 1);
  };

  // Recalculate the line from price and discount together — changing either
  // has to move the total, and doing it in one place keeps them consistent.
  const reprice = (c: LabCartItem, unitPrice: number, discountPercent: number): LabCartItem => {
    const pct = Math.min(100, Math.max(0, discountPercent));
    const discountAmount = (unitPrice * pct) / 100;
    return { ...c, unitPrice, discountPercent: pct, discountAmount, totalAmount: unitPrice - discountAmount };
  };

  const updatePrice = (id: number, price: number) =>
    setCart((prev) => prev.map((c) => (c.cartItemId === id ? reprice(c, Math.max(0, price), c.discountPercent) : c)));

  // Persisting the price means the next order for this test arrives already
  // priced, rather than being typed again at the counter.
  const savePrice = async (item: LabCartItem) => {
    if (!item.testCode) return;
    try {
      const res = await fetch("/api/lims/billing/test-price", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceid,
          testCode: item.testCode,
          testName: item.testName,
          price: item.unitPrice,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Could not save the price");
        return;
      }
      setSavedCodes((prev) => new Set(prev).add(item.testCode as string));
      setOk(`${item.testName} priced at ${item.unitPrice.toLocaleString()} for future orders`);
      // Other lines for the same test should show the new price immediately.
      setCart((prev) =>
        prev.map((c) => (c.testCode === item.testCode ? reprice(c, item.unitPrice, c.discountPercent) : c))
      );
    } catch {
      setError("Could not save the price");
    }
  };

  const updateDiscount = (id: number, pct: number) =>
    setCart((prev) => prev.map((c) => (c.cartItemId === id ? reprice(c, c.unitPrice, pct) : c)));

  const subtotal = cart.reduce((s, c) => s + c.unitPrice, 0);
  const discountAmount = cart.reduce((s, c) => s + c.discountAmount, 0);
  const total = cart.reduce((s, c) => s + c.totalAmount, 0);

  const unpaid = invoices.filter((i) => i.balance > 0.001);

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Header — mirrors Pharmacy's POS action row */}
      <div className="flex-shrink-0 pb-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold leading-tight">Point of Sale</h2>
            {openShift ? (
              <Badge className="bg-green-100 text-green-800 text-xs">{openShift.shiftnumber}</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">No shift open</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate("shift")} className="gap-1">
              <Clock className="h-4 w-4" /> Shifts
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate("refunds")} className="gap-1">
              <RotateCcw className="h-4 w-4" /> Refunds
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate("reports")} className="gap-1">
              <BarChart3 className="h-4 w-4" /> Reports
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                const last = invoices[0];
                if (!last) { setError("No invoice to reprint yet"); return; }
                printReceipt({
                  kind: "PAYMENT", facility: "Laboratory", number: last.invoiceNumber,
                  dateTime: new Date(last.invoiceDate).toLocaleDateString(),
                  patientName: last.patientName, invoiceNumber: last.invoiceNumber,
                  lines: last.payments.map((p) => ({
                    label: `${p.isrefund ? "Refund" : "Payment"} — ${p.method}`, amount: Number(p.amount),
                  })),
                  total: last.total, paid: last.paid, balance: last.balance,
                });
              }}
            >
              <FileText className="h-4 w-4" /> Reprint Receipt
            </Button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        {ok && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2">
            <CheckCircle2 className="h-4 w-4" /> {ok}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* Left — patient search + selected patient */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Search className="h-4 w-4" /> Find Patient
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <Input
                    placeholder="Search patient name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="max-h-64 overflow-auto space-y-1">
                    {patients.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No patients with unbilled tests.</p>
                    ) : (
                      patients.map((p) => (
                        <button
                          key={p.id ?? p.name}
                          onClick={() => setSelectedPatient({ id: p.id, name: p.name })}
                          className={`w-full text-left rounded-md border px-2 py-1.5 text-sm hover:bg-gray-50 ${
                            selectedPatient && (selectedPatient.id ?? selectedPatient.name) === (p.id ?? p.name)
                              ? "border-[#618FF5] bg-blue-50"
                              : ""
                          }`}
                        >
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.count} pending test(s)</div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedPatient && (
                <Card className="shadow-sm">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" /> Patient
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 text-sm">
                    <div className="font-medium">{selectedPatient.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {patientTests.length} test(s) awaiting billing
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Middle — pending tests for the selected patient */}
            <div className="lg:col-span-5 space-y-4 overflow-auto">
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Pending Tests
                    {patientTests.length > 0 && (
                      <Badge className="bg-[#618FF5] text-white text-xs ml-1">{patientTests.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {!selectedPatient ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-10">
                      <ClipboardList className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">Select a patient to see their tests</p>
                    </div>
                  ) : patientTests.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Nothing left to bill for this patient.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {patientTests.map((l) => (
                        <div key={l.ref} className="border rounded-md p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{l.testName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {l.testCode ?? "—"} | {l.orderingProvider ?? "no provider"}
                            </p>
                            <Badge
                              className={`mt-1 text-[10px] ${
                                l.source === "LIMS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {l.source === "LIMS" ? "Lab Order" : "EHR Referral"}
                            </Badge>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium">
                              {l.price ? `${l.price.toLocaleString()} IQD` : <span className="text-orange-600">no price</span>}
                            </p>
                            <Button
                              size="sm"
                              className="mt-1 gap-1 h-7 bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
                              disabled={inCart(l.ref)}
                              onClick={() => addToCart(l)}
                            >
                              <Plus className="h-3 w-3" /> {inCart(l.ref) ? "Added" : "Add"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {unpaid.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold">Unpaid Invoices ({unpaid.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-1">
                    {unpaid.slice(0, 6).map((i) => (
                      <div key={i.id} className="flex justify-between text-sm border-b last:border-0 py-1">
                        <span className="truncate">{i.invoiceNumber} — {i.patientName ?? "—"}</span>
                        <span className="font-medium">{i.balance.toLocaleString()} IQD</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right — cart */}
            <div className="lg:col-span-4">
              <LabCart
                items={cart}
                onUpdatePrice={updatePrice}
                onSavePrice={savePrice}
                savedCodes={savedCodes}
                onUpdateDiscount={updateDiscount}
                onRemove={(id) => setCart((p) => p.filter((c) => c.cartItemId !== id))}
                onClear={() => setCart([])}
                subtotal={subtotal}
                discountAmount={discountAmount}
                total={total}
                onCheckout={() => setCheckoutOpen(true)}
                hasShift={!!openShift}
              />
            </div>
          </div>
        </div>
      )}

      <LabCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        workspaceid={workspaceid}
        items={cart}
        total={total}
        onComplete={() => {
          setCart([]);
          setOk("Sale completed");
          load();
        }}
      />
    </div>
  );
}
