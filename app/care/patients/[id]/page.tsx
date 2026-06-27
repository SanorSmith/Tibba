import { notFound } from "next/navigation";
import { patients, visits, getVisitTasks, getVisitMedications, getVisitVitals } from "@/lib/care/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { AlertTriangle, Clock, Activity } from "lucide-react";

function triageClasses(level: string) {
  switch (level) {
    case "red":
      return "bg-red-100 text-red-700 border-red-200";
    case "yellow":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "green":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "";
  }
}

export default function PatientOverviewPage({ params }: { params: { id: string } }) {
  const patient = patients.find((p) => p.id === params.id);
  if (!patient) return notFound();

  const visit = visits.find((v) => v.patientId === patient.id);
  const patientTasks = visit ? getVisitTasks(visit.id) : [];
  const patientMeds = visit ? getVisitMedications(visit.id) : [];
  const patientVitals = visit ? getVisitVitals(visit.id) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4 bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{patient.age} years</span>
              <span>{patient.gender === "male" ? "Male" : "Female"}</span>
              <span>MRN: {patient.mrn}</span>
              <span className="font-semibold text-foreground">{patient.bed}</span>
              {visit && (
                <Badge variant="outline" className={triageClasses(visit.triageLevel)}>
                  {visit.triageLevel.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/care/vitals?visit=${visit?.id}`}>Vitals</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/care/tasks?visit=${visit?.id}`}>Tasks</Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-muted-foreground">Allergies</div>
            <div className="font-medium">{patient.allergies.join(", ") || "None"}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-muted-foreground">Fall Risk</div>
            <div className="font-medium capitalize">{patient.fallRisk}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-muted-foreground">Isolation</div>
            <div className="font-medium">{patient.isolation || "None"}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-muted-foreground">Doctor</div>
            <div className="font-medium">{visit?.doctor || "Unassigned"}</div>
          </div>
        </div>

        {visit?.triageLevel === "red" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            <AlertTriangle className="size-4" />
            Critical patient. Red flags: {visit.chiefComplaint}. ESI {visit.esi}, NEWS2 {visit.news2}.
          </div>
        )}
      </div>

      <Tabs defaultValue="vitals">
        <TabsList>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="vitals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4" /> Vital History
              </CardTitle>
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
                  {patientVitals.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{new Date(v.time).toLocaleString()}</TableCell>
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
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {patientTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> Due {new Date(t.dueTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                    {t.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="medications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Medications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {patientMeds.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{m.name} {m.dose}</div>
                    <div className="text-xs text-muted-foreground">{m.route} • Scheduled {m.scheduledTime}</div>
                  </div>
                  <Badge variant={m.status === "given" ? "default" : "destructive"}>
                    {m.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {visit && (
                <div className="flex gap-3">
                  <div className="text-sm text-muted-foreground w-20">{new Date(visit.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="font-medium">Arrival ({visit.arrivalMode})</div>
                </div>
              )}
              {visit && (
                <div className="flex gap-3">
                  <div className="text-sm text-muted-foreground w-20">{new Date(visit.triageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="font-medium">Triage: {visit.chiefComplaint}</div>
                </div>
              )}
              {patientVitals.map((v) => (
                <div key={v.id} className="flex gap-3">
                  <div className="text-sm text-muted-foreground w-20">{new Date(v.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  <div>Vitals recorded</div>
                </div>
              ))}
              {patientMeds.map((m) => (
                <div key={m.id} className="flex gap-3">
                  <div className="text-sm text-muted-foreground w-20">{m.givenTime || m.scheduledTime}</div>
                  <div>Medication {m.name} {m.status}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
