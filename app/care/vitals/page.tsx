"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { patients, visits, vitals, getVisitVitals } from "@/lib/care/mock-data";

export default function VitalsPage() {
  const params = useSearchParams();
  const visitId = params.get("visit") || visits[0].id;
  const visit = visits.find((v) => v.id === visitId);
  const patient = visit ? patients.find((p) => p.id === visit.patientId) : patients[0];

  const [bp, setBp] = useState("120/80");
  const [hr, setHr] = useState(84);
  const [rr, setRr] = useState(18);
  const [temp, setTemp] = useState(36.9);
  const [spo2, setSpo2] = useState(99);
  const [pain, setPain] = useState(0);
  const [rows, setRows] = useState(vitals);

  function save() {
    const newEntry = {
      id: `vt-${Date.now()}`,
      visitId,
      time: new Date().toISOString(),
      bp,
      hr,
      rr,
      temp,
      spo2,
      pain,
    };
    setRows((prev) => [newEntry, ...prev]);
  }

  const history = visit ? getVisitVitals(visit.id) : rows;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vital Signs</h1>
        <p className="text-muted-foreground">
          {patient?.name} • {patient?.bed} • {visit?.triageLevel.toUpperCase()}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Entry</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>BP</Label>
              <Input value={bp} onChange={(e) => setBp(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>HR</Label>
              <Input type="number" value={hr} onChange={(e) => setHr(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>RR</Label>
              <Input type="number" value={rr} onChange={(e) => setRr(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input type="number" step={0.1} value={temp} onChange={(e) => setTemp(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>SpO₂</Label>
              <Input type="number" value={spo2} onChange={(e) => setSpo2(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Pain</Label>
              <Input type="number" min={0} max={10} value={pain} onChange={(e) => setPain(Number(e.target.value))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Visit</Label>
              <Select defaultValue={visitId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visits.map((v) => {
                    const p = patients.find((x) => x.id === v.patientId);
                    return (
                      <SelectItem key={v.id} value={v.id}>
                        {p?.name} ({p?.bed})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Age</span><span className="font-medium">{patient?.age}</span></div>
              <div className="flex justify-between"><span>Gender</span><span className="font-medium">{patient?.gender}</span></div>
              <div className="flex justify-between"><span>Allergies</span><span className="font-medium">{patient?.allergies.join(", ") || "None"}</span></div>
            </div>
            <Button className="w-full" onClick={save}>Save Vitals</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>BP</TableHead>
                <TableHead>HR</TableHead>
                <TableHead>RR</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>SpO₂</TableHead>
                <TableHead>Pain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{new Date(v.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>{v.bp}</TableCell>
                  <TableCell>{v.hr}</TableCell>
                  <TableCell>{v.rr}</TableCell>
                  <TableCell>{v.temp}</TableCell>
                  <TableCell>{v.spo2}</TableCell>
                  <TableCell>{v.pain}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
