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
import { Separator } from "@/components/ui/separator";
import { CareHeader } from "@/components/care/care-header";
import { useCareWorkspace } from "@/components/care/care-workspace-context";
import type { TriageDashboardRecord } from "@/app/api/d/[workspaceid]/triage/route";
import type { VitalSignsRecord } from "@/lib/openehr/openehr";
import Link from "next/link";
import { Clock, AlertTriangle, CheckCircle2, Pill, Wind, Activity, Heart, Droplets, Thermometer } from "lucide-react";

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
  const [viewOpen, setViewOpen] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);

  const [vitals, setVitals] = useState<VitalSignsRecord | null>(null);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);

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
    if (!vitalsOpen || !selectedVisit || !workspaceId) {
      setVitals(null);
      setVitalsError(null);
      return;
    }

    const patientId = selectedVisit.patientId;

    async function loadVitals() {
      setVitalsLoading(true);
      setVitalsError(null);
      try {
        const res = await fetch(
          `/api/d/${workspaceId}/patients/${patientId}/vital-signs?limit=1`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load vitals");
        }
        setVitals(data.vitalSigns?.[0] || null);
      } catch (err) {
        setVitalsError(err instanceof Error ? err.message : "Failed to load vitals");
      } finally {
        setVitalsLoading(false);
      }
    }

    loadVitals();
  }, [vitalsOpen, selectedVisit, workspaceId]);

  const criticalAlerts = records.filter((v) => v.triageLevel === "red" && v.status !== "discharged");

  function openView(visit: TriageDashboardRecord) {
    setSelectedVisit(visit);
    setViewOpen(true);
  }

  function openVitals(visit: TriageDashboardRecord) {
    setSelectedVisit(visit);
    setVitalsOpen(true);
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openView(visit)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openVitals(visit)}
                  >
                    Vitals
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedVisit?.patientName}
              {selectedVisit && (
                <Badge variant="outline" className={triageClasses(selectedVisit.triageLevel)}>
                  {triageDot(selectedVisit.triageLevel)} {selectedVisit.triageLevel.toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Initial patient assessment details and services received
            </DialogDescription>
          </DialogHeader>

          {selectedVisit && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <Detail label="MRN" value={selectedVisit.mrn} />
                <Detail label="Age / Gender" value={`${selectedVisit.age} yrs / ${selectedVisit.gender}`} />
                <Detail label="Arrival mode" value={selectedVisit.arrivalMode} />
                <Detail label="Waiting time" value={`${selectedVisit.waiting} min`} />
                <Detail label="ESI" value={selectedVisit.esi} />
                <Detail label="Pain score" value={selectedVisit.painScore ? `${selectedVisit.painScore}/10` : "-"} />
                <Detail label="Allergies" value={selectedVisit.allergies || "None recorded"} />
                <Detail label="Doctor" value={selectedVisit.doctor || "Unassigned"} />
              </div>

              <Separator />

              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Chief complaint</div>
                <div className="mt-1">{selectedVisit.chiefComplaint || "-"}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase">Services received</div>
                <div className="mt-1 space-y-1">
                  <div>
                    <span className="text-muted-foreground">Meds given:</span>{" "}
                    {selectedVisit.medsGiven.length > 0
                      ? selectedVisit.medsGiven.join(", ")
                      : "None"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Procedures:</span>{" "}
                    {selectedVisit.procedures || "None"}
                  </div>
                </div>
              </div>

              {selectedVisit.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase">Notes</div>
                    <div className="mt-1 whitespace-pre-wrap">{selectedVisit.notes}</div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vitalsOpen} onOpenChange={setVitalsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedVisit?.patientName} — Vitals</DialogTitle>
            <DialogDescription>
              Latest recorded vital signs from OpenEHR
            </DialogDescription>
          </DialogHeader>

          {vitalsLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading vitals...</div>
          )}
          {vitalsError && (
            <div className="py-8 text-center text-sm text-destructive">{vitalsError}</div>
          )}
          {!vitalsLoading && !vitalsError && !vitals && (
            <div className="py-8 text-center text-sm text-muted-foreground">No vitals recorded yet.</div>
          )}
          {vitals && (
            <div className="grid grid-cols-2 gap-4">
              <VitalCard
                icon={<Thermometer className="size-4" />}
                label="Temperature"
                value={vitals.temperature ? `${vitals.temperature} °C` : "-"}
              />
              <VitalCard
                icon={<Heart className="size-4" />}
                label="Blood pressure"
                value={
                  vitals.systolic || vitals.diastolic
                    ? `${vitals.systolic ?? "-"}/${vitals.diastolic ?? "-"} mmHg`
                    : "-"
                }
              />
              <VitalCard
                icon={<Activity className="size-4" />}
                label="Heart rate"
                value={vitals.heart_rate ? `${vitals.heart_rate} bpm` : "-"}
              />
              <VitalCard
                icon={<Wind className="size-4" />}
                label="Respiratory rate"
                value={vitals.respiratory_rate ? `${vitals.respiratory_rate} /min` : "-"}
              />
              <VitalCard
                icon={<Droplets className="size-4" />}
                label="SpO2"
                value={vitals.spo2 ? `${vitals.spo2} %` : "-"}
              />
              <VitalCard
                icon={<Clock className="size-4" />}
                label="Recorded"
                value={vitals.recorded_time ? new Date(vitals.recorded_time).toLocaleString() : "-"}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVitalsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "-"}</div>
    </div>
  );
}

function VitalCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
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
