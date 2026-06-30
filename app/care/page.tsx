"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CareHeader } from "@/components/care/care-header";
import { useCareWorkspace } from "@/components/care/care-workspace-context";
import type { TriageDashboardRecord } from "@/app/api/d/[workspaceid]/triage/route";
import Link from "next/link";
import { Clock, AlertTriangle, CheckCircle2, Pill } from "lucide-react";

interface Doctor {
  availabilityid: string;
  doctorid: string;
  name: string | null;
  email: string | null;
  isavailable: boolean;
  shiftstart: string | null;
  shiftend: string | null;
}

type TriageLevel = "red" | "yellow" | "green";

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

export default function CareDashboardPage() {
  const { workspaceId } = useCareWorkspace();
  const [records, setRecords] = useState<TriageDashboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVisit, setSelectedVisit] = useState<TriageDashboardRecord | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;

    async function load() {
      try {
        const res = await fetch(`/api/d/${workspaceId}/triage`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load triage records");
        }
        setRecords(data.records || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [workspaceId]);

  useEffect(() => {
    if (!assignOpen || !workspaceId) {
      setDoctors([]);
      setDoctorsError(null);
      return;
    }

    async function loadDoctors() {
      setDoctorsLoading(true);
      setDoctorsError(null);
      try {
        const res = await fetch(`/api/d/${workspaceId}/emergency-doctors/available`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load available doctors");
        }
        setDoctors(data.doctors || []);
      } catch (err) {
        setDoctorsError(err instanceof Error ? err.message : "Failed to load doctors");
      } finally {
        setDoctorsLoading(false);
      }
    }

    loadDoctors();
  }, [assignOpen, workspaceId]);

  const criticalAlerts = records.filter((v) => v.triageLevel === "red" && v.status !== "discharged");

  function openAssignDoctor(visit: TriageDashboardRecord) {
    setSelectedVisit(visit);
    setAssignOpen(true);
  }

  async function assignDoctor(doctorId: string) {
    if (!selectedVisit || !workspaceId) return;
    setAssigning(true);
    setDoctorsError(null);
    try {
      const res = await fetch(`/api/d/${workspaceId}/emergency-doctors/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: selectedVisit.visitId,
          patientId: selectedVisit.patientId,
          doctorId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign doctor");

      const doctor = doctors.find((d) => d.doctorid === doctorId);
      setRecords((prev) =>
        prev.map((r) =>
          r.visitId === selectedVisit.visitId
            ? { ...r, doctor: doctor?.name || "Assigned" }
            : r
        )
      );
      setAssignOpen(false);
    } catch (err) {
      setDoctorsError(err instanceof Error ? err.message : "Failed to assign doctor");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-6">
      <CareHeader
        title="Nurse Dashboard"
        description="My shift at a glance"
        action={
          <Button asChild>
            <Link href="/care/triage">New Initial Patient Assessment</Link>
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
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckCircle2 className="size-4 text-[#ffae04]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">0 overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Medications Due</CardTitle>
            <Pill className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
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

      <Card>
        <CardHeader>
          <CardTitle>Assigned Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading initial patient assessments...
            </div>
          )}
          {error && (
            <div className="py-8 text-center text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && records.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No initial patient assessments yet.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {records.map((visit) => (
              <div
                key={visit.visitId}
                className="rounded-xl border bg-card text-card-foreground flex flex-col hover:shadow-sm transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {visit.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{visit.patientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {visit.age} yrs • {visit.gender === "male" ? "M" : "F"} • {visit.mrn}
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
                      Waiting
                    </div>
                    <div>Waiting: {visit.waiting} min</div>
                    <div>Doctor: {visit.doctor || "Unassigned"}</div>
                    <div>ESI: {visit.esi}</div>
                  </div>
                </div>

                <div className="border-t p-4 flex gap-2 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link href={`/care/patients/${visit.patientId}`}>View</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openAssignDoctor(visit)}
                  >
                    Assign Doctor
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Doctor</DialogTitle>
            <DialogDescription>
              Select an available emergency doctor for {selectedVisit?.patientName}
            </DialogDescription>
          </DialogHeader>

          {doctorsLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading available doctors...</div>
          )}
          {doctorsError && (
            <div className="py-8 text-center text-sm text-destructive">{doctorsError}</div>
          )}
          {!doctorsLoading && !doctorsError && doctors.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No emergency doctors available. Add doctors to emergency availability.
            </div>
          )}
          {!doctorsLoading && !doctorsError && doctors.length > 0 && (
            <div className="space-y-2">
              {doctors.map((doctor) => (
                <div
                  key={doctor.doctorid}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{doctor.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{doctor.email}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => assignDoctor(doctor.doctorid)}
                    disabled={assigning}
                  >
                    {assigning ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
