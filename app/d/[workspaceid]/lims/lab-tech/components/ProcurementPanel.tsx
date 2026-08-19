/**
 * Procurement — order reagents from suppliers and receive the deliveries.
 *
 * Ordering records intent only. Stock moves when a delivery is received:
 * quantity received minus anything damaged or short goes onto the shelf,
 * against a batch with its expiry date.
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Truck, PackageCheck, AlertCircle } from "lucide-react";

interface LabItem {
  itemid: string;
  name: string;
  itemcode: string | null;
  uom: string | null;
  totalStock: number;
}

interface OrderRow {
  id: string;
  ordernumber: string;
  suppliername: string | null;
  status: string;
  totalamount: string | null;
  orderedby: string;
  expecteddate: string | null;
  createdat: string;
  item_count: number;
}

interface ReceiptRow {
  id: string;
  receiptnumber: string;
  ordernumber: string | null;
  deliverynotenumber: string | null;
  receivedby: string;
  suppliername: string | null;
  status: string;
  receiptdate: string;
  item_count: number;
}

interface OrderLine {
  itemId: string;
  orderedQty: number;
  unitCost: number;
}

interface ReceiveLine {
  itemId: string;
  receivedQty: number;
  returnClaim: number;
  batchNumber: string;
  expiryDate: string;
  unitCost: number;
}

const statusColor: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-800",
  PARTIAL: "bg-orange-100 text-orange-800",
  PARTIALLY_DELIVERED: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETE: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function ProcurementPanel({ workspaceid }: { workspaceid: string }) {
  const [view, setView] = useState<"orders" | "receive">("orders");
  const [stock, setStock] = useState<LabItem[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Order form
  const [supplierName, setSupplierName] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [orderLines, setOrderLines] = useState<OrderLine[]>([{ itemId: "", orderedQty: 1, unitCost: 0 }]);

  // Receive form
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [receiveLines, setReceiveLines] = useState<ReceiveLine[]>([
    { itemId: "", receivedQty: 1, returnClaim: 0, batchNumber: "", expiryDate: "", unitCost: 0 },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, ordRes, grnRes] = await Promise.all([
        fetch(`/api/d/${workspaceid}/lab-inventory`),
        fetch(`/api/d/${workspaceid}/lab-procurement/orders`),
        fetch(`/api/d/${workspaceid}/lab-procurement/grn`),
      ]);
      setStock((await invRes.json()).inventory ?? []);
      setOrders((await ordRes.json()).orders ?? []);
      setReceipts((await grnRes.json()).receipts ?? []);
    } catch (e) {
      console.error("Failed to load procurement", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceid]);

  useEffect(() => {
    load();
  }, [load]);

  const submitOrder = async () => {
    const valid = orderLines.filter((l) => l.itemId && l.orderedQty > 0);
    if (valid.length === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-procurement/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName,
          expectedDate: expectedDate || undefined,
          items: valid.map((l) => ({
            itemId: l.itemId,
            itemName: stock.find((s) => s.itemid === l.itemId)?.name,
            uom: stock.find((s) => s.itemid === l.itemId)?.uom,
            orderedQty: l.orderedQty,
            unitCost: l.unitCost,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not create order");
      setSuccess(`Order ${data.order.ordernumber} created`);
      setSupplierName("");
      setExpectedDate("");
      setOrderLines([{ itemId: "", orderedQty: 1, unitCost: 0 }]);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const submitReceipt = async () => {
    const valid = receiveLines.filter((l) => l.itemId && l.receivedQty > 0);
    if (valid.length === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const order = orders.find((o) => o.id === selectedOrderId);
      const res = await fetch(`/api/d/${workspaceid}/lab-procurement/grn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId || undefined,
          orderNumber: order?.ordernumber,
          deliveryNoteNumber: deliveryNote || undefined,
          supplierName: order?.suppliername ?? undefined,
          items: valid.map((l) => ({
            itemId: l.itemId,
            itemName: stock.find((s) => s.itemid === l.itemId)?.name,
            uom: stock.find((s) => s.itemid === l.itemId)?.uom,
            receivedQty: l.receivedQty,
            returnClaim: l.returnClaim,
            batchNumber: l.batchNumber || undefined,
            expiryDate: l.expiryDate || undefined,
            unitCost: l.unitCost,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not record delivery");
      const total = (data.shelved ?? []).reduce((s: number, x: { quantity: number }) => s + x.quantity, 0);
      setSuccess(`Delivery ${data.receipt.receiptnumber} received — ${total} unit(s) added to stock by ${data.receivedBy}`);
      setDeliveryNote("");
      setSelectedOrderId("");
      setReceiveLines([{ itemId: "", receivedQty: 1, returnClaim: 0, batchNumber: "", expiryDate: "", unitCost: 0 }]);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold leading-tight">Procurement</h2>
          <p className="text-xs text-muted-foreground">
            Order reagents and receive deliveries. Stock rises only when a delivery is received.
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={view === "orders" ? "default" : "outline"} onClick={() => setView("orders")} className="gap-1">
            <Truck className="h-4 w-4" /> Orders
          </Button>
          <Button size="sm" variant={view === "receive" ? "default" : "outline"} onClick={() => setView("receive")} className="gap-1">
            <PackageCheck className="h-4 w-4" /> Receive
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {success && <div className="text-xs text-green-700 bg-green-50 rounded p-2">{success}</div>}

      {view === "orders" ? (
        <>
          <Card className="flex-shrink-0">
            <CardHeader className="py-2 px-3 border-b">
              <CardTitle className="text-sm font-semibold">New Purchase Order</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Supplier</label>
                  <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expected date</label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                </div>
              </div>

              {orderLines.map((line, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {i === 0 && <label className="text-xs text-muted-foreground">Item</label>}
                    <select
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={line.itemId}
                      onChange={(e) =>
                        setOrderLines((p) => p.map((l, x) => (x === i ? { ...l, itemId: e.target.value } : l)))
                      }
                    >
                      <option value="">Select an item...</option>
                      {stock.map((s) => (
                        <option key={s.itemid} value={s.itemid}>
                          {s.name} {s.itemcode ? `(${s.itemcode})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    {i === 0 && <label className="text-xs text-muted-foreground">Qty</label>}
                    <Input
                      type="number"
                      min={1}
                      value={line.orderedQty}
                      onChange={(e) =>
                        setOrderLines((p) => p.map((l, x) => (x === i ? { ...l, orderedQty: Number(e.target.value) } : l)))
                      }
                    />
                  </div>
                  <div className="w-28">
                    {i === 0 && <label className="text-xs text-muted-foreground">Unit cost</label>}
                    <Input
                      type="number"
                      min={0}
                      value={line.unitCost}
                      onChange={(e) =>
                        setOrderLines((p) => p.map((l, x) => (x === i ? { ...l, unitCost: Number(e.target.value) } : l)))
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOrderLines((p) => p.filter((_, x) => x !== i))}
                    disabled={orderLines.length === 1}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrderLines((p) => [...p, { itemId: "", orderedQty: 1, unitCost: 0 }])}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Add item
                </Button>
                <Button onClick={submitOrder} disabled={submitting} className="gap-1">
                  <Truck className="h-4 w-4" /> {submitting ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0">
              <CardTitle className="text-sm font-semibold">Purchase Orders ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
              ) : orders.length === 0 ? (
                <div className="flex justify-center py-12 text-sm text-muted-foreground">No orders yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Order #</th>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">Items</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Ordered by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{o.ordernumber}</td>
                        <td className="px-3 py-2 text-muted-foreground">{o.suppliername ?? "—"}</td>
                        <td className="px-3 py-2">{o.item_count}</td>
                        <td className="px-3 py-2">{o.totalamount ? Number(o.totalamount).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2">
                          <Badge className={statusColor[o.status] ?? "bg-gray-100 text-gray-800"}>{o.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{o.orderedby}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="flex-shrink-0">
            <CardHeader className="py-2 px-3 border-b">
              <CardTitle className="text-sm font-semibold">Receive Delivery</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Against order (optional)</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                  >
                    <option value="">Direct delivery (no order)</option>
                    {orders
                      .filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED")
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.ordernumber} — {o.suppliername ?? "no supplier"}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Delivery note #</label>
                  <Input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
                </div>
              </div>

              {receiveLines.map((line, i) => (
                <div key={i} className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    {i === 0 && <label className="text-xs text-muted-foreground">Item</label>}
                    <select
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={line.itemId}
                      onChange={(e) =>
                        setReceiveLines((p) => p.map((l, x) => (x === i ? { ...l, itemId: e.target.value } : l)))
                      }
                    >
                      <option value="">Select an item...</option>
                      {stock.map((s) => (
                        <option key={s.itemid} value={s.itemid}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    {i === 0 && <label className="text-xs text-muted-foreground">Received</label>}
                    <Input type="number" min={0} value={line.receivedQty}
                      onChange={(e) => setReceiveLines((p) => p.map((l, x) => (x === i ? { ...l, receivedQty: Number(e.target.value) } : l)))} />
                  </div>
                  <div className="w-20">
                    {i === 0 && <label className="text-xs text-muted-foreground">Damaged</label>}
                    <Input type="number" min={0} value={line.returnClaim}
                      onChange={(e) => setReceiveLines((p) => p.map((l, x) => (x === i ? { ...l, returnClaim: Number(e.target.value) } : l)))} />
                  </div>
                  <div className="w-32">
                    {i === 0 && <label className="text-xs text-muted-foreground">Batch #</label>}
                    <Input value={line.batchNumber}
                      onChange={(e) => setReceiveLines((p) => p.map((l, x) => (x === i ? { ...l, batchNumber: e.target.value } : l)))} />
                  </div>
                  <div className="w-36">
                    {i === 0 && <label className="text-xs text-muted-foreground">Expiry</label>}
                    <Input type="date" value={line.expiryDate}
                      onChange={(e) => setReceiveLines((p) => p.map((l, x) => (x === i ? { ...l, expiryDate: e.target.value } : l)))} />
                  </div>
                  <Button variant="ghost" size="sm" disabled={receiveLines.length === 1}
                    onClick={() => setReceiveLines((p) => p.filter((_, x) => x !== i))} aria-label="Remove line">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {line.returnClaim > 0 && (
                    <div className="w-full text-xs text-orange-700">
                      {line.receivedQty - line.returnClaim} will go on the shelf ({line.returnClaim} claimed as damaged)
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-between">
                <Button variant="outline" size="sm" className="gap-1"
                  onClick={() => setReceiveLines((p) => [...p, { itemId: "", receivedQty: 1, returnClaim: 0, batchNumber: "", expiryDate: "", unitCost: 0 }])}>
                  <Plus className="h-4 w-4" /> Add item
                </Button>
                <Button onClick={submitReceipt} disabled={submitting} className="gap-1">
                  <PackageCheck className="h-4 w-4" /> {submitting ? "Receiving..." : "Receive & Add to Stock"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0">
              <CardTitle className="text-sm font-semibold">Deliveries Received ({receipts.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
              ) : receipts.length === 0 ? (
                <div className="flex justify-center py-12 text-sm text-muted-foreground">No deliveries recorded yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Receipt #</th>
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2">Delivery note</th>
                      <th className="px-3 py-2">Items</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Received by</th>
                      <th className="px-3 py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{r.receiptnumber}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.ordernumber ?? "direct"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.deliverynotenumber ?? "—"}</td>
                        <td className="px-3 py-2">{r.item_count}</td>
                        <td className="px-3 py-2">
                          <Badge className={statusColor[r.status] ?? "bg-gray-100 text-gray-800"}>{r.status}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className="bg-blue-100 text-blue-800">{r.receivedby}</Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.receiptdate ? new Date(r.receiptdate).toLocaleString() : "—"}
                        </td>
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
  );
}
