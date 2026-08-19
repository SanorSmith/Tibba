/**
 * Billing Tab — invoice the lab tests this facility has been asked to run.
 *
 * Shows the same outstanding work the Orders tab lists, minus anything
 * already invoiced. Unlike Pharmacy's POS this never sells from or touches
 * inventory: reagent stock moves separately, when a test is actually run.
 */
"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Receipt, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface PendingLine {
  source: "LIMS" | "EHR";
  ref: string;
  orderId: string;
  patientId: string | null;
  patientName: string;
  testCode: string | null;
  testName: string;
  price: number;
  orderedAt: string | null;
  orderingProvider: string | null;
  status: string | null;
}

export default function BillingTab({ workspaceid }: { workspaceid: string }) {
  const [pending, setPending] = useState<PendingLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lims/billing/pending?workspaceid=${workspaceid}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load pending orders");
        return;
      }
      setPending(data.pending ?? []);
    } catch {
      setError("Could not load pending orders");
    } finally {
      setLoading(false);
    }
  }, [workspaceid]);

  useEffect(() => {
    load();
  }, [load]);

  // Filters as you type — no search button, no round trip.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter(
      (l) =>
        l.patientName.toLowerCase().includes(q) ||
        l.testName.toLowerCase().includes(q) ||
        (l.testCode ?? "").toLowerCase().includes(q) ||
        (l.orderingProvider ?? "").toLowerCase().includes(q)
    );
  }, [pending, query]);

  const selectedLines = pending.filter((l) => selectedRefs.has(l.ref));
  const total = selectedLines.reduce((s, l) => s + (l.price || 0), 0);

  // Billing mixes patients only by mistake — one invoice, one patient.
  const patientsInSelection = new Set(selectedLines.map((l) => l.patientId ?? l.patientName));
  const mixedPatients = patientsInSelection.size > 1;

  const toggle = (ref: string) =>
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      next.has(ref) ? next.delete(ref) : next.add(ref);
      return next;
    });

  const toggleAllVisible = () => {
    const allSelected = visible.length > 0 && visible.every((l) => selectedRefs.has(l.ref));
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      visible.forEach((l) => (allSelected ? next.delete(l.ref) : next.add(l.ref)));
      return next;
    });
  };

  const createInvoice = async () => {
    if (selectedLines.length === 0 || mixedPatients) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/lims/billing/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceid,
          patientid: selectedLines[0].patientId,
          lines: selectedLines,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create invoice");
        return;
      }
      setLastInvoice(data.invoice?.invoice_number ?? null);
      setSelectedRefs(new Set());
      load();
    } catch {
      setError("Could not create invoice");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">Lab Billing</h2>
          <p className="text-xs text-muted-foreground">
            Unbilled lab tests. Selecting and invoicing does not affect reagent stock.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastInvoice && (
            <Badge className="bg-green-100 text-green-800 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Invoice {lastInvoice} created
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={load} className="gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2 flex-shrink-0">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Filter by patient, test or provider..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="py-2 px-3 border-b flex-shrink-0">
          <CardTitle className="text-sm font-semibold">
            Unbilled Tests ({visible.length}
            {query && pending.length !== visible.length ? ` of ${pending.length}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
              <span className="text-sm text-muted-foreground">Loading pending orders...</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {pending.length === 0 ? "Nothing left to bill." : "No matches."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 w-8">
                    <Checkbox
                      checked={visible.length > 0 && visible.every((l) => selectedRefs.has(l.ref))}
                      onCheckedChange={toggleAllVisible}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Test</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr key={l.ref} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Checkbox checked={selectedRefs.has(l.ref)} onCheckedChange={() => toggle(l.ref)} />
                    </td>
                    <td className="px-3 py-2 font-medium">{l.patientName}</td>
                    <td className="px-3 py-2">
                      {l.testName}
                      {l.testCode && <span className="text-muted-foreground"> ({l.testCode})</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        className={
                          l.source === "LIMS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }
                      >
                        {l.source === "LIMS" ? "Lab Order" : "EHR Referral"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{l.orderingProvider ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {l.price ? l.price.toLocaleString() : <span className="text-orange-600">no price</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>

        <div className="flex items-center justify-between border-t p-3 flex-shrink-0">
          <div className="text-sm">
            <span className="text-muted-foreground">Selected: </span>
            <span className="font-semibold">{selectedLines.length}</span>
            <span className="text-muted-foreground ml-3">Total: </span>
            <span className="font-semibold">{total.toLocaleString()}</span>
            {mixedPatients && (
              <span className="ml-3 text-orange-700">
                Selection spans several patients — invoice one at a time.
              </span>
            )}
          </div>
          <Button
            disabled={selectedLines.length === 0 || creating || mixedPatients}
            onClick={createInvoice}
            className="gap-1"
          >
            <Receipt className="h-4 w-4" />
            {creating ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
