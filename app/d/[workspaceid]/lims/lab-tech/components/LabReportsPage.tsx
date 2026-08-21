/**
 * Lab reports — mirrors Pharmacy's reports hub: a grid of coloured report
 * cards that drill into detail, with a back arrow at each level.
 *
 * Invoiced and Collected are reported separately throughout. What the lab
 * earned in a period is not what arrived in it, and merging the two is how a
 * lab comes to believe it holds money it has not been paid.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, AlertCircle, DollarSign, Clock, RotateCcw,
  FlaskConical, Users, ShoppingCart, TrendingUp,
} from "lucide-react";

interface Reports {
  range: { from: string; to: string };
  invoiced: { count: number; total: number };
  collected: { total: number; byMethod: Array<{ method: string; amount: number; count: number }> };
  outstanding: { count: number; total: number };
  refunds: { count: number; total: number };
  topTests: Array<{ name: string; count: number; revenue: number }>;
  byCashier: Array<{ name: string; amount: number; count: number }>;
  daily: Array<{ day: string; invoiced: number; collected: number }>;
}
interface ShiftRow {
  id: string; shiftnumber: string; cashiername: string | null; status: string;
  openingcash: string; expectedcash: string | null; actualcash: string | null;
  variance: string | null; collected: string; transactions: number;
}

type View = "hub" | "daily" | "shifts" | "refunds" | "tests" | "cashiers" | "financial";

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function LabReportsPage({
  workspaceid,
  onBack,
}: {
  workspaceid: string;
  onBack: () => void;
}) {
  const [view, setView] = useState<View>("hub");
  const [r, setR] = useState<Reports | null>(null);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ workspaceid });
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const [rep, sh] = await Promise.all([
        fetch(`/api/lims/billing/reports?${qs.toString()}`),
        fetch(`/api/lims/billing/shifts?workspaceid=${workspaceid}`),
      ]);
      const rj = await rep.json();
      if (!rep.ok) { setError(rj.error ?? "Could not load reports"); return; }
      setR(rj);
      setShifts((await sh.json()).shifts ?? []);
    } catch { setError("Could not load reports"); }
    finally { setLoading(false); }
  }, [workspaceid, from, to]);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { key: "daily" as View, title: "Daily Sales", description: "Invoiced vs collected, day by day", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
    { key: "shifts" as View, title: "Shift Reports", description: "Cash reconciliation, variance & history", icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
    { key: "refunds" as View, title: "Refunds Analysis", description: "What was refunded and how much", icon: RotateCcw, color: "text-orange-600", bg: "bg-orange-50" },
    { key: "tests" as View, title: "Test Performance", description: "Most billed tests, revenue per test", icon: FlaskConical, color: "text-teal-600", bg: "bg-teal-50" },
    { key: "cashiers" as View, title: "Cashier Performance", description: "Collections per cashier", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { key: "financial" as View, title: "Financial Overview", description: "Earned, collected, outstanding", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
  ];

  const header = (title: string, back: () => void, subtitle?: string) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={back}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (error) return (
    <div className="space-y-3">
      {header("Reports", onBack)}
      <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded p-2"><AlertCircle className="h-4 w-4" /> {error}</div>
    </div>
  );
  if (!r) return null;

  if (view === "hub") {
    return (
      <div className="flex flex-1 flex-col h-full overflow-auto space-y-4 pb-4">
        {header("Reports", onBack, "Billing, collections and performance reporting")}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Invoiced ({r.invoiced.count})</div>
            <div className="text-xl font-bold">{money(r.invoiced.total)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Collected</div>
            <div className="text-xl font-bold text-green-700">{money(r.collected.total)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Outstanding ({r.outstanding.count})</div>
            <div className="text-xl font-bold text-orange-700">{money(r.outstanding.total)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Refunds ({r.refunds.count})</div>
            <div className="text-xl font-bold">{money(r.refunds.total)}</div>
          </CardContent></Card>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.title} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setView(c.key)}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${c.bg}`}>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const back = () => setView("hub");
  const dateRange = (
    <div className="flex gap-2 items-end">
      <div><label className="text-xs text-muted-foreground">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
      <div><label className="text-xs text-muted-foreground">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <Button size="sm" variant="outline" onClick={load}>Apply</Button>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col h-full overflow-auto space-y-4 pb-4">
      {view === "daily" && (
        <>
          {header("Daily Sales", back, `${r.range.from} to ${r.range.to}`)}
          {dateRange}
          <Card><CardContent className="p-0">
            {r.daily.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No activity in this period.</p> : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Day</th><th className="px-3 py-2 text-right">Invoiced</th>
                  <th className="px-3 py-2 text-right">Collected</th><th className="px-3 py-2 text-right">Difference</th>
                </tr></thead>
                <tbody>{r.daily.map((d) => (
                  <tr key={d.day} className="border-b last:border-0">
                    <td className="px-3 py-2">{d.day}</td>
                    <td className="px-3 py-2 text-right">{money(d.invoiced)}</td>
                    <td className="px-3 py-2 text-right text-green-700">{money(d.collected)}</td>
                    <td className={`px-3 py-2 text-right ${d.collected - d.invoiced < 0 ? "text-orange-700" : ""}`}>
                      {money(d.collected - d.invoiced)}
                    </td>
                  </tr>))}</tbody>
              </table>
            )}
          </CardContent></Card>
        </>
      )}

      {view === "shifts" && (
        <>
          {header("Shift Reports", back, "Cash reconciliation and variance")}
          <Card><CardContent className="p-0">
            {shifts.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No shifts yet.</p> : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Shift</th><th className="px-3 py-2">Cashier</th><th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Txns</th><th className="px-3 py-2 text-right">Collected</th>
                  <th className="px-3 py-2 text-right">Expected</th><th className="px-3 py-2 text-right">Counted</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                </tr></thead>
                <tbody>{shifts.map((s) => {
                  const v = s.variance != null ? Number(s.variance) : null;
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{s.shiftnumber}</td>
                      <td className="px-3 py-2">{s.cashiername ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge className={s.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{s.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">{s.transactions}</td>
                      <td className="px-3 py-2 text-right">{money(Number(s.collected))}</td>
                      <td className="px-3 py-2 text-right">{s.expectedcash ? money(Number(s.expectedcash)) : "—"}</td>
                      <td className="px-3 py-2 text-right">{s.actualcash ? money(Number(s.actualcash)) : "—"}</td>
                      <td className={`px-3 py-2 text-right ${v == null ? "" : v === 0 ? "text-green-700" : "text-red-700"}`}>
                        {v == null ? "—" : v === 0 ? "balanced" : money(v)}
                      </td>
                    </tr>);
                })}</tbody>
              </table>
            )}
          </CardContent></Card>
        </>
      )}

      {view === "refunds" && (
        <>
          {header("Refunds Analysis", back)}
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Refunds issued</div>
              <div className="text-2xl font-bold">{r.refunds.count}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Total refunded</div>
              <div className="text-2xl font-bold text-orange-700">{money(r.refunds.total)} IQD</div>
            </CardContent></Card>
          </div>
          {r.refunds.count === 0 && (
            <p className="text-sm text-muted-foreground">No refunds have been issued.</p>
          )}
        </>
      )}

      {view === "tests" && (
        <>
          {header("Test Performance", back, "Most billed tests by revenue")}
          <Card><CardContent className="p-0">
            {r.topTests.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nothing billed yet.</p> : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Test</th><th className="px-3 py-2 text-right">Times billed</th>
                  <th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">Avg</th>
                </tr></thead>
                <tbody>{r.topTests.map((t) => (
                  <tr key={t.name} className="border-b last:border-0">
                    <td className="px-3 py-2">{t.name}</td>
                    <td className="px-3 py-2 text-right">{t.count}</td>
                    <td className="px-3 py-2 text-right font-medium">{money(t.revenue)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{money(t.count ? t.revenue / t.count : 0)}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </CardContent></Card>
        </>
      )}

      {view === "cashiers" && (
        <>
          {header("Cashier Performance", back, `${r.range.from} to ${r.range.to}`)}
          {dateRange}
          <Card><CardContent className="p-0">
            {r.byCashier.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No collections in this period.</p> : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50"><tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Cashier</th><th className="px-3 py-2 text-right">Transactions</th>
                  <th className="px-3 py-2 text-right">Collected</th>
                </tr></thead>
                <tbody>{r.byCashier.map((c) => (
                  <tr key={c.name} className="border-b last:border-0">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2 text-right">{c.count}</td>
                    <td className="px-3 py-2 text-right font-medium">{money(c.amount)}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </CardContent></Card>
        </>
      )}

      {view === "financial" && (
        <>
          {header("Financial Overview", back, `${r.range.from} to ${r.range.to}`)}
          {dateRange}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Invoiced</div>
              <div className="text-xl font-bold">{money(r.invoiced.total)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">what the lab earned</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Collected</div>
              <div className="text-xl font-bold text-green-700">{money(r.collected.total)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">money received</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Outstanding</div>
              <div className="text-xl font-bold text-orange-700">{money(r.outstanding.total)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{r.outstanding.count} invoice(s)</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Net of refunds</div>
              <div className="text-xl font-bold">{money(r.collected.total - r.refunds.total)}</div>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> By payment method</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              {r.collected.byMethod.length === 0 ? <p className="text-sm text-muted-foreground">Nothing collected yet.</p>
                : r.collected.byMethod.map((m) => (
                  <div key={m.method} className="flex justify-between py-1 text-sm border-b last:border-0">
                    <span>{m.method} <span className="text-muted-foreground">({m.count})</span></span>
                    <span className="font-medium">{money(m.amount)} IQD</span>
                  </div>))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
