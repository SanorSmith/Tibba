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
import { AlertTriangle, Search, Thermometer, Heart, Activity, Wind, Droplets } from "lucide-react";

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
  const [temperature, setTemperature] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [spO2, setSpO2] = useState("");
  const [complaint, setComplaint] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [painkiller, setPainkiller] = useState("");
  const [medsGiven, setMedsGiven] = useState<string[]>([]);
  const [procedure, setProcedure] = useState("");
  const [procedures, setProcedures] = useState<string[]>([]);
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

  const procedureOptions = [
    { value: "iv-access", label: "IV access" },
    { value: "oxygen", label: "Oxygen" },
    { value: "cannulation", label: "Cannulation" },
    { value: "splinting", label: "Splinting" },
    { value: "wound-dressing", label: "Wound dressing" },
    { value: "urinary-catheter", label: "Urinary catheter" },
    { value: "ryles-tube", label: "Ryles tube" },
    { value: "ecg", label: "ECG" },
    { value: "nebulization", label: "Nebulization" },
    { value: "blood-glucose", label: "Blood glucose check" },
    { value: "tetanus", label: "Tetanus toxoid" },
    { value: "suturing", label: "Suturing" },
    { value: "cpr", label: "CPR" },
    { value: "defibrillation", label: "Defibrillation" },
  ];

  const addProcedure = () => {
    if (!procedure) return;
    const label = procedureOptions.find((p) => p.value === procedure)?.label || procedure;
    setProcedures((prev) => [...prev, label]);
    setNotes((prev) => (prev ? prev + "\n" : "") + `Procedure done: ${label}`);
    setProcedure("");
  };

  const redFlags = [
    systolic && parseInt(systolic) < 90,
    diastolic && parseInt(diastolic) < 60,
    heartRate && parseInt(heartRate) > 120,
    respiratoryRate && parseInt(respiratoryRate) > 30,
    temperature && parseFloat(temperature) > 39,
    spO2 && parseInt(spO2) < 92,
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
            procedures: procedures.join(", "),
            vitals: {
              temperature,
              systolic,
              diastolic,
              heartRate,
              respiratoryRate,
              spO2,
            },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save initial patient assessment record");
      }
      router.push("/care");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save initial patient assessment record");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="col-span-full">
        <CareHeader
          title="Initial Patient Assessment"
          description="Record arrival and initial assessment"
          action={
            level === "red" ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" /> Critical
              </Badge>
            ) : undefined
          }
        />
      </div>

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
                <Button variant="outline" size="sm" className="border-[#4684c2] text-[#4684c2] hover:bg-[#4684c2]/10" onClick={() => setShowPatientModal(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-start gap-2 border-[#4684c2] text-[#4684c2] hover:bg-[#4684c2]/10" onClick={() => setShowPatientModal(true)}>
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
          <CardTitle>Chief Complaint & Assessment Level</CardTitle>
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
            <Label>Assessment Level</Label>
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
          <CardTitle>Initial Patient Assessment Notes</CardTitle>
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
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Thermometer className="size-4" /> Temperature (°C)
            </Label>
            <Input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="36.5"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Heart className="size-4" /> Systolic BP (mmHg)
            </Label>
            <Input
              type="number"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              placeholder="120"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Heart className="size-4" /> Diastolic BP (mmHg)
            </Label>
            <Input
              type="number"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              placeholder="80"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Activity className="size-4" /> Heart Rate (bpm)
            </Label>
            <Input
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              placeholder="72"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Wind className="size-4" /> Respiratory Rate (/min)
            </Label>
            <Input
              type="number"
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
              placeholder="16"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Droplets className="size-4" /> SpO2 (%)
            </Label>
            <Input
              type="number"
              step="0.1"
              value={spO2}
              onChange={(e) => setSpO2(e.target.value)}
              placeholder="98"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meds Given</CardTitle>
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
              <Button type="button" variant="secondary" className="bg-[#4684c2] hover:bg-[#3a6fa8] text-white" onClick={addPainkiller} disabled={!painkiller}>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Procedures Done</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Procedure</Label>
            <div className="flex gap-2">
              <Select value={procedure} onValueChange={setProcedure}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select procedure" />
                </SelectTrigger>
                <SelectContent>
                  {procedureOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" className="bg-[#4684c2] hover:bg-[#3a6fa8] text-white" onClick={addProcedure} disabled={!procedure}>
                Add to notes
              </Button>
            </div>
          </div>
          {procedures.length > 0 && (
            <div className="space-y-2">
              <Label>Procedures Done</Label>
              <div className="flex flex-wrap gap-2">
                {procedures.map((proc, i) => (
                  <Badge key={i} variant="secondary">
                    {proc}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="col-span-full flex justify-end gap-2">
        <Button variant="outline" className="border-[#4684c2] text-[#4684c2] hover:bg-[#4684c2]/10" onClick={() => router.push("/care")}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={submitting} className="bg-[#4684c2] hover:bg-[#3a6fa8] text-white">
          {submitting ? "Saving..." : "Save Initial Patient Assessment"}
        </Button>
      </div>
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
  </>);
}
