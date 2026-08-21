/**
 * Lab Dashboard — what a lab manager opens the system to find out.
 *
 * Work waiting, money owed, what is running out, what is about to expire.
 * Everything here is a summary of screens elsewhere; nothing is edited from
 * this tab.
 */
"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertCircle, ClipboardList, Wallet, FlaskConical, Truck } from "lucide-react";

interface Dash {
  work: { openOrders: number; pendingTests: number };
  money: { billedToday: number; collectedToday: number; outstandingCount: number; outstandingTotal: number };
  stock: {
    totalItems: number;
    lowStock: Array<{ name: string; qty: number; reorderlevel: number | null }>;
    outOfStock: Array<{ name: string }>;
    expiring: Array<{ name: string; batchnumber: string | null; quantity: number | null; expirydate: string | null; expired: boolean }>;
  };
  procurement: { openOrders: number; openClaims: number; openClaimsValue: number; returns: number };
  recent: Array<{ id: string; type: string; quantity: number; item: string; reference: string | null; createdat: string }>;
}

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function LabDashboard({ workspaceid }: { workspaceid: string }) {
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/d/${workspaceid}/lab-dashboard`);
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Could not load dashboard"); return; }
      setD(j);
    } catch { setError("Could not load dashboard"); }
    finally { setLoading(false); }
  }, [workspaceid]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2"><AlertCircle className="h-4 w-4" /> {error}</div>;
  if (!d) return null;

  const needsAttention = d.stock.outOfStock.length + d.stock.lowStock.length + d.stock.expiring.length;

  return (
    <div className="flex flex-col h-full gap-2 overflow-auto">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold leading-tight">Lab Overview</h2>
          <p className="text-xs text-muted-foreground">Work waiting, money owed, and what needs restocking.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><ClipboardList className="h-3 w-3" /> Open orders</div>
          <div className="text-2xl font-bold">{d.work.openOrders}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{d.work.pendingTests} test(s) requested</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Wallet className="h-3 w-3" /> Collected today</div>
          <div className="text-2xl font-bold text-green-700">{money(d.money.collectedToday)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{money(d.money.billedToday)} invoiced today</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Wallet className="h-3 w-3" /> Outstanding</div>
          <div className="text-2xl font-bold text-orange-700">{money(d.money.outstandingTotal)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">across {d.money.outstandingCount} invoice(s)</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><FlaskConical className="h-3 w-3" /> Needs attention</div>
          <div className={`text-2xl font-bold ${needsAttention ? "text-red-700" : ""}`}>{needsAttention}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{d.stock.totalItems} item(s) tracked</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm">Running out</CardTitle></CardHeader>
          <CardContent className="p-0">
            {d.stock.outOfStock.length === 0 && d.stock.lowStock.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Everything is above its reorder level.</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {d.stock.outOfStock.map((r) => (
                    <tr key={r.name} className="border-b last:border-0">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-right"><Badge className="bg-red-100 text-red-800">Out of stock</Badge></td>
                    </tr>
                  ))}
                  {d.stock.lowStock.map((r) => (
                    <tr key={r.name} className="border-b last:border-0">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-muted-foreground mr-2">{r.qty} left</span>
                        <Badge className="bg-orange-100 text-orange-800">Low</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm">Expiring within 30 days</CardTitle></CardHeader>
          <CardContent className="p-0">
            {d.stock.expiring.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Nothing expiring soon.</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {d.stock.expiring.map((e, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{e.name}
                        <span className="text-muted-foreground text-xs"> {e.batchnumber ?? ""}</span></td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-muted-foreground mr-2">{e.quantity ?? 0}</span>
                        <Badge className={e.expired ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}>
                          {e.expirydate ? new Date(e.expirydate).toLocaleDateString() : "—"}
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

      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Truck className="h-3 w-3" /> Orders in flight</div>
          <div className="text-xl font-bold">{d.procurement.openOrders}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Open claims</div>
          <div className="text-xl font-bold">{d.procurement.openClaims}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{money(d.procurement.openClaimsValue)} claimed</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground">Returns sent</div>
          <div className="text-xl font-bold">{d.procurement.returns}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="py-2 px-3 border-b"><CardTitle className="text-sm">Recent stock activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {d.recent.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No stock movement yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b"><tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Item</th><th className="px-3 py-2">Movement</th>
                <th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2">When</th>
              </tr></thead>
              <tbody>
                {d.recent.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{r.item}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.type}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.quantity < 0 ? "text-red-700" : "text-green-700"}`}>
                      {r.quantity > 0 ? "+" : ""}{r.quantity}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.reference ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.createdat).toLocaleString()}</td>
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
