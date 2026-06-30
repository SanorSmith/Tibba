"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { patients } from "@/lib/care/mock-data";
import { CareHeader } from "@/components/care/care-header";

const riskFactors = [
  "History of falls",
  "Impaired mobility",
  "Cognitive impairment",
  "High-risk medications",
  "Visual impairment",
  "Incontinence",
  "Age > 65",
];

const interventions = [
  "Bed rails",
  "Alarm",
  "Assisted walking",
  "Non-slip socks",
  "Call bell within reach",
  "Frequent checks",
];

export default function FallRiskPage() {
  const [patientId, setPatientId] = useState("p1");
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [level, setLevel] = useState("low");

  const patient = patients.find((p) => p.id === patientId);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CareHeader
        title="Fall Risk Assessment"
        description={patient ? `${patient.name} — risk level and interventions` : "Risk level and interventions"}
      />

      <Card>
        <CardHeader>
          <CardTitle>Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Patient</Label>
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
          </div>

          <div className="space-y-2">
            <Label>Risk Level</Label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as const).map((l) => (
                <Button
                  key={l}
                  variant="outline"
                  onClick={() => setLevel(l)}
                  className={
                    l === "high"
                      ? level === l
                        ? "bg-[#e54b4f] text-white border-[#e54b4f] hover:bg-[#e54b4f]"
                        : "border-[#e54b4f] text-[#e54b4f] hover:bg-[#e54b4f]/10"
                      : l === "medium"
                      ? level === l
                        ? "bg-[#ffae04] text-white border-[#ffae04] hover:bg-[#ffae04]"
                        : "border-[#ffae04] text-[#c78100] hover:bg-[#ffae04]/10"
                      : level === l
                      ? "bg-[#22c55e] text-white border-[#22c55e] hover:bg-[#22c55e]"
                      : "border-[#22c55e] text-[#15803d] hover:bg-[#22c55e]/10"
                  }
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Risk Factors</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {riskFactors.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Checkbox
                    id={f}
                    checked={selectedFactors.includes(f)}
                    onCheckedChange={() => toggle(selectedFactors, f, setSelectedFactors)}
                  />
                  <Label htmlFor={f} className="cursor-pointer text-sm font-normal">
                    {f}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interventions</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {interventions.map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox
                    id={i}
                    checked={selectedInterventions.includes(i)}
                    onCheckedChange={() => toggle(selectedInterventions, i, setSelectedInterventions)}
                  />
                  <Label htmlFor={i} className="cursor-pointer text-sm font-normal">
                    {i}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button>Save Assessment</Button>
        </CardContent>
      </Card>

      {patient && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="font-semibold">{patient.name}</span>
            <Badge variant={level === "high" ? "destructive" : level === "medium" ? "secondary" : "default"}>
              {level} risk
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
