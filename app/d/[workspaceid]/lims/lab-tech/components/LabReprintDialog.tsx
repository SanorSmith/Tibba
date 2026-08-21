/**
 * Reprint a lab counter receipt — the same flow the pharmacy POS uses.
 *
 * Search by receipt number, patient, or date, pick the receipt, look at it,
 * then mark and print. The "mark as reprint" step is deliberate: it stamps
 * the copy and records who produced it, so a duplicate in circulation is
 * always traceable.
 */
"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import LabReceiptTemplate from "./LabReceiptTemplate";
import type { ReceiptData } from "./LabReceipt";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceid: string;
}

type Row = {
  id: string;
  invoiceId?: string;
  receiptNumber: string;
  patientName?: string | null;
  cashier?: string | null;
  amount: number;
  date: string;
  type: "PAYMENT" | "REFUND" | "SHIFT";
};

export default function LabReprintDialog({ open, onClose, workspaceid }: Props) {
  const [searchType, setSearchType] = useState<"receiptNumber" | "name" | "dateRange">("receiptNumber");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [receiptType, setReceiptType] = useState<"PAYMENT" | "REFUND" | "SHIFT" | "ALL">("ALL");

  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchResults, setSearchResults] = useState<{ payments: Row[]; refunds: Row[]; shifts: Row[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Row | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [isReprint, setIsReprint] = useState(false);
  const [printFormat, setPrintFormat] = useState<"THERMAL" | "PDF" | "BROWSER">("THERMAL");
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { workspaceId: workspaceid, receiptType };
      if (filterDate) { params.startDate = filterDate; params.endDate = filterDate; }
      if (searchType === "receiptNumber" && receiptNumber) params.receiptNumber = receiptNumber;
      if (searchType === "name" && name) params.patientName = name;
      if (searchType === "dateRange") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await fetch("/api/lims/billing/receipts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setSearchResults(json);
      setSelectedReceipt(null);
      setReceiptData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReceipt = async (receipt: Row) => {
    setSelectedReceipt(receipt);
    setLoadingReceipt(true);
    setIsReprint(false);
    setError(null);
    try {
      const res = await fetch(
        `/api/lims/billing/receipts/detail?type=${receipt.type}&id=${receipt.id}&workspaceid=${workspaceid}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load receipt");
      setReceiptData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load receipt");
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleReprint = async () => {
    if (!selectedReceipt) return;
    try {
      await fetch("/api/lims/billing/receipts/reprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceid,
          receiptType: selectedReceipt.type,
          paymentId: selectedReceipt.type === "SHIFT" ? null : selectedReceipt.id,
          invoiceId: selectedReceipt.invoiceId ?? null,
          shiftId: selectedReceipt.type === "SHIFT" ? selectedReceipt.id : null,
          printFormat,
        }),
      });
      setIsReprint(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log the reprint");
    }
  };

  const handleClose = () => {
    onClose();
    setSearchResults(null);
    setSelectedReceipt(null);
    setReceiptData(null);
    setIsReprint(false);
    setError(null);
  };

  const rows: Row[] = searchResults
    ? [...(searchResults.payments ?? []), ...(searchResults.refunds ?? []), ...(searchResults.shifts ?? [])]
    : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reprint Receipt</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 rounded p-2">{error}</div>
        )}

        {!selectedReceipt ? (
          <>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap text-sm">Date</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-44"
                />
                {filterDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setFilterDate("")}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Search By</Label>
                  <Select value={searchType} onValueChange={(v: any) => setSearchType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receiptNumber">Receipt Number</SelectItem>
                      <SelectItem value="name">Patient Name</SelectItem>
                      <SelectItem value="dateRange">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Receipt Type</Label>
                  <Select value={receiptType} onValueChange={(v: any) => setReceiptType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="PAYMENT">Payments Only</SelectItem>
                      <SelectItem value="REFUND">Refunds Only</SelectItem>
                      <SelectItem value="SHIFT">Shift Reports Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {searchType === "receiptNumber" && (
                <div>
                  <Label>Receipt Number</Label>
                  <Input
                    placeholder="LAB-20260101-XXXXXX"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                  />
                </div>
              )}

              {searchType === "name" && (
                <div>
                  <Label>Patient Name</Label>
                  <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}

              {searchType === "dateRange" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}

              <Button onClick={handleSearch} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>

            {searchResults && (
              <div className="border rounded-lg overflow-hidden">
                {rows.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No receipts found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Patient/Cashier</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={`${r.type}-${r.id}`}>
                          <TableCell>
                            <Badge
                              variant={
                                r.type === "PAYMENT" ? "default" : r.type === "REFUND" ? "destructive" : "secondary"
                              }
                            >
                              {r.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{r.receiptNumber}</TableCell>
                          <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                          <TableCell>{r.patientName || r.cashier}</TableCell>
                          <TableCell className="text-right">{r.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleSelectReceipt(r)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                ← Back to Search
              </Button>
              <div className="flex items-center gap-2">
                <Select value={printFormat} onValueChange={(v: any) => setPrintFormat(v)}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THERMAL">Thermal</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="BROWSER">Browser</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleReprint} disabled={isReprint}>
                  {isReprint ? "Reprinted" : "Mark as Reprint"}
                </Button>
              </div>
            </div>

            {loadingReceipt ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading receipt...
              </div>
            ) : receiptData ? (
              <LabReceiptTemplate data={receiptData} isReprint={isReprint} printFormat={printFormat} />
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
