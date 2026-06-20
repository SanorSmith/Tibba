"use client";
import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Scissors, Calendar, FileText, Pill,
  ClipboardList, Camera, StickyNote, Activity, Plus,
  Clock, User, ChevronRight, AlertCircle, Stethoscope,
} from "lucide-react";

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  dateofbirth?: string | null;
  gender?: string | null;
  nationalid?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencycontact?: string | null;
  bloodgroup?: string | null;
  height?: number | null;
  weight?: number | null;
};

type Operation = {
  operationid: string;
  patientid: string;
  surgeonid: string;
  operationname: string;
  operationtype: string;
  scheduleddate: string;
  duration: string;
  theater: string;
  anesthesiatype?: string | null;
  operationdiagnosis?: string | null;
  preoperativeassessment?: string | null;
  operationdetails?: string | null;
  status: string;
  createdat: string;
};

type Appointment = {
  appointmentid: string;
  patientid: string;
  starttime: string;
  endtime: string;
  status: string;
  location?: string | null;
  notes?: { patientname?: string; comments?: { timestamp: string; text: string }[] } | null;
};

type Note = {
  noteid?: string;
  timestamp: string;
  text: string;
  author?: string;
};

const TAB_STYLE =
  "rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold text-xs";

const statusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "scheduled": return "bg-blue-100 text-blue-700 border-blue-200";
    case "in_progress": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "completed": return "bg-green-100 text-green-700 border-green-200";
    case "cancelled": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function PlasticSurgeryPatientDashboard({
  workspaceid,
  patient,
  surgeonid,
}: {
  workspaceid: string;
  patient: Patient;
  surgeonid: string;
}) {
  const queryClient = useQueryClient();
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["overview"]));
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showOpForm, setShowOpForm] = useState(false);
  const [opForm, setOpForm] = useState({
    operationname: "",
    operationtype: "",
    scheduleddate: "",
    duration: "60",
    theater: "",
    anesthesiatype: "",
    operationdiagnosis: "",
    preoperativeassessment: "",
  });

  const fullName = `${patient.firstname}${patient.middlename ? " " + patient.middlename : ""} ${patient.lastname}`;
  const age = patient.dateofbirth
    ? Math.floor((Date.now() - new Date(patient.dateofbirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const { data: operations = [], isLoading: loadingOps } = useQuery({
    queryKey: ["ps-patient-ops", workspaceid, patient.patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/operations?patientid=${patient.patientid}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.operations as Operation[]) || [];
    },
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["ps-patient-appts", workspaceid, patient.patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/appointments?patientid=${patient.patientid}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.appointments as Appointment[]) || [];
    },
  });

  const { data: prescriptions = [], isLoading: loadingMeds } = useQuery({
    queryKey: ["ps-patient-meds", workspaceid, patient.patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patient.patientid}/prescriptions`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.prescriptions || [];
    },
    enabled: loadedTabs.has("medications"),
  });

  const { data: diagnoses = [], isLoading: loadingDx } = useQuery({
    queryKey: ["ps-patient-dx", workspaceid, patient.patientid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients/${patient.patientid}/diagnoses`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.diagnoses || [];
    },
    enabled: loadedTabs.has("consultations"),
  });

  const createOperation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch(`/api/d/${workspaceid}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, patientid: patient.patientid, surgeonid }),
      });
      if (!res.ok) throw new Error("Failed to create operation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ps-patient-ops", workspaceid, patient.patientid] });
      setShowOpForm(false);
      setOpForm({ operationname: "", operationtype: "", scheduleddate: "", duration: "60", theater: "", anesthesiatype: "", operationdiagnosis: "", preoperativeassessment: "" });
    },
  });

  const handleTabChange = (tab: string) => {
    setLoadedTabs((prev) => new Set(prev).add(tab));
  };

  const scheduledOps = operations.filter((o) => o.status === "scheduled");
  const completedOps = operations.filter((o) => o.status === "completed");
  const lastOp = completedOps.sort((a, b) => new Date(b.scheduleddate).getTime() - new Date(a.scheduleddate).getTime())[0];
  const upcomingAppt = appointments.filter((a) => new Date(a.starttime) > new Date() && a.status !== "cancelled")
    .sort((a, b) => new Date(a.starttime).getTime() - new Date(b.starttime).getTime())[0];

  return (
    <div className="space-y-2 pt-0 h-[calc(100dvh-80px)] overflow-hidden flex flex-col">
      {/* Patient Header */}
      <div className="flex items-center gap-4 py-1">
        <Link
          href={`/d/${workspaceid}/plastic-surgery`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex-1 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
              {patient.firstname[0]}{patient.lastname[0]}
            </div>
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-semibold cursor-pointer">{fullName}</p>
                </TooltipTrigger>
                <TooltipContent>
                  {patient.nationalid && <div>ID: {patient.nationalid}</div>}
                  {patient.phone && <div>Phone: {patient.phone}</div>}
                  {patient.email && <div>Email: {patient.email}</div>}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Age: <span className="font-medium text-foreground">{age ?? "N/A"}</span></span>
            <span>|</span>
            <span>Gender: <span className="font-medium text-foreground capitalize">{patient.gender || "N/A"}</span></span>
            <span>|</span>
            <span>Blood: <span className="font-medium text-foreground">{patient.bloodgroup || "N/A"}</span></span>
            {patient.height && <><span>|</span><span>H: <span className="font-medium text-foreground">{patient.height} cm</span></span></>}
            {patient.weight && <><span>|</span><span>W: <span className="font-medium text-foreground">{patient.weight} kg</span></span></>}
          </div>
        </div>

        <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white h-8" onClick={() => setShowOpForm(true)}>
          <Scissors className="h-3.5 w-3.5 mr-1" />
          Schedule Operation
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col" onValueChange={handleTabChange}>
        <TabsList className="flex w-full overflow-x-auto space-x-1 shrink-0">
          {[
            { value: "overview", label: "Overview" },
            { value: "consultations", label: "Consultations" },
            { value: "preop", label: "Pre-op" },
            { value: "operations", label: "Operations" },
            { value: "postop", label: "Post-op" },
            { value: "photos", label: "Before/After" },
            { value: "medications", label: "Medications" },
            { value: "notes", label: "Notes" },
            { value: "appointments", label: "Appointments" },
          ].map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className={TAB_STYLE}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto pt-3 pb-4">
          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Summary cards */}
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-rose-500" />
                    Surgery Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Operations</span>
                    <span className="font-semibold">{loadingOps ? "—" : operations.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-semibold text-green-600">{loadingOps ? "—" : completedOps.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Scheduled</span>
                    <span className="font-semibold text-blue-600">{loadingOps ? "—" : scheduledOps.length}</span>
                  </div>
                  {lastOp && (
                    <div className="pt-1 border-t">
                      <p className="text-xs text-muted-foreground">Last Procedure</p>
                      <p className="text-xs font-medium">{lastOp.operationname}</p>
                      <p className="text-xs text-muted-foreground">{new Date(lastOp.scheduleddate).toLocaleDateString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Next Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {loadingAppts ? (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  ) : upcomingAppt ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {new Date(upcomingAppt.starttime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(upcomingAppt.starttime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(upcomingAppt.endtime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {upcomingAppt.location && <p className="text-xs text-muted-foreground">{upcomingAppt.location}</p>}
                      <Badge className={`text-[10px] border ${statusColor(upcomingAppt.status)}`}>{upcomingAppt.status}</Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No upcoming appointments.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-violet-500" />
                    Patient Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5 text-xs">
                  {[
                    ["National ID", patient.nationalid],
                    ["Phone", patient.phone],
                    ["Email", patient.email],
                    ["Address", patient.address],
                    ["Emergency", patient.emergencycontact],
                  ].map(([label, value]) =>
                    value ? (
                      <div key={label} className="flex gap-2">
                        <span className="text-muted-foreground w-20 shrink-0">{label}</span>
                        <span className="font-medium break-all">{value}</span>
                      </div>
                    ) : null
                  )}
                </CardContent>
              </Card>

              {/* Recent Ops */}
              {operations.length > 0 && (
                <div className="md:col-span-3">
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-rose-500" />
                        Recent Procedures
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-2">
                        {operations.slice(0, 4).map((op) => (
                          <div key={op.operationid} className="flex items-center justify-between border rounded-md px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{op.operationname}</p>
                              <p className="text-xs text-muted-foreground">
                                {op.operationtype} · {op.theater} · {new Date(op.scheduleddate).toLocaleDateString()}
                                {op.anesthesiatype ? ` · ${op.anesthesiatype}` : ""}
                              </p>
                            </div>
                            <Badge className={`text-[10px] border ${statusColor(op.status)}`}>{op.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* CONSULTATIONS TAB */}
          <TabsContent value="consultations" className="mt-0">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Consultation Notes & Diagnoses
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingDx ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : diagnoses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No consultation records found.</p>
                ) : (
                  <div className="space-y-3">
                    {diagnoses.map((dx: Record<string, unknown>, i: number) => (
                      <div key={i} className="border rounded-md p-3 space-y-1">
                        <p className="text-sm font-medium">{String(dx.diagnosis_name ?? dx.problem_diagnosis ?? "Diagnosis")}</p>
                        {dx.clinical_description != null && <p className="text-xs text-muted-foreground">{String(dx.clinical_description)}</p>}
                        {dx.recorded_time != null && <p className="text-xs text-muted-foreground">{new Date(String(dx.recorded_time)).toLocaleDateString()}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PRE-OP TAB */}
          <TabsContent value="preop" className="mt-0">
            <div className="space-y-4">
              {operations.filter((o) => o.preoperativeassessment || o.operationdiagnosis).length === 0 ? (
                <Card>
                  <CardContent className="px-4 py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No pre-operative assessments found.</p>
                    <p className="text-xs text-muted-foreground mt-1">Add a pre-op assessment when scheduling an operation.</p>
                  </CardContent>
                </Card>
              ) : (
                operations
                  .filter((o) => o.preoperativeassessment || o.operationdiagnosis)
                  .map((op) => (
                    <Card key={op.operationid}>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{op.operationname}</CardTitle>
                          <Badge className={`text-[10px] border ${statusColor(op.status)}`}>{op.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(op.scheduleddate).toLocaleDateString()} · {op.theater}</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        {op.operationdiagnosis && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diagnosis</p>
                            <p className="text-sm mt-1">{op.operationdiagnosis}</p>
                          </div>
                        )}
                        {op.preoperativeassessment && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pre-operative Assessment</p>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{op.preoperativeassessment}</p>
                          </div>
                        )}
                        {op.anesthesiatype && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Anesthesia</p>
                            <p className="text-sm mt-1">{op.anesthesiatype}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>

          {/* OPERATIONS TAB */}
          <TabsContent value="operations" className="mt-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">All Operations</h3>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white h-7 text-xs" onClick={() => setShowOpForm(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Operation
              </Button>
            </div>
            {loadingOps ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : operations.length === 0 ? (
              <Card>
                <CardContent className="px-4 py-8 text-center">
                  <Scissors className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No operations recorded yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {operations
                  .sort((a, b) => new Date(b.scheduleddate).getTime() - new Date(a.scheduleddate).getTime())
                  .map((op) => (
                    <Card key={op.operationid}>
                      <CardContent className="px-4 py-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{op.operationname}</p>
                              <Badge className={`text-[10px] border ${statusColor(op.status)}`}>{op.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Type: {op.operationtype} · Theater: {op.theater} · Duration: {op.duration} min
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(op.scheduleddate).toLocaleString()}
                            </p>
                            {op.anesthesiatype && (
                              <p className="text-xs text-muted-foreground">Anesthesia: {op.anesthesiatype}</p>
                            )}
                            {op.operationdiagnosis && (
                              <p className="text-xs text-muted-foreground">Diagnosis: {op.operationdiagnosis}</p>
                            )}
                            {op.operationdetails && (
                              <p className="text-xs mt-1 whitespace-pre-wrap border-t pt-1">{op.operationdetails}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* POST-OP TAB */}
          <TabsContent value="postop" className="mt-0">
            <div className="space-y-4">
              {operations.filter((o) => o.status === "completed" && o.operationdetails).length === 0 ? (
                <Card>
                  <CardContent className="px-4 py-8 text-center">
                    <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No post-operative records found.</p>
                  </CardContent>
                </Card>
              ) : (
                operations
                  .filter((o) => o.status === "completed")
                  .sort((a, b) => new Date(b.scheduleddate).getTime() - new Date(a.scheduleddate).getTime())
                  .map((op) => (
                    <Card key={op.operationid}>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{op.operationname}</CardTitle>
                          <Badge className="text-[10px] border bg-green-100 text-green-700 border-green-200">Completed</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(op.scheduleddate).toLocaleDateString()} · {op.theater}</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {op.operationdetails ? (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operative Notes</p>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{op.operationdetails}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No operative notes recorded.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>

          {/* BEFORE/AFTER PHOTOS TAB */}
          <TabsContent value="photos" className="mt-0">
            <Card>
              <CardContent className="px-4 py-12 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Before/After Photo Gallery</p>
                <p className="text-xs text-muted-foreground mt-1">Photo documentation feature coming soon.</p>
                <Button variant="outline" size="sm" className="mt-4" disabled>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Upload Photos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MEDICATIONS TAB */}
          <TabsContent value="medications" className="mt-0">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pill className="h-4 w-4 text-orange-500" />
                  Medications & Prescriptions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingMeds ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : prescriptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No prescriptions found.</p>
                ) : (
                  <div className="space-y-2">
                    {prescriptions.map((rx: Record<string, unknown>, i: number) => (
                      <div key={i} className="border rounded-md px-3 py-2">
                        <p className="text-sm font-medium">{String(rx.drug_name ?? rx.medication ?? "Medication")}</p>
                        {rx.dosage != null && <p className="text-xs text-muted-foreground">Dose: {String(rx.dosage)}</p>}
                        {rx.frequency != null && <p className="text-xs text-muted-foreground">Frequency: {String(rx.frequency)}</p>}
                        {rx.recorded_time != null && <p className="text-xs text-muted-foreground">{new Date(String(rx.recorded_time)).toLocaleDateString()}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes" className="mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Clinical Notes</h3>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNoteForm(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Note
                </Button>
              </div>

              {showNoteForm && (
                <Card>
                  <CardContent className="px-4 py-3 space-y-2">
                    <Textarea
                      placeholder="Enter clinical note…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={4}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" disabled={!noteText.trim()}>Save Note</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowNoteForm(false); setNoteText(""); }}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {operations
                .filter((op) => op.preoperativeassessment || op.operationdetails)
                .map((op) => (
                  <Card key={op.operationid}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Scissors className="h-3.5 w-3.5 text-rose-500" />
                        <p className="text-xs font-semibold">{op.operationname} · {new Date(op.scheduleddate).toLocaleDateString()}</p>
                      </div>
                      {op.preoperativeassessment && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">Pre-op: {op.preoperativeassessment}</p>
                      )}
                      {op.operationdetails && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">Operative: {op.operationdetails}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}

              {operations.filter((o) => o.preoperativeassessment || o.operationdetails).length === 0 && !showNoteForm && (
                <Card>
                  <CardContent className="px-4 py-8 text-center">
                    <StickyNote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* APPOINTMENTS TAB */}
          <TabsContent value="appointments" className="mt-0">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Appointments
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingAppts ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : appointments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No appointments found.</p>
                ) : (
                  <div className="space-y-2">
                    {appointments
                      .sort((a, b) => new Date(b.starttime).getTime() - new Date(a.starttime).getTime())
                      .map((appt) => (
                        <div key={appt.appointmentid} className="flex items-center justify-between border rounded-md px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(appt.starttime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(appt.starttime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {" – "}
                              {new Date(appt.endtime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {appt.location ? ` · ${appt.location}` : ""}
                            </p>
                          </div>
                          <Badge className={`text-[10px] border ${statusColor(appt.status)}`}>{appt.status}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Schedule Operation Dialog */}
      <Dialog open={showOpForm} onOpenChange={setShowOpForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-rose-500" />
              Schedule Operation for {fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Operation Name *</Label>
                <Input
                  value={opForm.operationname}
                  onChange={(e) => setOpForm((f) => ({ ...f, operationname: e.target.value }))}
                  placeholder="e.g. Rhinoplasty"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operation Type *</Label>
                <Select onValueChange={(v) => setOpForm((f) => ({ ...f, operationtype: v }))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Rhinoplasty", "Blepharoplasty", "Facelift", "Breast Augmentation", "Breast Reduction", "Liposuction", "Abdominoplasty", "Otoplasty", "Lip Augmentation", "Botox/Filler", "Scar Revision", "Skin Graft", "Other"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Scheduled Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={opForm.scheduleddate}
                  onChange={(e) => setOpForm((f) => ({ ...f, scheduleddate: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (minutes)</Label>
                <Input
                  type="number"
                  value={opForm.duration}
                  onChange={(e) => setOpForm((f) => ({ ...f, duration: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Theater / Room</Label>
                <Input
                  value={opForm.theater}
                  onChange={(e) => setOpForm((f) => ({ ...f, theater: e.target.value }))}
                  placeholder="e.g. OR-1"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Anesthesia Type</Label>
                <Select onValueChange={(v) => setOpForm((f) => ({ ...f, anesthesiatype: v }))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["General", "Local", "Sedation", "Regional", "Topical"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Diagnosis / Indication</Label>
              <Input
                value={opForm.operationdiagnosis}
                onChange={(e) => setOpForm((f) => ({ ...f, operationdiagnosis: e.target.value }))}
                placeholder="Clinical indication for surgery"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Pre-operative Assessment</Label>
              <Textarea
                value={opForm.preoperativeassessment}
                onChange={(e) => setOpForm((f) => ({ ...f, preoperativeassessment: e.target.value }))}
                placeholder="Patient fitness, risks, consent, special instructions…"
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                disabled={!opForm.operationname || !opForm.scheduleddate || createOperation.isPending}
                onClick={() => createOperation.mutate(opForm as Record<string, string>)}
              >
                {createOperation.isPending ? "Scheduling…" : "Schedule Operation"}
              </Button>
              <Button variant="outline" onClick={() => setShowOpForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
