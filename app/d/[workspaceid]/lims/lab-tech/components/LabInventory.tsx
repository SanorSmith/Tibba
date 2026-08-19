"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, PackagePlus } from "lucide-react";

interface LabItem {
  itemid: string;
  name: string;
  genericname: string | null;
  itemcode: string | null;
  uom: string | null;
  manufacturer: string | null;
  isactive: boolean;
  reorderlevel: number | null;
  totalStock: number;
  status: "ok" | "low" | "outofstock";
  isLowStock: boolean;
  isOutOfStock: boolean;
  criticalreagent: boolean | null;
}

interface Summary {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  reorderNeeded: number;
}

const statusColor: Record<LabItem["status"], string> = {
  ok: "bg-green-100 text-green-800",
  low: "bg-orange-100 text-orange-800",
  outofstock: "bg-red-100 text-red-800",
};

export default function LabInventory({ workspaceid }: { workspaceid: string }) {
  const [items, setItems] = useState<LabItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newUom, setNewUom] = useState("unit");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/d/${workspaceid}/lab-inventory?${params.toString()}`);
      const data = await res.json();
      setItems(data.inventory ?? []);
      setSummary(data.summary ?? null);
    } catch (e) {
      console.error("Failed to load lab inventory", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceid, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, itemcode: newCode || undefined, uom: newUom }),
      });
      if (res.ok) {
        setNewName("");
        setNewCode("");
        setNewUom("unit");
        setShowAdd(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">Lab Inventory</h2>
          <p className="text-xs text-muted-foreground">
            Reagents and consumables owned by this lab &mdash; separate from Pharmacy's items
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)} className="gap-1">
          <Plus className="h-4 w-4" /> New Item
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-2 flex-shrink-0">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Items</div><div className="text-xl font-bold">{summary.totalItems}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Low Stock</div><div className="text-xl font-bold text-orange-600">{summary.lowStock}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Out of Stock</div><div className="text-xl font-bold text-red-600">{summary.outOfStock}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Reorder Needed</div><div className="text-xl font-bold">{summary.reorderNeeded}</div></CardContent></Card>
        </div>
      )}

      {showAdd && (
        <Card className="flex-shrink-0">
          <CardContent className="p-3 flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Gram Stain Kit" />
            </div>
            <div className="w-32">
              <label className="text-xs text-muted-foreground">Item Code</label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground">Unit</label>
              <Input value={newUom} onChange={(e) => setNewUom(e.target.value)} />
            </div>
            <Button size="sm" disabled={saving || !newName.trim()} onClick={handleAdd} className="gap-1">
              <PackagePlus className="h-4 w-4" /> {saving ? "Saving..." : "Add"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, code, generic name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="py-2 px-3 border-b flex-shrink-0">
          <CardTitle className="text-sm font-semibold">Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <span className="text-sm text-muted-foreground">Loading inventory...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              No lab items yet. Add one above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.itemid} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {i.name}
                      {i.criticalreagent && <Badge className="ml-2 bg-purple-100 text-purple-800">Critical</Badge>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{i.itemcode ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.uom ?? "—"}</td>
                    <td className="px-3 py-2">{i.totalStock}</td>
                    <td className="px-3 py-2">
                      <Badge className={statusColor[i.status]}>
                        {i.status === "ok" ? "In Stock" : i.status === "low" ? "Low Stock" : "Out of Stock"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
