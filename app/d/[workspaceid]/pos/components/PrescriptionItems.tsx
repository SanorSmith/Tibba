"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, CheckCircle2, ExternalLink } from "lucide-react";
import type { CartItem } from "../pos-page";
import { useState, useEffect } from "react";

// Direct price fetching using database connection: drugs.name → items.name → item_batches.selling_price
const fetchItemPrice = async (drugName: string): Promise<number> => {
  try {
    const response = await fetch('/api/d/[workspaceid]/pos/item-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugName })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.price || 0;
    }
  } catch (error) {
    console.error('Failed to fetch item price:', error);
  }
  return 0;
};

type OrderItem = {
  itemid: string;
  drugid: string;
  drugname: string;
  genericname?: string;
  form?: string;
  strength?: string;
  dosage?: string;
  quantity: number;
  quantitydispensed?: number;
  unitprice?: string;
  status: string;
  batchid?: string | null;
  lotnumber?: string | null;
  expirydate?: string | null;
  // New fields from unified inventory system
  inventoryItemId?: string;
  bestBatchId?: string;
  sellingprice?: string;
  unitcost?: string;
  availableStock?: number;
  // Which order this line came from. A patient can have several waiting, and
  // the panel lists them together, so a line has to remember its own.
  orderid?: string;
  ordercreatedat?: string;
};

type Props = {
  order: {
    order: any;
    orders?: any[];
    items: OrderItem[];
    patient: any;
  } | null;
  onAddToCart: (item: Omit<CartItem, "cartItemId">) => void;
  cartItems: CartItem[];
  workspaceid: string;
  onEditOrder?: (orderId: string) => void;
};

export function PrescriptionItems({ order, onAddToCart, cartItems, workspaceid, onEditOrder }: Props) {
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});

  // Fetch prices for items when component mounts or order changes
  useEffect(() => {
    const fetchPrices = async () => {
      if (!order?.items) return;
      
      const prices: Record<string, number> = {};
      
      for (const item of order.items) {
        if (item.drugname.includes('ILoprost')) {
          console.log(`[Direct Price Fetch] Fetching price for ${item.drugname} using database connection...`);
          const directPrice = await fetchItemPrice(item.drugname);
          if (directPrice > 0) {
            prices[item.itemid] = directPrice;
            console.log(`[Direct Price Fetch] Found price: ${directPrice} for ${item.drugname}`);
          }
        }
      }
      
      setItemPrices(prices);
    };
    
    fetchPrices();
  }, [order]);

  if (!order) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Prescription Items
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-center py-6">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No prescription loaded</p>
            <p className="text-xs text-muted-foreground mt-1">
              Search for a patient to see their dispensed orders
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only filter out fully DISPENSED items - PARTIALLY_DISPENSED items should show with remaining quantities
  const items = (order.items || []).filter(
    (item) => !["DISPENSED"].includes(item.status?.toUpperCase())
  );

  const orderCount = order.orders?.length ?? (order.order ? 1 : 0);
  const multipleOrders = orderCount > 1;

  const isInCart = (itemId: string) =>
    cartItems.some((c) => c.pharmacyOrderItemId === itemId);

  // A price this pharmacy actually recorded, or nothing.
  //
  // This used to end in a ladder of invented figures - 15,000 for anything
  // whose form mentioned injection, 8,500 for tablets, 10,000 for everything
  // else - so a line the pharmacy had never priced still showed a confident
  // number in green. That is how a 2,500 IQD box came to be rung up at 10,000,
  // and how three unrelated drugs all displayed the same 10,000 on one screen.
  // A guessed price on a dispensing counter is worse than no price: it is
  // wrong, and it does not look wrong.
  //
  // 0 means "not known". The table prints "Price not determined" for it and
  // the line cannot be added, so nothing is sold at a number nobody set.
  const resolvePrice = (item: OrderItem): number => {
    const fetched = itemPrices[item.itemid];
    if (fetched && fetched > 0) return fetched;
    if (item.unitprice && parseFloat(item.unitprice) > 0) return parseFloat(item.unitprice);
    if (item.sellingprice && parseFloat(item.sellingprice) > 0) return parseFloat(item.sellingprice);
    if (item.unitcost && parseFloat(item.unitcost) > 0) return parseFloat(item.unitcost);
    return 0;
  };

  const addItem = async (item: OrderItem) => {
    try {
      const orderId = item.orderid ?? order?.order?.orderid;
      if (!orderId) {
        console.error('[PrescriptionItems] Missing order ID');
        return;
      }

      // Look the drug up by whatever identifies it. This used to run only
      // `if (item.drugid)`, so a prescription line without one - 313 of the
      // 406 on record - skipped the inventory lookup entirely and fell to the
      // fallback below, which prices the line from a hard-coded default and
      // declares it out of stock. That is what a referred prescription looks
      // like from the pharmacy's side: the drug is on the shelf, under that
      // exact name, and the screen says there is none.
      //
      // The name goes along with the id because the id, when present, belongs
      // to the prescriber's own drugs table and means nothing here.
      if (item.drugid || item.drugname) {
        const query = new URLSearchParams();
        if (item.drugid) query.set("drugid", item.drugid);
        if (item.drugname) query.set("drugname", item.drugname);
        const inventoryResponse = await fetch(
          `/api/d/${workspaceid}/pharmacy/orders/${orderId}/inventory-items?${query.toString()}`
        );

        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json();
          const inventoryItems = inventoryData.items || [];

          if (inventoryItems.length > 0) {
            const selectedItem = inventoryItems[0];
            const selectedBatch = selectedItem.batches && selectedItem.batches.length > 0 
              ? selectedItem.batches[0] 
              : null;

            if (selectedBatch) {
              const price = selectedBatch.sellingPrice ? parseFloat(selectedBatch.sellingPrice) : resolvePrice(item);
              const quantity = (item.quantity || 0) - (item.quantitydispensed || 0);

              onAddToCart({
                // The prescription may carry no drug id at all; fall back to
                // the id of the item this pharmacy actually matched.
                drugId: item.drugid || selectedItem.drugId || selectedItem.itemId,
                drugName: item.drugname,
                genericName: item.genericname,
                form: item.form,
                strength: item.strength,
                batchId: selectedBatch.batchId,
                lotNumber: selectedBatch.batchNumber,
                expiryDate: selectedBatch.expiryDate,
                quantity: quantity,
                unitPrice: price,
                discountPercent: 0,
                discountAmount: 0,
                taxAmount: 0,
                totalAmount: price * quantity,
                pharmacyOrderItemId: item.itemid,
                prescribedQuantity: item.quantity,
                quantitydispensed: item.quantitydispensed,
                availableStock: selectedBatch.quantity,
              });

              console.log('[PrescriptionItems] Added item to cart:', item.drugname, 'Batch:', selectedBatch.batchNumber);
              return;
            }

            // Stock is on the shelf, but every batch of it has expired. Add
            // the line anyway so the cashier sees the drug and the reason -
            // priced from the real batch rather than the invented default
            // below, which is what made an expired 2,500 IQD box read as
            // 10,000. The cart still blocks checkout on availableStock 0:
            // expired medicine must not be dispensed, only explained.
            const expiredBatch = selectedItem.expiredBatches?.[0] ?? null;
            if (expiredBatch) {
              const price = expiredBatch.sellingPrice
                ? parseFloat(expiredBatch.sellingPrice)
                : resolvePrice(item);
              const quantity = (item.quantity || 0) - (item.quantitydispensed || 0);

              onAddToCart({
                // The prescription may carry no drug id at all; fall back to
                // the id of the item this pharmacy actually matched.
                drugId: item.drugid || selectedItem.drugId || selectedItem.itemId,
                drugName: item.drugname,
                genericName: item.genericname,
                form: item.form,
                strength: item.strength,
                batchId: expiredBatch.batchId,
                lotNumber: expiredBatch.batchNumber,
                expiryDate: expiredBatch.expiryDate,
                quantity: quantity,
                unitPrice: price,
                discountPercent: 0,
                discountAmount: 0,
                taxAmount: 0,
                totalAmount: price * quantity,
                pharmacyOrderItemId: item.itemid,
                prescribedQuantity: item.quantity,
                quantitydispensed: item.quantitydispensed,
                availableStock: 0,
                stockIssue: 'expired',
                expiredStock: selectedItem.expiredStock,
              });

              console.log(
                '[PrescriptionItems] Added item to cart (expired stock only):',
                item.drugname,
                'Batch:',
                expiredBatch.batchNumber,
                'expired',
                expiredBatch.expiryDate
              );
              return;
            }
          }
        }
      }

      // Fallback: add to cart without inventory batch info (no drugid or no inventory match)
      const price = resolvePrice(item);
      const quantity = (item.quantity || 0) - (item.quantitydispensed || 0);

      onAddToCart({
        drugId: item.drugid || "",
        drugName: item.drugname,
        genericName: item.genericname,
        form: item.form,
        strength: item.strength,
        batchId: item.batchid || undefined,
        lotNumber: item.lotnumber || undefined,
        expiryDate: item.expirydate || undefined,
        quantity: quantity,
        unitPrice: price,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: price * quantity,
        pharmacyOrderItemId: item.itemid,
        prescribedQuantity: item.quantity,
        quantitydispensed: item.quantitydispensed,
        availableStock: 0,
      });

      console.log('[PrescriptionItems] Added item to cart (fallback):', item.drugname);
    } catch (error) {
      console.error('[PrescriptionItems] Error adding item:', error);
    }
  };

  // Skips anything with no recorded price, for the same reason the row's own
  // button is disabled: "Add All" must not be the way an unpriced line slips
  // into a sale.
  const addAll = () => {
    items.forEach((item) => {
      if (!isInCart(item.itemid) && resolvePrice(item) > 0) addItem(item);
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Prescription Items
          <Badge variant="secondary" className="text-xs ml-1">
            {items.length}
          </Badge>
          {multipleOrders && (
            <span className="text-xs font-normal text-muted-foreground">
              from {orderCount} prescriptions
            </span>
          )}
          {/* Editing targets one order, so this only appears when one is
              shown. With several on screen it would be ambiguous which. */}
          {!multipleOrders && order.order?.orderid && (
            <button
              onClick={() => onEditOrder?.(order.order.orderid)}
              className="ml-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              title="Click to edit this order"
            >
              Edit Order
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={addAll}
          className="gap-1 text-xs h-7"
        >
          <Plus className="h-3 w-3" />
          Add All
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items in this order
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 text-xs">Drug</TableHead>
                <TableHead className="bg-muted/50 text-xs text-center">
                  Qty
                </TableHead>
                <TableHead className="bg-muted/50 text-xs text-right">
                  Price
                </TableHead>
                <TableHead className="bg-muted/50 text-xs text-right w-[60px]">
                  Add
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const price = resolvePrice(item);
                const inCart = isInCart(item.itemid);

                return (
                  <TableRow key={item.itemid}>
                    <TableCell className="py-2">
                      <div className="text-sm font-medium">{item.drugname}</div>
                      {/* Only when there is more than one prescription on
                          screen, so a single order stays uncluttered. */}
                      {multipleOrders && item.orderid && (
                        <div className="text-[10px] text-muted-foreground/80">
                          Order {item.orderid.slice(0, 8)}
                          {item.ordercreatedat &&
                            ` · ${new Date(item.ordercreatedat).toLocaleDateString()}`}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {item.form} {item.strength}
                        {item.lotnumber && ` | Lot: ${item.lotnumber}`}
                        {item.expirydate &&
                          ` | Exp: ${new Date(item.expirydate).toLocaleDateString()}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {(item.quantity || 0) - (item.quantitydispensed || 0)}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm font-medium ${
                        price > 0 ? "text-green-700" : "text-amber-600"
                      }`}
                    >
                      {price > 0 ? (
                        `${price.toLocaleString()} IQD`
                      ) : (
                        <span title="No selling price is recorded for this medicine in this pharmacy. Set one in Inventory before dispensing it.">
                          No price set
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {inCart ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => addItem(item)}
                          disabled={price <= 0}
                          title={
                            price > 0
                              ? "Add to cart"
                              : "Set a selling price for this medicine in Inventory before dispensing it"
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
