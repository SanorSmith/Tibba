/**
 * Lab checkout — mirrors Pharmacy's CheckoutDialog: tabbed payment methods,
 * amount tendered, change due, then a printed receipt.
 *
 * It creates the invoice and takes the payment in one action, because at a
 * counter those are one act. The two API calls stay separate underneath so an
 * invoice still exists if payment later has to be corrected.
 */
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Banknote, CreditCard, ShieldCheck, Landmark, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { LabCartItem } from "./LabCart";
import { printReceipt } from "./LabReceipt";

type Method = "CASH" | "CARD" | "INSURANCE" | "TRANSFER";

const METHODS: Array<{ value: Method; label: string; icon: typeof Banknote }> = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "INSURANCE", label: "Insurance", icon: ShieldCheck },
  { value: "TRANSFER", label: "Transfer", icon: Landmark },
];

export function LabCheckoutDialog({
  open,
  onOpenChange,
  workspaceid,
  items,
  total,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceid: string;
  items: LabCartItem[];
  total: number;
  onComplete: () => void;
}) {
  const [method, setMethod] = useState<Method>("CASH");
  const [tendered, setTendered] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [insurer, setInsurer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMethod("CASH");
      setTendered(String(total));
      setCardLast4(""); setInsurer(""); setError(null); setDone(null);
    }
  }, [open, total]);

  const tenderedNum = Number(tendered) || 0;
  // Only cash is physically handed over, so change is meaningless elsewhere.
  const change = method === "CASH" ? Math.max(0, tenderedNum - total) : 0;
  const short = method === "CASH" && tenderedNum < total;

  const complete = async () => {
    if (items.length === 0) return;
    setBusy(true); setError(null);
    try {
      const invRes = await fetch("/api/lims/billing/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceid,
          patientid: items[0].patientId,
          lines: items.map((i) => ({
            source: i.source, ref: i.ref, testCode: i.testCode,
            testName: i.testName, price: i.totalAmount,
          })),
        }),
      });
      const inv = await invRes.json();
      if (!invRes.ok) { setError(inv.error ?? "Could not create invoice"); return; }

      const payRes = await fetch("/api/lims/billing/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceid, invoiceId: inv.invoice.id, amount: total, method,
          cardLast4: cardLast4 || undefined, insuranceCompany: insurer || undefined,
        }),
      });
      const pay = await payRes.json();
      if (!payRes.ok) {
        // The invoice exists; say so rather than implying nothing happened.
        setError(`Invoice ${inv.invoice.invoice_number} was created but payment failed: ${pay.error}`);
        return;
      }

      printReceipt({
        kind: "PAYMENT",
        facility: "Laboratory",
        number: inv.invoice.invoice_number,
        dateTime: new Date().toLocaleString(),
        patientName: items[0].patientName,
        invoiceNumber: inv.invoice.invoice_number,
        lines: items.map((i) => ({ label: i.testName, amount: i.totalAmount })),
        total, paid: total, balance: 0, method,
      });

      setDone(inv.invoice.invoice_number);
      onComplete();
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <div className="font-semibold">Invoice {done} paid</div>
            <p className="text-sm text-muted-foreground">The receipt has been sent to print.</p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border p-3 space-y-1 text-sm max-h-40 overflow-auto">
              {items.map((i) => (
                <div key={i.cartItemId} className="flex justify-between">
                  <span className="truncate">{i.testName}</span>
                  <span>{i.totalAmount.toLocaleString()}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span><span>{total.toLocaleString()} IQD</span>
              </div>
            </div>

            <Tabs value={method} onValueChange={(v) => setMethod(v as Method)}>
              <TabsList className="grid grid-cols-4 w-full">
                {METHODS.map((m) => (
                  <TabsTrigger key={m.value} value={m.value} className="gap-1 text-xs">
                    <m.icon className="h-3.5 w-3.5" /> {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="CASH" className="pt-3 space-y-2">
                <label className="text-xs text-muted-foreground">Amount tendered</label>
                <Input type="number" value={tendered} onChange={(e) => setTendered(e.target.value)} />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Change due</span>
                  <span className="font-semibold">{change.toLocaleString()} IQD</span>
                </div>
              </TabsContent>

              <TabsContent value="CARD" className="pt-3 space-y-2">
                <label className="text-xs text-muted-foreground">Card last 4 digits</label>
                <Input maxLength={4} value={cardLast4} onChange={(e) => setCardLast4(e.target.value)} />
              </TabsContent>

              <TabsContent value="INSURANCE" className="pt-3 space-y-2">
                <label className="text-xs text-muted-foreground">Insurance company</label>
                <Input value={insurer} onChange={(e) => setInsurer(e.target.value)} />
              </TabsContent>

              <TabsContent value="TRANSFER" className="pt-3">
                <p className="text-sm text-muted-foreground">
                  Recorded as a bank transfer for {total.toLocaleString()} IQD.
                </p>
              </TabsContent>
            </Tabs>

            {short && (
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">
                <AlertCircle className="h-3 w-3" /> Tendered is less than the total
              </div>
            )}
            {error && (
              <div className="flex items-center gap-1 text-xs text-red-700 bg-red-50 rounded px-2 py-1.5">
                <AlertCircle className="h-3 w-3" /> {error}
              </div>
            )}

            <Button
              className="w-full gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0] font-semibold"
              size="lg"
              disabled={busy || short || items.length === 0}
              onClick={complete}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {busy ? "Processing..." : `Complete Sale (${total.toFixed(2)})`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
