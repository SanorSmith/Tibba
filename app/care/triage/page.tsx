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
import { CareHeader } from "@/components/care/care-header";
import { useCareWorkspace } from "@/components/care/care-workspace-context";
import PatientSearchModal from "@/app/components/PatientSearchModal";
import { AlertTriangle, Search } from "lucide-react";

type TriageLevel = "red" | "yellow" | "green";

interface Patient {
  patientid: string;
  patient_number?: string;
  firstname: string;
  middlename?: string;
  lastname: string;
  dateofbirth?: string;
  gender?: string;
  phone?: string;
  nationalid?: string;
}

export default function TriagePage() {
  const router = useRouter();
  const { workspaceId } = useCareWorkspace();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [level, setLevel] = useState<TriageLevel>("green");
  const [esi, setEsi] = useState("");
  const [pain, setPain] = useState(0);
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [rr, setRr] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
  const [complaint, setComplaint] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [painkiller, setPainkiller] = useState("");
  const [medsGiven, setMedsGiven] = useState<string[]>([]);
  const [procedures, setProcedures] = useState("");
  const [arrivalMode, setArrivalMode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const painkillers = [
    { value: "paracetamol", label: "Paracetamol (Acetaminophen)" },
    { value: "ibuprofen", label: "Ibuprofen" },
    { value: "aspirin", label: "Aspirin" },
    { value: "tramadol", label: "Tramadol" },
    { value: "morphine", label: "Morphine" },
    { value: "diclofenac", label: "Diclofenac" },
    { value: "ketorolac", label: "Ketorolac" },
  ];

  const addPainkiller = () => {
    if (!painkiller) return;
    const label = painkillers.find((p) => p.value === painkiller)?.label || painkiller;
    setMedsGiven((prev) => [...prev, label]);
    setNotes((prev) => (prev ? prev + "\n" : "") + `Painkiller given: ${label}`);
    setPainkiller("");
  };

  const redFlags = [
    bp && parseInt(bp.split("/")[0] || "0") < 90,
    bp && parseInt(bp.split("/")[1] || "0") < 60,
    hr && parseInt(hr) > 120,
    rr && parseInt(rr) > 30,
    temp && parseFloat(temp) > 39,
    spo2 && parseInt(spo2) < 92,
    pain >= 8,
  ].filter(Boolean).length;

  async function submit() {
    if (!patient || !workspaceId) {
      alert("Please select a patient first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/d/${workspaceId}/patients/${patient.patientid}/triage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triageLevel: level,
            esi,
            chiefComplaint: complaint,
            allergies,
            arrivalMode,
            notes,
            pain,
            medsGiven,
            procedures,
            vitals: { bp, hr, rr, temp, spo2, weight },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save triage record");
      }
      router.push("/care");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save triage record");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CareHeader
        title="Triage"
        description="Record arrival and initial assessment"
        action={
          level === "red" ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" /> Critical
            </Badge>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Patient & Arrival</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Patient</Label>
            {patient ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {patient.firstname} {patient.middlename} {patient.lastname}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    National ID: {patient.nationalid || patient.patient_number || patient.patientid}
                    {patient.gender && ` · ${patient.gender}`}
                    {patient.dateofbirth && ` · DOB: ${new Date(patient.dateofbirth).toLocaleDateString()}`}
                    {patient.phone && ` · ${patient.phone}`}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPatientModal(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowPatientModal(true)}>
                <Search className="size-4" />
                Search or register patient
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label>Arrival Mode</Label>
            <Select value={arrivalMode} onValueChange={setArrivalMode}>
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
          <div className="space-y-2">
            <Label>Allergies</Label>
            <Select value={allergies} onValueChange={setAllergies}>
              <SelectTrigger>
                <SelectValue placeholder="Select allergy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="penicillin">Penicillin</SelectItem>
                <SelectItem value="sulfa-drugs">Sulfa Drugs</SelectItem>
                <SelectItem value="nsaids">NSAIDs (Ibuprofen, Diclofenac, Aspirin)</SelectItem>
                <SelectItem value="latex">Latex</SelectItem>
                <SelectItem value="contrast-dye">Contrast Dye</SelectItem>
                <SelectItem value="peanuts">Peanuts</SelectItem>
                <SelectItem value="tree-nuts">Tree Nuts</SelectItem>
                <SelectItem value="sesame">Sesame</SelectItem>
                <SelectItem value="eggs">Eggs</SelectItem>
                <SelectItem value="milk">Milk</SelectItem>
                <SelectItem value="seafood">Seafood</SelectItem>
                <SelectItem value="fish">Fish</SelectItem>
                <SelectItem value="wheat-gluten">Wheat/Gluten</SelectItem>
                <SelectItem value="dust-mites">Dust Mites</SelectItem>
                <SelectItem value="pollen">Pollen</SelectItem>
                <SelectItem value="mold">Mold</SelectItem>
                <SelectItem value="cat-dog-dander">Cat/Dog Dander</SelectItem>
                <SelectItem value="bee-wasp-sting">Bee/Wasp Sting</SelectItem>
                <SelectItem value="nickel">Nickel</SelectItem>
                <SelectItem value="adhesive-tape">Adhesive Tape</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
                  variant="outline"
                  className={
                    l === "red"
                      ? level === l
                        ? "bg-[#e54b4f]/25 text-[#e54b4f] border-[#e54b4f]/40 hover:bg-[#e54b4f]/30"
                        : "border-[#e54b4f]/50 text-[#e54b4f] hover:bg-[#e54b4f]/15"
                      : l === "yellow"
                      ? level === l
                        ? "bg-[#ffae04]/25 text-[#c78100] border-[#ffae04]/40 hover:bg-[#ffae04]/30"
                        : "border-[#ffae04]/50 text-[#c78100] hover:bg-[#ffae04]/15"
                      : level === l
                      ? "bg-[#22c55e]/25 text-[#15803d] border-[#22c55e]/40 hover:bg-[#22c55e]/30"
                      : "border-[#22c55e]/50 text-[#15803d] hover:bg-[#22c55e]/15"
                  }
                  onClick={() => setLevel(l)}
                >
                  {l === "red" ? "🔴" : l === "yellow" ? "🟡" : "🟢"} {l.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pain Score (0-10)</Label>
                <span className="text-sm font-medium">{pain}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={pain}
                onChange={(e) => setPain(Number(e.target.value))}
                className="w-full accent-[#618FF5]"
              />
            </div>
            <div className="space-y-2">
              <Label>ESI</Label>
              <Select value={esi} onValueChange={setEsi}>
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
            <div className="rounded-lg bg-[#e54b4f]/10 border border-[#e54b4f]/20 p-3 text-sm text-[#e54b4f]">
              <AlertTriangle className="inline size-4 mr-1" />
              {redFlags} red flag(s) detected. Consider ESI 1/2 and immediate review.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Triage Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Nurse Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, precautions, handover notes..."
              rows={4}
            />
          </div>
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
            <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meds Given & Procedures</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Painkiller</Label>
            <div className="flex gap-2">
              <Select value={painkiller} onValueChange={setPainkiller}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select painkiller" />
                </SelectTrigger>
                <SelectContent>
                  {painkillers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" onClick={addPainkiller} disabled={!painkiller}>
                Add to notes
              </Button>
            </div>
          </div>
          {medsGiven.length > 0 && (
            <div className="space-y-2">
              <Label>Meds Given</Label>
              <div className="flex flex-wrap gap-2">
                {medsGiven.map((med, i) => (
                  <Badge key={i} variant="secondary">
                    {med}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Procedures Done</Label>
            <Textarea
              value={procedures}
              onChange={(e) => setProcedures(e.target.value)}
              placeholder="e.g. IV access, oxygen, splinting"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/care")}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Saving..." : "Save Triage"}
        </Button>
      </div>

      <PatientSearchModal
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        onPatientSelect={(selected) => {
          setPatient(selected);
          setShowPatientModal(false);
        }}
        workspaceId={workspaceId}
      />
    </div>
  );
}
