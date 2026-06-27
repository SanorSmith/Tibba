import {
  patients,
  visits,
  tasks,
  medications,
  type TriageLevel,
} from "@/lib/care/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CareHeader } from "@/components/care/care-header";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pill,
} from "lucide-react";

function triageClasses(level: TriageLevel) {
  switch (level) {
    case "red":
      return "bg-[#e54b4f]/10 text-[#e54b4f] border-[#e54b4f]/20";
    case "yellow":
      return "bg-[#ffae04]/10 text-[#c78100] border-[#ffae04]/20";
    case "green":
      return "bg-[#22c55e]/10 text-[#15803d] border-[#22c55e]/20";
  }
}

function triageDot(level: TriageLevel) {
  switch (level) {
    case "red":
      return "🔴";
    case "yellow":
      return "🟡";
    case "green":
      return "🟢";
  }
}

function minutesSince(time: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(time).getTime()) / 60000));
}

export default function CareDashboardPage() {
  const now = Date.now();
  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const overdueTasks = pendingTasks.filter(
    (t) => now - new Date(t.dueTime).getTime() > 0
  );
  const dueMeds = medications.filter((m) => m.status === "due");
  const criticalAlerts = visits.filter(
    (v) => v.triageLevel === "red" && v.status !== "discharged"
  );

  return (
    <div className="space-y-6">
      <CareHeader
        title="Nurse Dashboard"
        description="My shift at a glance"
        action={
          <Button asChild>
            <Link href="/care/triage">New Triage</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned Patients</CardTitle>
            <UsersIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckCircle2 className="size-4 text-[#ffae04]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {overdueTasks.length} overdue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Medications Due</CardTitle>
            <Pill className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueMeds.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalAlerts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Assigned Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {visits.map((visit) => {
                const patient = patients.find((p) => p.id === visit.patientId)!;
                const visitTasks = tasks.filter((t) => t.visitId === visit.id);
                const visitMeds = medications.filter((m) => m.visitId === visit.id);
                const waiting = minutesSince(visit.arrivalTime);
                return (
                  <div
                    key={visit.id}
                    className="rounded-xl border p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {patient.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{patient.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {patient.age} yrs • {patient.gender === "male" ? "M" : "F"} • {patient.mrn}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={triageClasses(visit.triageLevel)}>
                        {triageDot(visit.triageLevel)} {visit.triageLevel.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {patient.bed || "Waiting"}
                      </div>
                      <div>Waiting: {waiting} min</div>
                      <div>Doctor: {visit.doctor || "Unassigned"}</div>
                      <div>ESI: {visit.esi}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {visitTasks.slice(0, 2).map((t) => (
                        <Badge key={t.id} variant="secondary">
                          {t.title}
                        </Badge>
                      ))}
                      {visitMeds.some((m) => m.status === "due") && (
                        <Badge variant="destructive">Med due</Badge>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" asChild className="w-full">
                        <Link href={`/care/patients/${patient.id}`}>View</Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="w-full">
                        <Link href={`/care/vitals?visit=${visit.id}`}>Vitals</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
