"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { patients, visits, type TriageLevel } from "@/lib/care/mock-data";
import { AlertTriangle } from "lucide-react";
import { CareHeader } from "@/components/care/care-header";

interface Observation {
  id: string;
  patientId: string;
  type: string;
  dueInMinutes: number;
  status: "due" | "overdue" | "scheduled";
  priority: TriageLevel;
}

export default function ObservationsPage() {
  const [obs, setObs] = useState<Observation[]>([
    { id: "o1", patientId: "p1", type: "Vitals", dueInMinutes: 2, status: "due", priority: "red" },
    { id: "o2", patientId: "p3", type: "Neuro Check", dueInMinutes: 12, status: "scheduled", priority: "yellow" },
    { id: "o3", patientId: "p2", type: "Glucose", dueInMinutes: -1, status: "overdue", priority: "yellow" },
    { id: "o4", patientId: "p4", type: "Vitals", dueInMinutes: 45, status: "scheduled", priority: "green" },
  ]);

  function markDone(id: string) {
    setObs((prev) => prev.filter((o) => o.id !== id));
  }

  const sorted = [...obs].sort((a, b) => {
    const score = { overdue: 0, due: 1, scheduled: 2 };
    return score[a.status] - score[b.status] || a.dueInMinutes - b.dueInMinutes;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CareHeader
        title="Observation Schedule"
        description="Due, overdue, and upcoming monitoring"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Due Now</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-orange-600">
            {obs.filter((o) => o.status === "due").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">
            {obs.filter((o) => o.status === "overdue").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {obs.filter((o) => o.status === "scheduled").length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.map((o) => {
            const patient = patients.find((p) => p.id === o.patientId);
            const visit = visits.find((v) => v.patientId === o.patientId);
            return (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold w-16 text-center">
                    {o.status === "overdue" ? (
                      <span className="text-red-600">{Math.abs(o.dueInMinutes)}</span>
                    ) : (
                      <span className={o.status === "due" ? "text-orange-600" : "text-foreground"}>
                        {o.dueInMinutes}
                      </span>
                    )}
                    <div className="text-xs font-normal text-muted-foreground">min</div>
                  </div>
                  <div>
                    <div className="font-medium">
                      {patient?.name} — {o.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {patient?.bed} • {visit?.doctor || "Unassigned"}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={o.status === "overdue" ? "destructive" : "secondary"} className="gap-1">
                        {o.status === "overdue" && <AlertTriangle className="size-3" />}
                        {o.status === "overdue" ? "Overdue" : o.status === "due" ? "Due now" : "Scheduled"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={() => markDone(o.id)}>
                  Done
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
