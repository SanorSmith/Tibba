"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { medications, patients, visits, type MedicationOrder } from "@/lib/care/mock-data";

function statusBadge(status: MedicationOrder["status"]) {
  switch (status) {
    case "due":
      return <Badge variant="destructive">Due</Badge>;
    case "given":
      return <Badge variant="default">Given</Badge>;
    case "refused":
      return <Badge variant="outline">Refused</Badge>;
    case "delayed":
      return <Badge variant="secondary">Delayed</Badge>;
    case "held":
      return <Badge variant="secondary">Held</Badge>;
  }
}

export default function MarPage() {
  const [items, setItems] = useState<MedicationOrder[]>(medications);

  function updateStatus(id: string, status: MedicationOrder["status"]) {
    setItems((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status, givenTime: status === "given" ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : m.givenTime }
          : m
      )
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Medication Administration</h1>
        <p className="text-muted-foreground">MAR - record time, route, dose, site, comments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((med) => {
          const visit = visits.find((v) => v.id === med.visitId);
          const patient = visit ? patients.find((p) => p.id === visit.patientId) : null;
          return (
            <Card key={med.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{med.name}</CardTitle>
                  {statusBadge(med.status)}
                </div>
                <p className="text-xs text-muted-foreground">{patient?.name} • {med.dose} • {med.route}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Scheduled:</span>{" "}
                  <span className="font-medium">{med.scheduledTime}</span>
                  {med.givenTime && (
                    <span className="ml-3 text-muted-foreground">
                      Given: <span className="font-medium">{med.givenTime}</span>
                    </span>
                  )}
                </div>

                <RadioGroup
                  value={med.status}
                  onValueChange={(v) => updateStatus(med.id, v as MedicationOrder["status"])}
                  className="flex flex-wrap gap-3"
                >
                  {["given", "refused", "delayed", "held"].map((s) => (
                    <div key={s} className="flex items-center gap-1">
                      <RadioGroupItem value={s} id={`${med.id}-${s}`} />
                      <Label htmlFor={`${med.id}-${s}`} className="capitalize text-sm cursor-pointer">
                        {s}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="space-y-2">
                  <Label className="text-xs">Site</Label>
                  <Input placeholder="e.g. Right arm" className="h-8" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Comment</Label>
                  <Textarea placeholder="Note" className="min-h-[60px]" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
