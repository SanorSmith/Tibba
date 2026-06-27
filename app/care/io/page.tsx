"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { patients } from "@/lib/care/mock-data";
import { ArrowDown, ArrowUp } from "lucide-react";

type IOType = "input" | "output";
interface IOEntry {
  id: string;
  patientId: string;
  type: IOType;
  category: string;
  amount: number;
  time: string;
}

const categories = {
  input: ["IV fluids", "Oral fluids", "Blood products"],
  output: ["Urine", "Stool", "Vomit", "Drainage"],
};

export default function IntakeOutputPage() {
  const [entries, setEntries] = useState<IOEntry[]>([
    { id: "1", patientId: "p1", type: "input", category: "IV fluids", amount: 1000, time: "08:00" },
    { id: "2", patientId: "p1", type: "input", category: "Oral fluids", amount: 400, time: "10:00" },
    { id: "3", patientId: "p1", type: "output", category: "Urine", amount: 700, time: "09:30" },
    { id: "4", patientId: "p1", type: "output", category: "Drainage", amount: 100, time: "11:00" },
  ]);

  const [patientId, setPatientId] = useState("p1");
  const [type, setType] = useState<IOType>("input");
  const [category, setCategory] = useState(categories.input[0]);
  const [amount, setAmount] = useState("");
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  const filtered = entries.filter((e) => e.patientId === patientId);
  const totalInput = filtered.filter((e) => e.type === "input").reduce((s, e) => s + e.amount, 0);
  const totalOutput = filtered.filter((e) => e.type === "output").reduce((s, e) => s + e.amount, 0);
  const balance = totalInput - totalOutput;

  function add() {
    if (!amount || isNaN(Number(amount))) return;
    setEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        patientId,
        type,
        category,
        amount: Number(amount),
        time,
      },
    ]);
    setAmount("");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intake & Output</h1>
        <p className="text-muted-foreground">Fluid balance and drainage tracking</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDown className="size-4 text-blue-500" /> Input
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-blue-600">{totalInput} ml</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUp className="size-4 text-amber-500" /> Output
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-600">{totalOutput} ml</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Balance</CardTitle>
          </CardHeader>
          <CardContent className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {balance >= 0 ? "+" : ""}{balance} ml
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount (ml)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.time}</TableCell>
                    <TableCell>
                      <Badge variant={e.type === "input" ? "default" : "secondary"}>{e.type}</Badge>
                    </TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell className="text-right">{e.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => {
                setType(v as IOType);
                setCategory(categories[v as IOType][0]);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">Input</SelectItem>
                  <SelectItem value="output">Output</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories[type].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (ml)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <Button className="w-full" onClick={add}>
              Add Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
