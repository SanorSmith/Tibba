/**
 * Lab Inventory — reagents and consumables this lab owns.
 *
 * Three views: Items (list, detail, edit), Vendors (suppliers), and Alerts
 * (what needs reordering or is expiring). Items are never deleted, only
 * deactivated, because deliveries and pulls reference them.
 */
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Search, PackagePlus, Boxes, Users, AlertTriangle,
  RefreshCw, X, Save, AlertCircle, CheckCircle2,
} from "lucide-react";

interface LabItem {
  itemid: string; name: string; genericname: string | null; itemcode: string | null;
  uom: string | null; manufacturer: string | null; isactive: boolean;
  reorderlevel: number | null; totalStock: number;
  status: "ok" | "low" | "outofstock"; criticalreagent: boolean | null;
  hasExpiring?: boolean; hasExpired?: boolean;
}
interface Vendor {
  id: string; name: string; contactname: string | null; phone: string | null;
  email: string | null; isactive: boolean; totalorders: number | null;
}
interface Detail {
  item: Record<string, unknown>;
  batches: Array<{ id: string; batchnumber: string | null; quantity: number | null; expirydate: string | null; isquarantined: boolean | null }>;
  movements: Array<{ id: string; type: string; quantity: number; referencetype: string | null; referenceid: string | null; createdat: string; warehouse: string | null }>;
  stock: Array<{ quantity: number | null; warehouse: string | null }>;
}

const statusColor: Record<string, string> = {
  ok: "bg-green-100 text-green-800",
  low: "bg-orange-100 text-orange-800",
  outofstock: "bg-red-100 text-red-800",
};

export default function LabInventory({ workspaceid }: { workspaceid: string }) {
  const [view, setView] = useState<"items" | "vendors" | "alerts">("items");
  const [items, setItems] = useState<LabItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", itemcode: "", uom: "unit", manufacturer: "", reorderlevel: 10 });

  const [detail, setDetail] = useState<Detail | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<Record<string, string | number | boolean>>({});

  const [showVendor, setShowVendor] = useState(false);
  const [vForm, setVForm] = useState({ name: "", contactname: "", phone: "", email: "" });

  const [adjusting, setAdjusting] = useState(false);
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("STOCK_COUNT");
  const [adjNotes, setAdjNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, v] = await Promise.all([
        fetch(`/api/d/${workspaceid}/lab-inventory`),
        fetch(`/api/d/${workspaceid}/lab-inventory/vendors`),
      ]);
      const ij = await i.json(), vj = await v.json();
      setItems(ij.inventory ?? []);
      setSummary(ij.summary ?? null);
      setVendors(vj.vendors ?? []);
    } catch { setError("Could not load inventory"); }
    finally { setLoading(false); }
  }, [workspaceid]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.itemcode ?? "").toLowerCase().includes(q) ||
      (i.manufacturer ?? "").toLowerCase().includes(q));
  }, [items, search]);

  const alerts = items.filter((i) => i.status !== "ok" || i.hasExpiring || i.hasExpired);

  const addItem = async () => {
    if (!form.name.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-inventory`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not add item"); return; }
      setOk(`${form.name} added`); setShowAdd(false);
      setForm({ name: "", itemcode: "", uom: "unit", manufacturer: "", reorderlevel: 10 });
      load();
    } finally { setBusy(false); }
  };

  const openDetail = async (id: string) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-inventory/items/${id}`);
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not load item"); return; }
      setDetail(d); setEditing(false);
      setEdit({
        name: String(d.item.name ?? ""), itemcode: String(d.item.itemcode ?? ""),
        uom: String(d.item.uom ?? ""), manufacturer: String(d.item.manufacturer ?? ""),
        reorderlevel: Number(d.item.reorderlevel ?? 0),
        criticalreagent: !!d.item.criticalreagent, isactive: d.item.isactive !== false,
      });
    } finally { setBusy(false); }
  };

  const saveItem = async () => {
    if (!detail) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-inventory/items/${detail.item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not save"); return; }
      setOk("Item saved"); setEditing(false);
      openDetail(String(detail.item.id)); load();
    } finally { setBusy(false); }
  };

  const submitAdjust = async () => {
    if (!detail || adjQty === "") return;
    setBusy(true); setError(null); setOk(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-inventory/adjust`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: detail.item.id, newQuantity: Number(adjQty), reason: adjReason, notes: adjNotes }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Adjustment failed"); return; }
      setOk(`${d.item}: ${d.before} → ${d.after} (${d.delta > 0 ? "+" : ""}${d.delta})`);
      setAdjusting(false); setAdjQty(""); setAdjNotes("");
      openDetail(String(detail.item.id)); load();
    } finally { setBusy(false); }
  };

  const addVendor = async () => {
    if (!vForm.name.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-inventory/vendors`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vForm),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Could not add vendor"); return; }
      setOk(`${vForm.name} added`); setShowVendor(false);
      setVForm({ name: "", contactname: "", phone: "", email: "" });
      load();
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold leading-tight">Lab Inventory</h2>
          <p className="text-xs text-muted-foreground">
            Reagents and consumables owned by this lab &mdash; separate from Pharmacy&apos;s items.
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={view === "items" ? "default" : "outline"} onClick={() => setView("items")} className="gap-1">
            <Boxes className="h-4 w-4" /> Items ({items.length})
          </Button>
          <Button size="sm" variant={view === "vendors" ? "default" : "outline"} onClick={() => setView("vendors")} className="gap-1">
            <Users className="h-4 w-4" /> Vendors ({vendors.length})
          </Button>
          <Button size="sm" variant={view === "alerts" ? "default" : "outline"} onClick={() => setView("alerts")} className="gap-1">
            <AlertTriangle className="h-4 w-4" /> Alerts ({alerts.length})
          </Button>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {ok && <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2"><CheckCircle2 className="h-4 w-4" /> {ok}</div>}

      {summary && view !== "vendors" && (
        <div className="grid grid-cols-4 gap-2 flex-shrink-0">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Items</div><div className="text-xl font-bold">{summary.totalItems}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Low Stock</div><div className="text-xl font-bold text-orange-600">{summary.lowStock}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Out of Stock</div><div className="text-xl font-bold text-red-600">{summary.outOfStock}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Expiring / Expired</div><div className="text-xl font-bold">{(summary.expiringSoon ?? 0) + (summary.expired ?? 0)}</div></CardContent></Card>
        </div>
      )}

      {/* Item detail drawer */}
      {detail && (
        <Card className="flex-shrink-0 border-blue-300">
          <CardHeader className="py-2 px-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">{String(detail.item.name)}</CardTitle>
            <div className="flex gap-1">
              {!editing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setAdjusting(!adjusting)}>Adjust stock</Button>
                </>
              ) : (
                <Button size="sm" onClick={saveItem} disabled={busy} className="gap-1"><Save className="h-3 w-3" /> Save</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setDetail(null)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {adjusting && (
              <div className="flex flex-wrap gap-2 items-end bg-orange-50 rounded p-2">
                <div className="w-32"><label className="text-xs text-muted-foreground">Counted quantity</label>
                  <Input type="number" min={0} value={adjQty} onChange={(e) => setAdjQty(e.target.value)} /></div>
                <div className="w-44"><label className="text-xs text-muted-foreground">Reason</label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={adjReason} onChange={(e) => setAdjReason(e.target.value)}>
                    {["STOCK_COUNT", "SPILLAGE", "EXPIRED", "DAMAGED", "OTHER"].map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select></div>
                <div className="flex-1 min-w-[160px]"><label className="text-xs text-muted-foreground">Notes</label>
                  <Input value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} /></div>
                <Button size="sm" onClick={submitAdjust} disabled={busy || adjQty === ""}>Apply</Button>
                <Button size="sm" variant="ghost" onClick={() => setAdjusting(false)}>Cancel</Button>
                <p className="w-full text-xs text-muted-foreground">
                  Sets stock to the counted figure and records the difference as a movement, so the history still adds up.
                </p>
              </div>
            )}
            {editing ? (
              <div className="grid grid-cols-3 gap-2">
                {[["name", "Name"], ["itemcode", "Code"], ["uom", "Unit"], ["manufacturer", "Manufacturer"], ["reorderlevel", "Reorder level"]].map(([k, label]) => (
                  <div key={k}>
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <Input value={String(edit[k] ?? "")} onChange={(e) => setEdit({ ...edit, [k]: k === "reorderlevel" ? Number(e.target.value) : e.target.value })} />
                  </div>
                ))}
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={!!edit.criticalreagent} onChange={(e) => setEdit({ ...edit, criticalreagent: e.target.checked })} /> Critical
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={!!edit.isactive} onChange={(e) => setEdit({ ...edit, isactive: e.target.checked })} /> Active
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Code</div>{String(detail.item.itemcode ?? "—")}</div>
                <div><div className="text-xs text-muted-foreground">Unit</div>{String(detail.item.uom ?? "—")}</div>
                <div><div className="text-xs text-muted-foreground">Manufacturer</div>{String(detail.item.manufacturer ?? "—")}</div>
                <div><div className="text-xs text-muted-foreground">Reorder at</div>{String(detail.item.reorderlevel ?? "—")}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold mb-1">Batches</div>
                {detail.batches.length === 0 ? <div className="text-xs text-muted-foreground">No batches.</div> : (
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground"><th className="py-1">Batch</th><th>Qty</th><th>Expiry</th></tr></thead>
                    <tbody>{detail.batches.map((b) => (
                      <tr key={b.id} className="border-t">
                        <td className="py-1">{b.batchnumber ?? "—"}</td><td>{b.quantity ?? 0}</td>
                        <td>{b.expirydate ? new Date(b.expirydate).toLocaleDateString() : "—"}</td>
                      </tr>))}</tbody>
                  </table>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold mb-1">Recent movements</div>
                {detail.movements.length === 0 ? <div className="text-xs text-muted-foreground">No movements.</div> : (
                  <div className="max-h-40 overflow-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-muted-foreground"><th className="py-1">Type</th><th>Qty</th><th>Ref</th><th>When</th></tr></thead>
                      <tbody>{detail.movements.slice(0, 15).map((m) => (
                        <tr key={m.id} className="border-t">
                          <td className="py-1">{m.type}</td>
                          <td className={m.quantity < 0 ? "text-red-700" : "text-green-700"}>{m.quantity}</td>
                          <td className="text-muted-foreground">{m.referenceid ?? "—"}</td>
                          <td className="text-muted-foreground">{new Date(m.createdat).toLocaleDateString()}</td>
                        </tr>))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {view === "items" ? (
        <>
          <div className="flex gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, code or manufacturer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1"><Plus className="h-4 w-4" /> New Item</Button>
          </div>

          {showAdd && (
            <Card className="flex-shrink-0">
              <CardContent className="p-3 flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[160px]"><label className="text-xs text-muted-foreground">Name</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CBC Reagent Kit" /></div>
                <div className="w-32"><label className="text-xs text-muted-foreground">Code</label>
                  <Input value={form.itemcode} onChange={(e) => setForm({ ...form, itemcode: e.target.value })} /></div>
                <div className="w-24"><label className="text-xs text-muted-foreground">Unit</label>
                  <Input value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} /></div>
                <div className="w-40"><label className="text-xs text-muted-foreground">Manufacturer</label>
                  <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
                <div className="w-28"><label className="text-xs text-muted-foreground">Reorder at</label>
                  <Input type="number" value={form.reorderlevel} onChange={(e) => setForm({ ...form, reorderlevel: Number(e.target.value) })} /></div>
                <Button size="sm" disabled={busy || !form.name.trim()} onClick={addItem} className="gap-1">
                  <PackagePlus className="h-4 w-4" /> {busy ? "Saving..." : "Add"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0">
              <CardTitle className="text-sm font-semibold">Items ({visible.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                : visible.length === 0 ? <div className="flex justify-center py-12 text-sm text-muted-foreground">No items.</div> : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b"><tr className="text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2">Name</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Stock</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th>
                  </tr></thead>
                  <tbody>{visible.map((i) => (
                    <tr key={i.itemid} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(i.itemid)}>
                      <td className="px-3 py-2">{i.name}
                        {i.criticalreagent && <Badge className="ml-2 bg-purple-100 text-purple-800">Critical</Badge>}
                        {!i.isactive && <Badge className="ml-2 bg-gray-100 text-gray-600">Inactive</Badge>}</td>
                      <td className="px-3 py-2 text-muted-foreground">{i.itemcode ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{i.uom ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-medium">{i.totalStock}</td>
                      <td className="px-3 py-2"><Badge className={statusColor[i.status]}>
                        {i.status === "ok" ? "In Stock" : i.status === "low" ? "Low" : "Out"}</Badge></td>
                      <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost">Details</Button></td>
                    </tr>))}</tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      ) : view === "vendors" ? (
        <>
          <div className="flex justify-end flex-shrink-0">
            <Button size="sm" onClick={() => setShowVendor(!showVendor)} className="gap-1"><Plus className="h-4 w-4" /> New Vendor</Button>
          </div>
          {showVendor && (
            <Card className="flex-shrink-0"><CardContent className="p-3 flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[160px]"><label className="text-xs text-muted-foreground">Name</label>
                <Input value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} /></div>
              <div className="w-40"><label className="text-xs text-muted-foreground">Contact</label>
                <Input value={vForm.contactname} onChange={(e) => setVForm({ ...vForm, contactname: e.target.value })} /></div>
              <div className="w-36"><label className="text-xs text-muted-foreground">Phone</label>
                <Input value={vForm.phone} onChange={(e) => setVForm({ ...vForm, phone: e.target.value })} /></div>
              <div className="w-48"><label className="text-xs text-muted-foreground">Email</label>
                <Input value={vForm.email} onChange={(e) => setVForm({ ...vForm, email: e.target.value })} /></div>
              <Button size="sm" disabled={busy || !vForm.name.trim()} onClick={addVendor}>Add</Button>
            </CardContent></Card>
          )}
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0"><CardTitle className="text-sm font-semibold">Vendors ({vendors.length})</CardTitle></CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
              {vendors.length === 0 ? <div className="flex justify-center py-12 text-sm text-muted-foreground">No vendors yet.</div> : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b"><tr className="text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2">Name</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th><th className="px-3 py-2">Status</th>
                  </tr></thead>
                  <tbody>{vendors.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{v.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.contactname ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.phone ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.email ?? "—"}</td>
                      <td className="px-3 py-2"><Badge className={v.isactive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                        {v.isactive ? "Active" : "Inactive"}</Badge></td>
                    </tr>))}</tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="py-2 px-3 border-b flex-shrink-0">
            <CardTitle className="text-sm font-semibold">Needs attention ({alerts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
            {alerts.length === 0 ? <div className="flex justify-center py-12 text-sm text-muted-foreground">Nothing needs attention.</div> : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right">Reorder at</th><th className="px-3 py-2">Issue</th>
                </tr></thead>
                <tbody>{alerts.map((i) => (
                  <tr key={i.itemid} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(i.itemid)}>
                    <td className="px-3 py-2">{i.name}</td>
                    <td className="px-3 py-2 text-right">{i.totalStock}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{i.reorderlevel ?? "—"}</td>
                    <td className="px-3 py-2">
                      {i.status === "outofstock" && <Badge className="bg-red-100 text-red-800">Out of stock</Badge>}
                      {i.status === "low" && <Badge className="bg-orange-100 text-orange-800">Low stock</Badge>}
                      {i.hasExpired && <Badge className="ml-1 bg-red-100 text-red-800">Expired batch</Badge>}
                      {i.hasExpiring && <Badge className="ml-1 bg-orange-100 text-orange-800">Expiring soon</Badge>}
                    </td>
                  </tr>))}</tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
