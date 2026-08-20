/**
 * Lab POS cart — mirrors the Pharmacy ShoppingCart exactly in layout, icons
 * and behaviour.
 *
 * One difference, and it is deliberate: quantity is fixed at 1 per line. A
 * lab test is either ordered or it isn't — you cannot run "three" of the same
 * requested test on one sample — so the +/- controls Pharmacy needs for packs
 * of tablets would be misleading here. Discount, totals and checkout behave
 * identically.
 */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart as CartIcon, Trash2, X, AlertCircle } from "lucide-react";

export interface LabCartItem {
  cartItemId: number;
  ref: string;
  source: "LIMS" | "EHR";
  patientId: string | null;
  patientName: string;
  testName: string;
  testCode: string | null;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
}

type Props = {
  items: LabCartItem[];
  onUpdateDiscount: (cartItemId: number, discountPercent: number) => void;
  onRemove: (cartItemId: number) => void;
  onClear: () => void;
  subtotal: number;
  discountAmount: number;
  total: number;
  onCheckout: () => void;
  hasShift: boolean;
};

export function LabCart({
  items,
  onUpdateDiscount,
  onRemove,
  onClear,
  subtotal,
  discountAmount,
  total,
  onCheckout,
  hasShift,
}: Props) {
  // One invoice belongs to one patient. Mixing them would produce a bill no
  // one can pay, so it is blocked here rather than failing at checkout.
  const patients = new Set(items.map((i) => i.patientId ?? i.patientName));
  const mixedPatients = patients.size > 1;
  const unpriced = items.some((i) => i.unitPrice <= 0);

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CartIcon className="h-4 w-4" />
          Cart
          {items.length > 0 && (
            <Badge className="bg-[#618FF5] text-white text-xs ml-1">{items.length}</Badge>
          )}
        </CardTitle>
        {items.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-7 text-xs text-destructive hover:text-destructive gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 flex-1 flex flex-col min-h-0">
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-8">
            <CartIcon className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs mt-1">Find a patient and add their pending tests</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto space-y-2 mb-3">
              {items.map((item) => (
                <div key={item.cartItemId} className="border rounded-md p-2.5 space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.testName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.patientName}
                        {item.testCode && ` | ${item.testCode}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(item.cartItemId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      className={
                        item.source === "LIMS"
                          ? "bg-blue-100 text-blue-800 text-[10px]"
                          : "bg-purple-100 text-purple-800 text-[10px]"
                      }
                    >
                      {item.source === "LIMS" ? "Lab Order" : "EHR Referral"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Disc.</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent || ""}
                        placeholder="0"
                        onChange={(e) => onUpdateDiscount(item.cartItemId, parseFloat(e.target.value) || 0)}
                        className="h-6 w-12 text-center text-xs p-0"
                        title="Discount %"
                        aria-label="Discount percent"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{item.totalAmount.toLocaleString()} IQD</p>
                      {item.discountPercent > 0 && (
                        <p className="text-[10px] text-green-600">
                          -{item.discountAmount.toLocaleString()} off
                        </p>
                      )}
                    </div>
                  </div>
                  {item.unitPrice <= 0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 rounded px-2 py-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      No price set for this test
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 space-y-2">
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{subtotal.toLocaleString()} IQD</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{discountAmount.toLocaleString()} IQD</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{total.toLocaleString()} IQD</span>
                </div>
              </div>

              {!hasShift && (
                <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 rounded px-2 py-1.5">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  Open a shift before checkout
                </div>
              )}
              {mixedPatients && (
                <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded px-2 py-1.5">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  Cart has more than one patient
                </div>
              )}
              {unpriced && (
                <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 rounded px-2 py-1.5">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  Some tests have no price
                </div>
              )}
              <Button
                className="w-full gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0] font-semibold"
                size="lg"
                onClick={onCheckout}
                disabled={items.length === 0 || !hasShift || mixedPatients}
              >
                <CartIcon className="h-5 w-5" />
                Checkout ({total.toFixed(2)})
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
