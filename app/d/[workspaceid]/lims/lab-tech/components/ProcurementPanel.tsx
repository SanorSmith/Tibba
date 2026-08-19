/**
 * Procurement — buying reagents and everything that follows.
 *
 * Orders  → what we asked for      (no stock movement)
 * Receive → what arrived           (stock up)
 * Returns → what went back         (stock down)
 * Claims  → what we're owed for damaged goods (money only, no stock)
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Trash2, Truck, PackageCheck, Undo2, FileWarning,
  AlertCircle, CheckCircle2, RefreshCw,
} from "lucide-react";

interface LabItem { itemid: string; name: string; itemcode: string | null; uom: string | null; totalStock: number }
interface Vendor { id: string; name: string }
interface OrderRow { id: string; ordernumber: string; suppliername: string | null; status: string; totalamount: string | null; orderedby: string; item_count: number }
interface ReceiptRow { id: string; receiptnumber: string; ordernumber: string | null; deliverynotenumber: string | null; receivedby: string; status: string; receiptdate: string; item_count: number }
interface ReturnRow { id: string; returnnumber: string; vendorname: string | null; status: string; reason: string | null; totalvalue: string | null; returnedbyname: string | null; createdat: string; itemCount: number }
interface ClaimRow { id: string; claimnumber: string; vendorname: string | null; status: string; claimamount: string | null; settledamount: string | null; reason: string | null; raisedbyname: string | null; receiptnumber: string | null }

const statusColor: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-800", PARTIAL: "bg-orange-100 text-orange-800",
  PARTIALLY_DELIVERED: "bg-orange-100 text-orange-800", DELIVERED: "bg-green-100 text-green-800",
  COMPLETE: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
  DRAFT: "bg-gray-100 text-gray-800", SENT: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800", REJECTED: "bg-red-100 text-red-800",
  CREDITED: "bg-green-100 text-green-800", OPEN: "bg-orange-100 text-orange-800",
  SUBMITTED: "bg-blue-100 text-blue-800", APPROVED: "bg-green-100 text-green-800",
  SETTLED: "bg-green-100 text-green-800",
};
const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function ProcurementPanel({ workspaceid }: { workspaceid: string }) {
  const [view, setView] = useState<"orders" | "receive" | "returns" | "claims">("orders");
  const [stock, setStock] = useState<LabItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [supplierName, setSupplierName] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [orderLines, setOrderLines] = useState([{ itemId: "", orderedQty: 1, unitCost: 0 }]);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [receiveLines, setReceiveLines] = useState([{ itemId: "", receivedQty: 1, returnClaim: 0, batchNumber: "", expiryDate: "", unitCost: 0 }]);

  const [retVendor, setRetVendor] = useState("");
  const [retReason, setRetReason] = useState("");
  const [retLines, setRetLines] = useState([{ itemId: "", quantity: 1, unitCost: 0 }]);

  const [claimVendor, setClaimVendor] = useState("");
  const [claimReceipt, setClaimReceipt] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimReason, setClaimReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, v, o, g, r, c] = await Promise.all([
        fetch(`/api/d/${workspaceid}/lab-inventory`),
        fetch(`/api/d/${workspaceid}/lab-inventory/vendors?active=active`),
        fetch(`/api/d/${workspaceid}/lab-procurement/orders`),
        fetch(`/api/d/${workspaceid}/lab-procurement/grn`),
        fetch(`/api/d/${workspaceid}/lab-procurement/returns`),
        fetch(`/api/d/${workspaceid}/lab-procurement/claims`),
      ]);
      setStock((await i.json()).inventory ?? []);
      setVendors((await v.json()).vendors ?? []);
      setOrders((await o.json()).orders ?? []);
      setReceipts((await g.json()).receipts ?? []);
      setReturns((await r.json()).returns ?? []);
      setClaims((await c.json()).claims ?? []);
    } catch { setError("Could not load procurement"); }
    finally { setLoading(false); }
  }, [workspaceid]);

  useEffect(() => { load(); }, [load]);

  const post = async <T,>(url: string, body: unknown, okMsg: (d: T) => string): Promise<T | null> => {
    setBusy(true); setError(null); setOk(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed"); return null; }
      setOk(okMsg(d as T)); load(); return d as T;
    } finally { setBusy(false); }
  };

  const submitOrder = () => {
    const valid = orderLines.filter((l) => l.itemId && l.orderedQty > 0);
    if (!valid.length) return;
    post(`/api/d/${workspaceid}/lab-procurement/orders`, {
      supplierName, expectedDate: expectedDate || undefined,
      items: valid.map((l) => ({ ...l, itemName: stock.find((s) => s.itemid === l.itemId)?.name, uom: stock.find((s) => s.itemid === l.itemId)?.uom })),
    }, (d: { order: { ordernumber: string } }) => `Order ${d.order.ordernumber} created`)
      .then((d) => { if (d) { setSupplierName(""); setExpectedDate(""); setOrderLines([{ itemId: "", orderedQty: 1, unitCost: 0 }]); } });
  };

  const submitReceipt = () => {
    const valid = receiveLines.filter((l) => l.itemId && l.receivedQty > 0);
    if (!valid.length) return;
    const order = orders.find((o) => o.id === selectedOrderId);
    post(`/api/d/${workspaceid}/lab-procurement/grn`, {
      orderId: selectedOrderId || undefined, orderNumber: order?.ordernumber,
      deliveryNoteNumber: deliveryNote || undefined, supplierName: order?.suppliername ?? undefined,
      items: valid.map((l) => ({ ...l, itemName: stock.find((s) => s.itemid === l.itemId)?.name, uom: stock.find((s) => s.itemid === l.itemId)?.uom })),
    }, (d: { receipt: { receiptnumber: string }; shelved: Array<{ quantity: number }>; receivedBy: string }) => {
      const t = d.shelved.reduce((s, x) => s + x.quantity, 0);
      return `Delivery ${d.receipt.receiptnumber} received — ${t} unit(s) added by ${d.receivedBy}`;
    }).then((d) => { if (d) { setDeliveryNote(""); setSelectedOrderId(""); setReceiveLines([{ itemId: "", receivedQty: 1, returnClaim: 0, batchNumber: "", expiryDate: "", unitCost: 0 }]); } });
  };

  const submitReturn = () => {
    const valid = retLines.filter((l) => l.itemId && l.quantity > 0);
    if (!valid.length) return;
    const v = vendors.find((x) => x.id === retVendor);
    post(`/api/d/${workspaceid}/lab-procurement/returns`, {
      vendorId: retVendor || undefined, vendorName: v?.name, reason: retReason, lines: valid,
    }, (d: { return: { returnnumber: string } }) => `Return ${d.return.returnnumber} sent — stock reduced`)
      .then((d) => { if (d) { setRetReason(""); setRetLines([{ itemId: "", quantity: 1, unitCost: 0 }]); } });
  };

  const submitClaim = () => {
    if (!(Number(claimAmount) > 0)) return;
    const v = vendors.find((x) => x.id === claimVendor);
    post(`/api/d/${workspaceid}/lab-procurement/claims`, {
      vendorId: claimVendor || undefined, vendorName: v?.name,
      receiptId: claimReceipt || undefined, claimAmount: Number(claimAmount), reason: claimReason,
    }, (d: { claim: { claimnumber: string } }) => `Claim ${d.claim.claimnumber} raised`)
      .then((d) => { if (d) { setClaimAmount(""); setClaimReason(""); setClaimReceipt(""); } });
  };

  const setClaimStatus = async (id: string, status: string, settledAmount?: number) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-procurement/claims`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, settledAmount }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Failed"); return; }
      setOk(`Claim marked ${status}`); load();
    } finally { setBusy(false); }
  };

  const itemPicker = (value: string, onChange: (v: string) => void) => (
    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select an item...</option>
      {stock.map((s) => <option key={s.itemid} value={s.itemid}>{s.name}{s.itemcode ? ` (${s.itemcode})` : ""} — {s.totalStock} in stock</option>)}
    </select>
  );

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold leading-tight">Procurement</h2>
          <p className="text-xs text-muted-foreground">Order, receive, return, and claim. Stock moves only on receive and return.</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={view === "orders" ? "default" : "outline"} onClick={() => setView("orders")} className="gap-1"><Truck className="h-4 w-4" /> Orders ({orders.length})</Button>
          <Button size="sm" variant={view === "receive" ? "default" : "outline"} onClick={() => setView("receive")} className="gap-1"><PackageCheck className="h-4 w-4" /> Receive ({receipts.length})</Button>
          <Button size="sm" variant={view === "returns" ? "default" : "outline"} onClick={() => setView("returns")} className="gap-1"><Undo2 className="h-4 w-4" /> Returns ({returns.length})</Button>
          <Button size="sm" variant={view === "claims" ? "default" : "outline"} onClick={() => setView("claims")} className="gap-1"><FileWarning className="h-4 w-4" /> Claims ({claims.length})</Button>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {ok && <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2"><CheckCircle2 className="h-4 w-4" /> {ok}</div>}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        : view === "orders" ? (
        <>
          <Card className="flex-shrink-0">
            <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm font-semibold">New Purchase Order</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Supplier</label>
                  <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier name" /></div>
                <div><label className="text-xs text-muted-foreground">Expected date</label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
              </div>
              {orderLines.map((line, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">{i === 0 && <label className="text-xs text-muted-foreground">Item</label>}
                    {itemPicker(line.itemId, (v) => setOrderLines((p) => p.map((l, x) => x === i ? { ...l, itemId: v } : l)))}</div>
                  <div className="w-24">{i === 0 && <label className="text-xs text-muted-foreground">Qty</label>}
                    <Input type="number" min={1} value={line.orderedQty} onChange={(e) => setOrderLines((p) => p.map((l, x) => x === i ? { ...l, orderedQty: Number(e.target.value) } : l))} /></div>
                  <div className="w-28">{i === 0 && <label className="text-xs text-muted-foreground">Unit cost</label>}
                    <Input type="number" min={0} value={line.unitCost} onChange={(e) => setOrderLines((p) => p.map((l, x) => x === i ? { ...l, unitCost: Number(e.target.value) } : l))} /></div>
                  <Button variant="ghost" size="sm" disabled={orderLines.length === 1} onClick={() => setOrderLines((p) => p.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setOrderLines((p) => [...p, { itemId: "", orderedQty: 1, unitCost: 0 }])}><Plus className="h-4 w-4" /> Add item</Button>
                <Button onClick={submitOrder} disabled={busy} className="gap-1"><Truck className="h-4 w-4" /> Create Order</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0"><CardTitle className="text-sm font-semibold">Purchase Orders</CardTitle></CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {orders.length === 0 ? <div className="flex justify-center py-12 text-sm text-muted-foreground">No orders yet.</div> : (
                <table className="w-full text-sm"><thead className="sticky top-0 bg-white border-b"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Order #</th><th className="px-3 py-2">Supplier</th><th className="px-3 py-2 text-right">Items</th>
                  <th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Ordered by</th></tr></thead>
                  <tbody>{orders.map((o) => (<tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{o.ordernumber}</td><td className="px-3 py-2 text-muted-foreground">{o.suppliername ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{o.item_count}</td><td className="px-3 py-2 text-right">{o.totalamount ? money(Number(o.totalamount)) : "—"}</td>
                    <td className="px-3 py-2"><Badge className={statusColor[o.status] ?? "bg-gray-100"}>{o.status}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground">{o.orderedby}</td></tr>))}</tbody></table>
              )}
            </CardContent>
          </Card>
        </>
      ) : view === "receive" ? (
        <>
          <Card className="flex-shrink-0">
            <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm font-semibold">Receive Delivery</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Against order (optional)</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)}>
                    <option value="">Direct delivery (no order)</option>
                    {orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").map((o) => <option key={o.id} value={o.id}>{o.ordernumber} — {o.suppliername ?? "no supplier"}</option>)}
                  </select></div>
                <div><label className="text-xs text-muted-foreground">Delivery note #</label>
                  <Input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} /></div>
              </div>
              {receiveLines.map((line, i) => (
                <div key={i} className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[160px]">{i === 0 && <label className="text-xs text-muted-foreground">Item</label>}
                    {itemPicker(line.itemId, (v) => setReceiveLines((p) => p.map((l, x) => x === i ? { ...l, itemId: v } : l)))}</div>
                  <div className="w-20">{i === 0 && <label className="text-xs text-muted-foreground">Received</label>}
                    <Input type="number" min={0} value={line.receivedQty} onChange={(e) => setReceiveLines((p) => p.map((l, x) => x === i ? { ...l, receivedQty: Number(e.target.value) } : l))} /></div>
                  <div className="w-20">{i === 0 && <label className="text-xs text-muted-foreground">Damaged</label>}
                    <Input type="number" min={0} value={line.returnClaim} onChange={(e) => setReceiveLines((p) => p.map((l, x) => x === i ? { ...l, returnClaim: Number(e.target.value) } : l))} /></div>
                  <div className="w-32">{i === 0 && <label className="text-xs text-muted-foreground">Batch #</label>}
                    <Input value={line.batchNumber} onChange={(e) => setReceiveLines((p) => p.map((l, x) => x === i ? { ...l, batchNumber: e.target.value } : l))} /></div>
                  <div className="w-36">{i === 0 && <label className="text-xs text-muted-foreground">Expiry</label>}
                    <Input type="date" value={line.expiryDate} onChange={(e) => setReceiveLines((p) => p.map((l, x) => x === i ? { ...l, expiryDate: e.target.value } : l))} /></div>
                  <Button variant="ghost" size="sm" disabled={receiveLines.length === 1} onClick={() => setReceiveLines((p) => p.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button>
                  {line.returnClaim > 0 && <div className="w-full text-xs text-orange-700">{line.receivedQty - line.returnClaim} will go on the shelf ({line.returnClaim} damaged)</div>}
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setReceiveLines((p) => [...p, { itemId: "", receivedQty: 1, returnClaim: 0, batchNumber: "", expiryDate: "", unitCost: 0 }])}><Plus className="h-4 w-4" /> Add item</Button>
                <Button onClick={submitReceipt} disabled={busy} className="gap-1"><PackageCheck className="h-4 w-4" /> Receive &amp; Add to Stock</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0"><CardTitle className="text-sm font-semibold">Deliveries Received</CardTitle></CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {receipts.length === 0 ? <div className="flex justify-center py-12 text-sm text-muted-foreground">No deliveries yet.</div> : (
                <table className="w-full text-sm"><thead className="sticky top-0 bg-white border-b"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Receipt #</th><th className="px-3 py-2">Order</th><th className="px-3 py-2">Note #</th>
                  <th className="px-3 py-2 text-right">Items</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Received by</th><th className="px-3 py-2">When</th></tr></thead>
                  <tbody>{receipts.map((r) => (<tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{r.receiptnumber}</td><td className="px-3 py-2 text-muted-foreground">{r.ordernumber ?? "direct"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.deliverynotenumber ?? "—"}</td><td className="px-3 py-2 text-right">{r.item_count}</td>
                    <td className="px-3 py-2"><Badge className={statusColor[r.status] ?? "bg-gray-100"}>{r.status}</Badge></td>
                    <td className="px-3 py-2"><Badge className="bg-blue-100 text-blue-800">{r.receivedby}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground">{r.receiptdate ? new Date(r.receiptdate).toLocaleDateString() : "—"}</td></tr>))}</tbody></table>
              )}
            </CardContent>
          </Card>
        </>
      ) : view === "returns" ? (
        <>
          <Card className="flex-shrink-0">
            <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm font-semibold">Return to Supplier</CardTitle></CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Vendor</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={retVendor} onChange={(e) => setRetVendor(e.target.value)}>
                    <option value="">Select vendor...</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select></div>
                <div><label className="text-xs text-muted-foreground">Reason</label>
                  <Input value={retReason} onChange={(e) => setRetReason(e.target.value)} placeholder="e.g. wrong item, expired on arrival" /></div>
              </div>
              {retLines.map((line, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">{i === 0 && <label className="text-xs text-muted-foreground">Item</label>}
                    {itemPicker(line.itemId, (v) => setRetLines((p) => p.map((l, x) => x === i ? { ...l, itemId: v } : l)))}</div>
                  <div className="w-24">{i === 0 && <label className="text-xs text-muted-foreground">Qty</label>}
                    <Input type="number" min={1} value={line.quantity} onChange={(e) => setRetLines((p) => p.map((l, x) => x === i ? { ...l, quantity: Number(e.target.value) } : l))} /></div>
                  <div className="w-28">{i === 0 && <label className="text-xs text-muted-foreground">Unit cost</label>}
                    <Input type="number" min={0} value={line.unitCost} onChange={(e) => setRetLines((p) => p.map((l, x) => x === i ? { ...l, unitCost: Number(e.target.value) } : l))} /></div>
                  <Button variant="ghost" size="sm" disabled={retLines.length === 1} onClick={() => setRetLines((p) => p.filter((_, x) => x !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setRetLines((p) => [...p, { itemId: "", quantity: 1, unitCost: 0 }])}><Plus className="h-4 w-4" /> Add item</Button>
                <Button onClick={submitReturn} disabled={busy} className="gap-1"><Undo2 className="h-4 w-4" /> Send Return</Button>
              </div>
              <p className="text-xs text-muted-foreground">Returning removes the stock from the shelf immediately.</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0"><CardTitle className="text-sm font-semibold">Returns</CardTitle></CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {returns.length === 0 ? <div className="flex justify-center py-12 text-sm text-muted-foreground">No returns yet.</div> : (
                <table className="w-full text-sm"><thead className="sticky top-0 bg-white border-b"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Return #</th><th className="px-3 py-2">Vendor</th><th className="px-3 py-2 text-right">Items</th>
                  <th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">By</th></tr></thead>
                  <tbody>{returns.map((r) => (<tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{r.returnnumber}</td><td className="px-3 py-2 text-muted-foreground">{r.vendorname ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.itemCount}</td><td className="px-3 py-2 text-right">{r.totalvalue ? money(Number(r.totalvalue)) : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.reason ?? "—"}</td>
                    <td className="px-3 py-2"><Badge className={statusColor[r.status] ?? "bg-gray-100"}>{r.status}</Badge></td>
                    <td className="px-3 py-2 text-muted-foreground">{r.returnedbyname ?? "—"}</td></tr>))}</tbody></table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="flex-shrink-0">
            <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm font-semibold">Raise a Claim</CardTitle></CardHeader>
            <CardContent className="p-3 flex flex-wrap gap-2 items-end">
              <div className="w-48"><label className="text-xs text-muted-foreground">Vendor</label>
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={claimVendor} onChange={(e) => setClaimVendor(e.target.value)}>
                  <option value="">Select vendor...</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select></div>
              <div className="w-56"><label className="text-xs text-muted-foreground">Against delivery</label>
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={claimReceipt} onChange={(e) => setClaimReceipt(e.target.value)}>
                  <option value="">None</option>{receipts.map((r) => <option key={r.id} value={r.id}>{r.receiptnumber}</option>)}
                </select></div>
              <div className="w-32"><label className="text-xs text-muted-foreground">Amount</label>
                <Input type="number" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} /></div>
              <div className="flex-1 min-w-[180px]"><label className="text-xs text-muted-foreground">Reason</label>
                <Input value={claimReason} onChange={(e) => setClaimReason(e.target.value)} placeholder="e.g. 5 vials cracked in transit" /></div>
              <Button onClick={submitClaim} disabled={busy || !(Number(claimAmount) > 0)} className="gap-1"><FileWarning className="h-4 w-4" /> Raise Claim</Button>
            </CardContent>
          </Card>
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0"><CardTitle className="text-sm font-semibold">Claims</CardTitle></CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {claims.length === 0 ? <div className="flex justify-center py-12 text-sm text-muted-foreground">No claims yet.</div> : (
                <table className="w-full text-sm"><thead className="sticky top-0 bg-white border-b"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Claim #</th><th className="px-3 py-2">Vendor</th><th className="px-3 py-2">Delivery</th>
                  <th className="px-3 py-2 text-right">Claimed</th><th className="px-3 py-2 text-right">Settled</th>
                  <th className="px-3 py-2">Status</th><th className="px-3 py-2"></th></tr></thead>
                  <tbody>{claims.map((c) => (<tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{c.claimnumber}</td><td className="px-3 py-2 text-muted-foreground">{c.vendorname ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.receiptnumber ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{c.claimamount ? money(Number(c.claimamount)) : "—"}</td>
                    <td className="px-3 py-2 text-right">{c.settledamount ? money(Number(c.settledamount)) : "—"}</td>
                    <td className="px-3 py-2"><Badge className={statusColor[c.status] ?? "bg-gray-100"}>{c.status}</Badge></td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {c.status === "OPEN" && <Button size="sm" variant="outline" onClick={() => setClaimStatus(c.id, "SUBMITTED")}>Submit</Button>}
                      {c.status === "SUBMITTED" && <>
                        <Button size="sm" variant="outline" onClick={() => setClaimStatus(c.id, "APPROVED")}>Approve</Button>
                        <Button size="sm" variant="ghost" className="ml-1" onClick={() => setClaimStatus(c.id, "REJECTED")}>Reject</Button></>}
                      {c.status === "APPROVED" && <Button size="sm" onClick={() => setClaimStatus(c.id, "SETTLED", Number(c.claimamount ?? 0))}>Mark Settled</Button>}
                    </td></tr>))}</tbody></table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
