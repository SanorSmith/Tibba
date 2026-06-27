"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { patients } from "@/lib/care/mock-data";
import { Bath, Utensils, Pill, ShieldCheck, GraduationCap, Home, Stethoscope } from "lucide-react";

const checklistItems = [
  { id: "bathing", label: "Bathing / hygiene", icon: Bath },
  { id: "feeding", label: "Feeding / nutrition", icon: Utensils },
  { id: "medication", label: "Medication administration", icon: Pill },
  { id: "pressure", label: "Pressure area care", icon: ShieldCheck },
  { id: "catheter", label: "Catheter / stoma care", icon: Stethoscope },
  { id: "education", label: "Family education", icon: GraduationCap },
  { id: "visit", label: "Visit notes", icon: Home },
];

export default function HomeCarePage() {
  const [patientId, setPatientId] = useState("p1");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");

  const completed = Object.values(done).filter(Boolean).length;

  function toggle(id: string) {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Home Care / Bedridden Checklist</h1>
        <p className="text-muted-foreground">Daily care for home and bedridden patients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Care Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklistItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${done[item.id] ? "bg-muted" : ""}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="size-5 text-muted-foreground" />
                <Label htmlFor={item.id} className="cursor-pointer font-medium">
                  {item.label}
                </Label>
              </div>
              <Checkbox id={item.id} checked={!!done[item.id]} onCheckedChange={() => toggle(item.id)} />
            </div>
          ))}
          <div className="pt-2 text-sm text-muted-foreground">
            Completed {completed} of {checklistItems.length}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visit Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Home environment assessment, patient/family concerns..." />
          <Button>Save Visit Note</Button>
        </CardContent>
      </Card>
    </div>
  );
}
