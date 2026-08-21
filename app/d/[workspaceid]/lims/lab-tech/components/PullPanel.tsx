/**
 * Pull Panel — take reagents/consumables out of lab stock to run a test.
 *
 * This is the only place lab stock goes down. Pulls are signed by whoever is
 * signed in and appear in the history below immediately.
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, PackageMinus, AlertCircle } from "lucide-react";

interface LabItem {
  itemid: string;
  name: string;
  itemcode: string | null;
  uom: string | null;
  totalStock: number;
}

interface PullLine {
  itemId: string;
  quantity: number;
}

interface HistoryRow {
  id: string;
  itemname: string;
  itemcode: string | null;
  uom: string | null;
  batchnumber: string | null;
  quantity: string;
  sampleref: string | null;
  patientref: string | null;
  notes: string | null;
  pulledbyname: string | null;
  pulledat: string;
}

export default function PullPanel({ workspaceid }: { workspaceid: string }) {
  const [stock, setStock] = useState<LabItem[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<PullLine[]>([{ itemId: "", quantity: 1 }]);
  const [sampleRef, setSampleRef] = useState("");
  const [patientRef, setPatientRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, histRes] = await Promise.all([
        fetch(`/api/d/${workspaceid}/lab-inventory`),
        fetch(`/api/d/${workspaceid}/lab-inventory/pull`),
      ]);
      const inv = await invRes.json();
      const hist = await histRes.json();
      setStock(inv.inventory ?? []);
      setHistory(hist.history ?? []);
    } catch (e) {
      console.error("Failed to load pull panel", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceid]);

  useEffect(() => {
    load();
  }, [load]);

  const updateLine = (i: number, patch: Partial<PullLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { itemId: "", quantity: 1 }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const validLines = lines.filter((l) => l.itemId && l.quantity > 0);

  // Warn before submitting rather than after the server rejects the whole pull.
  const shortfalls = validLines
    .map((l) => {
      const item = stock.find((s) => s.itemid === l.itemId);
      return item && l.quantity > item.totalStock ? { name: item.name, want: l.quantity, have: item.totalStock } : null;
    })
    .filter(Boolean) as Array<{ name: string; want: number; have: number }>;

  const submit = async () => {
    if (validLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-inventory/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: validLines, sampleRef, patientRef, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Pull failed");
        return;
      }
      setSuccess(`Pulled ${data.pulled.length} item${data.pulled.length === 1 ? "" : "s"}, signed by ${data.pulledBy}`);
      setLines([{ itemId: "", quantity: 1 }]);
      setSampleRef("");
      setPatientRef("");
      setNotes("");
      load();
    } catch {
      setError("Pull failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div>
        <h2 className="text-lg font-bold leading-tight">Pull Items</h2>
        <p className="text-xs text-muted-foreground">
          Take reagents out of stock to run a test. Every pull is recorded against your name.
        </p>
      </div>

      <Card className="flex-shrink-0">
        <CardHeader className="py-2 px-3 border-b">
          <CardTitle className="text-sm font-semibold">New Pull</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {lines.map((line, i) => {
            const item = stock.find((s) => s.itemid === line.itemId);
            return (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  {i === 0 && <label className="text-xs text-muted-foreground">Item</label>}
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={line.itemId}
                    onChange={(e) => updateLine(i, { itemId: e.target.value })}
                  >
                    <option value="">Select an item...</option>
                    {stock.map((s) => (
                      <option key={s.itemid} value={s.itemid}>
                        {s.name} {s.itemcode ? `(${s.itemcode})` : ""} — {s.totalStock} {s.uom ?? ""} in stock
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  {i === 0 && <label className="text-xs text-muted-foreground">Quantity</label>}
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="w-16 text-xs text-muted-foreground pb-2">{item?.uom ?? ""}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
            <Plus className="h-4 w-4" /> Add another item
          </Button>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <div>
              <label className="text-xs text-muted-foreground">Sample ref (optional)</label>
              <Input value={sampleRef} onChange={(e) => setSampleRef(e.target.value)} placeholder="e.g. ACC-1042" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Patient ref (optional)</label>
              <Input value={patientRef} onChange={(e) => setPatientRef(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {shortfalls.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 rounded p-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {shortfalls.map((s) => (
                  <div key={s.name}>
                    Not enough {s.name}: asking for {s.want}, {s.have} in stock.
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          {success && <div className="text-xs text-green-700 bg-green-50 rounded p-2">{success}</div>}

          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={submitting || validLines.length === 0 || shortfalls.length > 0}
              className="gap-1"
            >
              <PackageMinus className="h-4 w-4" />
              {submitting ? "Recording..." : "Pull & Sign"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="py-2 px-3 border-b flex-shrink-0">
          <CardTitle className="text-sm font-semibold">Pull History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No pulls recorded yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Sample</th>
                  <th className="px-3 py-2">Pulled by</th>
                  <th className="px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2">{h.itemname}</td>
                    <td className="px-3 py-2">
                      {Number(h.quantity)} {h.uom ?? ""}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{h.batchnumber ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{h.sampleref ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge className="bg-blue-100 text-blue-800">{h.pulledbyname ?? "Unknown"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {h.pulledat ? new Date(h.pulledat).toLocaleString() : "—"}
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
