"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

type TriageLevel = "red" | "yellow" | "green";

export default function TriagePage() {
  const router = useRouter();
  const [level, setLevel] = useState<TriageLevel>("green");
  const [pain, setPain] = useState(0);
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [rr, setRr] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [gcs, setGcs] = useState(15);
  const [complaint, setComplaint] = useState("");

  const redFlags = [
    bp && parseInt(bp.split("/")[0] || "0") < 90,
    bp && parseInt(bp.split("/")[1] || "0") < 60,
    hr && parseInt(hr) > 120,
    rr && parseInt(rr) > 30,
    temp && parseFloat(temp) > 39,
    spo2 && parseInt(spo2) < 92,
    gcs < 13,
    pain >= 8,
  ].filter(Boolean).length;

  function submit() {
    // TODO: connect to API
    alert("Triage recorded. (mock)");
    router.push("/care");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Triage</h1>
          <p className="text-muted-foreground">Record arrival and initial assessment</p>
        </div>
        {level === "red" && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" /> Critical
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient & Arrival</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Patient Name</Label>
            <Input placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>Age</Label>
            <Input type="number" placeholder="Years" />
          </div>
          <div className="space-y-2">
            <Label>MRN / ID</Label>
            <Input placeholder="Medical record number" />
          </div>
          <div className="space-y-2">
            <Label>Arrival Mode</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ambulance">Ambulance</SelectItem>
                <SelectItem value="walk-in">Walk-in</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chief Complaint & Triage Level</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Chief Complaint</Label>
            <Textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Chest pain, shortness of breath"
            />
          </div>
          <div className="space-y-2">
            <Label>Triage Level</Label>
            <div className="flex gap-2">
              {(["red", "yellow", "green"] as TriageLevel[]).map((l) => (
                <Button
                  key={l}
                  type="button"
                  variant={level === l ? "default" : "outline"}
                  className={
                    l === "red"
                      ? "border-red-500 text-red-700 hover:bg-red-50"
                      : l === "yellow"
                      ? "border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                      : "border-green-500 text-green-700 hover:bg-green-50"
                  }
                  onClick={() => setLevel(l)}
                >
                  {l === "red" ? "🔴" : l === "yellow" ? "🟡" : "🟢"} {l.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Pain Score (0-10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={pain}
                onChange={(e) => setPain(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>GCS</Label>
              <Input
                type="number"
                min={3}
                max={15}
                value={gcs}
                onChange={(e) => setGcs(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>ESI</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="ESI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Resuscitation</SelectItem>
                  <SelectItem value="2">2 - Emergent</SelectItem>
                  <SelectItem value="3">3 - Urgent</SelectItem>
                  <SelectItem value="4">4 - Less urgent</SelectItem>
                  <SelectItem value="5">5 - Non-urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {redFlags > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <AlertTriangle className="inline size-4 mr-1" />
              {redFlags} red flag(s) detected. Consider ESI 1/2 and immediate review.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vitals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>BP</Label>
            <Input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" />
          </div>
          <div className="space-y-2">
            <Label>HR</Label>
            <Input value={hr} onChange={(e) => setHr(e.target.value)} placeholder="bpm" />
          </div>
          <div className="space-y-2">
            <Label>RR</Label>
            <Input value={rr} onChange={(e) => setRr(e.target.value)} placeholder="/min" />
          </div>
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="°C" />
          </div>
          <div className="space-y-2">
            <Label>SpO₂</Label>
            <Input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="%" />
          </div>
          <div className="space-y-2">
            <Label>Weight</Label>
            <Input placeholder="kg" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/care")}>
          Cancel
        </Button>
        <Button onClick={submit}>Save Triage</Button>
      </div>
    </div>
  );
}
