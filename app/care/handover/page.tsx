"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { patients, visits } from "@/lib/care/mock-data";
import { CareHeader } from "@/components/care/care-header";

interface HandoverEntry {
  id: string;
  patientId: string;
  summary: string;
  actions: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export default function HandoverPage() {
  const [entries, setEntries] = useState<HandoverEntry[]>(
    patients.map((p) => {
      const v = visits.find((x) => x.patientId === p.id);
      return {
        id: `h-${p.id}`,
        patientId: p.id,
        summary: v?.chiefComplaint || "Stable",
        actions: "Continue monitoring.",
        acknowledged: false,
      };
    })
  );

  const [active, setActive] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [actions, setActions] = useState("");

  function saveEntry(id: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, summary, actions } : e))
    );
    setActive(null);
  }

  function acknowledge(id: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, acknowledged: true, acknowledgedBy: "Nurse B" } : e))
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CareHeader
        title="Shift Handover"
        description="Outgoing notes and incoming acknowledgments"
      />

      <div className="grid gap-4">
        {entries.map((entry) => {
          const patient = patients.find((p) => p.id === entry.patientId)!;
          const visit = visits.find((v) => v.patientId === patient.id);
          return (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {patient.bed} — {patient.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {patient.age} yrs • {visit?.triageLevel.toUpperCase()} • {visit?.doctor || "Unassigned"}
                    </p>
                  </div>
                  <Badge variant={entry.acknowledged ? "default" : "secondary"}>
                    {entry.acknowledged ? "Acknowledged" : "Pending"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {active === entry.id ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Handover Summary</Label>
                      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pending Actions</Label>
                      <Textarea value={actions} onChange={(e) => setActions(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveEntry(entry.id)}>Save</Button>
                      <Button variant="outline" onClick={() => setActive(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xs text-muted-foreground">Summary</div>
                      <div className="text-sm">{entry.summary}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xs text-muted-foreground">Pending Actions</div>
                      <div className="text-sm">{entry.actions}</div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActive(entry.id);
                          setSummary(entry.summary);
                          setActions(entry.actions);
                        }}
                      >
                        Edit
                      </Button>
                      {!entry.acknowledged && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`ack-${entry.id}`}
                            checked={entry.acknowledged}
                            onCheckedChange={() => acknowledge(entry.id)}
                          />
                          <Label htmlFor={`ack-${entry.id}`} className="text-sm cursor-pointer">
                            Acknowledge
                          </Label>
                        </div>
                      )}
                      {entry.acknowledged && (
                        <div className="text-xs text-muted-foreground">Acknowledged by {entry.acknowledgedBy}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
