/**
 * Billing Tab — bills a patient's pending lab orders.
 *
 * Unlike Pharmacy's POS, this does not sell from inventory. It lists a
 * patient's outstanding tests from lims_orders (this app) and EHR/doctor
 * referrals, lets staff pick which to invoice, and creates the invoice.
 * Stock is never touched here — reagent consumption happens separately
 * when a test is actually run.
 */
"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Receipt, CheckCircle2 } from "lucide-react";

interface PatientHit {
  patientid: string;
  firstname: string;
  lastname: string;
}

interface PendingLine {
  source: "LIMS" | "EHR";
  ref: string;
  orderId: string;
  testCode: string | null;
  testName: string;
  price: number;
  orderedAt: string | null;
  orderingProvider: string | null;
}

export default function BillingTab({ workspaceid }: { workspaceid: string }) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientHit[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(null);
  const [searching, setSearching] = useState(false);

  const [pending, setPending] = useState<PendingLine[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string | null>(null);

  const searchPatients = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setLastInvoiceNumber(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPatients(data.patients ?? data ?? []);
    } catch (e) {
      console.error("Patient search failed", e);
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = async (p: PatientHit) => {
    setSelectedPatient(p);
    setPatients([]);
    setSelectedRefs(new Set());
    setLastInvoiceNumber(null);
    setLoadingPending(true);
    try {
      const res = await fetch(`/api/lims/billing/pending?workspaceid=${workspaceid}&patientid=${p.patientid}`);
      const data = await res.json();
      setPending(data.pending ?? []);
    } catch (e) {
      console.error("Failed to load pending orders", e);
    } finally {
      setLoadingPending(false);
    }
  };

  const toggle = (ref: string) => {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const selectedLines = pending.filter((l) => selectedRefs.has(l.ref));
  const total = selectedLines.reduce((sum, l) => sum + (l.price || 0), 0);

  const createInvoice = async () => {
    if (!selectedPatient || selectedLines.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/lims/billing/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceid,
          patientid: selectedPatient.patientid,
          lines: selectedLines,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastInvoiceNumber(data.invoice?.invoice_number ?? null);
        setSelectedRefs(new Set());
        // Refresh pending list so billed lines drop off.
        selectPatient(selectedPatient);
      }
    } catch (e) {
      console.error("Failed to create invoice", e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div>
        <h2 className="text-lg font-bold leading-tight">Lab Billing</h2>
        <p className="text-xs text-muted-foreground">
          Bill a patient's pending lab orders &mdash; not a sale from inventory
        </p>
      </div>

      <Card className="flex-shrink-0">
        <CardContent className="p-3 flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Patient</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search patient by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPatients()}
              />
            </div>
          </div>
          <Button size="sm" onClick={searchPatients} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </CardContent>
        {patients.length > 0 && (
          <CardContent className="p-3 pt-0 flex flex-wrap gap-2">
            {patients.map((p) => (
              <Button key={p.patientid} variant="outline" size="sm" onClick={() => selectPatient(p)}>
                {p.firstname} {p.lastname}
              </Button>
            ))}
          </CardContent>
        )}
      </Card>

      {selectedPatient && (
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="py-2 px-3 border-b flex-shrink-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                {selectedPatient.firstname} {selectedPatient.lastname} &mdash; Pending Orders
              </CardTitle>
              <CardDescription className="text-xs">
                Select tests to invoice. Reagent stock is not affected here.
              </CardDescription>
            </div>
            {lastInvoiceNumber && (
              <Badge className="bg-green-100 text-green-800 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Invoice {lastInvoiceNumber} created
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
            {loadingPending ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <span className="text-sm text-muted-foreground">Loading pending orders...</span>
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                No unbilled pending lab orders for this patient.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Ordering Provider</th>
                    <th className="px-3 py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((l) => (
                    <tr key={l.ref} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <Checkbox checked={selectedRefs.has(l.ref)} onCheckedChange={() => toggle(l.ref)} />
                      </td>
                      <td className="px-3 py-2">{l.testName}{l.testCode && <span className="text-muted-foreground"> ({l.testCode})</span>}</td>
                      <td className="px-3 py-2">
                        <Badge className={l.source === "LIMS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                          {l.source === "LIMS" ? "Lab Order" : "EHR Referral"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{l.orderingProvider ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{l.price ? l.price.toLocaleString() : "—"}</td>
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
            </div>
            <Button disabled={selectedLines.length === 0 || creating} onClick={createInvoice} className="gap-1">
              <Receipt className="h-4 w-4" />
              {creating ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
