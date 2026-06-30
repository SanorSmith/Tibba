"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { patients } from "@/lib/care/mock-data";
import { CareHeader } from "@/components/care/care-header";

interface Wound {
  id: string;
  patientId: string;
  location: string;
  stage: string;
  dressing: string;
  drainage: string;
  note: string;
  date: string;
}

export default function WoundPage() {
  const [wounds, setWounds] = useState<Wound[]>([
    {
      id: "1",
      patientId: "p1",
      location: "Sacrum",
      stage: "Stage 1",
      dressing: "Hydrocolloid",
      drainage: "None",
      note: "Erythema intact skin",
      date: "2026-06-25",
    },
  ]);

  const [patientId, setPatientId] = useState("p1");
  const [location, setLocation] = useState("");
  const [stage, setStage] = useState("Stage 1");
  const [dressing, setDressing] = useState("Hydrocolloid");
  const [drainage, setDrainage] = useState("None");
  const [note, setNote] = useState("");

  const patient = patients.find((p) => p.id === patientId);
  const filtered = wounds.filter((w) => w.patientId === patientId);

  function add() {
    if (!location.trim()) return;
    setWounds((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        patientId,
        location,
        stage,
        dressing,
        drainage,
        note,
        date: new Date().toISOString().split("T")[0],
      },
    ]);
    setLocation("");
    setNote("");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CareHeader
        title="Wound Care"
        description={patient ? `${patient.name} — location, stage, dressing, drainage, progress` : "Location, stage, dressing, drainage, progress"}
      />

      <Card>
        <CardHeader>
          <CardTitle>New Wound Entry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Sacrum" />
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Stage 1">Stage 1</SelectItem>
                <SelectItem value="Stage 2">Stage 2</SelectItem>
                <SelectItem value="Stage 3">Stage 3</SelectItem>
                <SelectItem value="Stage 4">Stage 4</SelectItem>
                <SelectItem value="Unstageable">Unstageable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dressing</Label>
            <Select value={dressing} onValueChange={setDressing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hydrocolloid">Hydrocolloid</SelectItem>
                <SelectItem value="Foam">Foam</SelectItem>
                <SelectItem value="Alginate">Alginate</SelectItem>
                <SelectItem value="Transparent">Transparent</SelectItem>
                <SelectItem value="Gauze">Gauze</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Drainage</Label>
            <Select value={drainage} onValueChange={setDrainage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Serous">Serous</SelectItem>
                <SelectItem value="Sanguineous">Sanguineous</SelectItem>
                <SelectItem value="Purulent">Purulent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Healing progress..." />
          </div>
          <div className="md:col-span-2">
            <Button onClick={add}>Add Wound Entry</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wound Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Dressing</TableHead>
                <TableHead>Drainage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.date}</TableCell>
                  <TableCell>{w.location}</TableCell>
                  <TableCell><Badge variant="outline">{w.stage}</Badge></TableCell>
                  <TableCell>{w.dressing}</TableCell>
                  <TableCell>{w.drainage}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
