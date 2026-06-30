"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { patients } from "@/lib/care/mock-data";
import { CareHeader } from "@/components/care/care-header";
import { Frown, Smile } from "lucide-react";

export default function PainPage() {
  const [patientId, setPatientId] = useState("p1");
  const [score, setScore] = useState(3);
  const [history, setHistory] = useState([
    { id: "1", patientId: "p1", score: 8, time: "08:00" },
    { id: "2", patientId: "p1", score: 5, time: "10:00" },
    { id: "3", patientId: "p1", score: 3, time: "12:00" },
  ]);

  const patient = patients.find((p) => p.id === patientId);
  const patientHistory = history.filter((h) => h.patientId === patientId);

  function save() {
    setHistory((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        patientId,
        score,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  function painLabel(score: number) {
    if (score === 0) return "No Pain";
    if (score <= 3) return "Mild";
    if (score <= 6) return "Moderate";
    if (score <= 9) return "Severe";
    return "Worst Pain";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CareHeader
        title="Pain Assessment"
        description={patient ? `Quick pain scale and history for ${patient.name}` : "Quick pain scale and history"}
      />

      <Card>
        <CardHeader>
          <CardTitle>New Assessment</CardTitle>
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#22c55e]">
                <Smile className="size-6" /> 0
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">{score}</div>
                <div className="text-sm text-muted-foreground">{painLabel(score)}</div>
              </div>
              <div className="flex items-center gap-2 text-[#e54b4f]">
                10 <Frown className="size-6" />
              </div>
            </div>
            <Slider
              value={[score]}
              onValueChange={(v) => setScore(v[0])}
              min={0}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
              <span>9</span>
              <span>10</span>
            </div>
          </div>

          <Button onClick={save}>Save Pain Score</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History for {patient?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patientHistory.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.time}</TableCell>
                  <TableCell className="font-bold">{h.score}</TableCell>
                  <TableCell>{painLabel(h.score)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
