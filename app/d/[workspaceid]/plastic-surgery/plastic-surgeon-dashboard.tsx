"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Scissors, Calendar, Clock, CheckCircle2,
} from "lucide-react";

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  nationalid?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateofbirth?: string | null;
};

type Operation = {
  operationid: string;
  patientid: string;
  surgeonid: string;
  operationname: string;
  operationtype: string;
  scheduleddate: string;
  theater: string;
  status: string;
};

type Appointment = {
  appointmentid: string;
  patientid: string;
  starttime: string;
  endtime: string;
  status: string;
  notes?: { patientname?: string } | null;
};

type SurgeonInfo = {
  name: string;
  email: string;
  staffInfo?: { unit?: string | null; specialty?: string | null };
};

export default function PlasticSurgeonDashboard({
  workspaceid,
  surgeonid,
  surgeonInfo,
}: {
  workspaceid: string;
  surgeonid: string;
  surgeonInfo: SurgeonInfo;
}) {

  const { data: patients = [] } = useQuery({
    queryKey: ["ps-patients", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.patients as Patient[]) || [];
    },
  });

  const { data: operations = [], isLoading: loadingOps } = useQuery({
    queryKey: ["ps-operations", workspaceid, surgeonid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/operations?surgeonid=${surgeonid}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.operations as Operation[]) || [];
    },
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["ps-appointments", workspaceid, surgeonid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/doctor/${surgeonid}/appointments`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.appointments as Appointment[]) || [];
    },
  });

  const isLoading = loadingOps || loadingAppts;

  const todayOps = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return operations.filter(
      (o) => o.scheduleddate.startsWith(today) && o.status !== "cancelled"
    );
  }, [operations]);

  const upcomingOps = useMemo(() => {
    const now = new Date();
    return operations
      .filter((o) => new Date(o.scheduleddate) > now && o.status === "scheduled")
      .sort((a, b) => new Date(a.scheduleddate).getTime() - new Date(b.scheduleddate).getTime());
  }, [operations]);

  const todayAppts = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return appointments.filter((a) => {
      const d = new Date(a.starttime);
      return d >= start && d <= end && a.status !== "cancelled";
    });
  }, [appointments]);

  const completedOps = useMemo(
    () => operations.filter((o) => o.status === "completed").length,
    [operations]
  );

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled": return "bg-blue-100 text-blue-700";
      case "in_progress": return "bg-yellow-100 text-yellow-700";
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4 h-[calc(100dvh-80px)] overflow-y-auto pr-1 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plastic Surgery</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", flexDirection: "row", gap: "0.75rem" }}>
        {[
          { label: "Total Patients", value: patients.length, icon: Users, color: "border-l-violet-500", iconColor: "text-violet-400" },
          { label: "Today's Ops", value: todayOps.length, icon: Scissors, color: "border-l-rose-500", iconColor: "text-rose-400" },
          { label: "Today's Consultations", value: todayAppts.length, icon: Calendar, color: "border-l-blue-500", iconColor: "text-blue-400" },
          { label: "Completed Ops", value: completedOps, icon: CheckCircle2, color: "border-l-green-500", iconColor: "text-green-400" },
        ].map(({ label, value, icon: Icon, color, iconColor }) => (
          <Card key={label} className={`border-l-4 ${color}`} style={{ flex: "1 1 0", minWidth: 0 }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{isLoading ? "—" : value}</p>
              </div>
              <Icon className={`h-8 w-8 ${iconColor}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content: Ops + Appointments side by side */}
      <div style={{ display: "flex", flexDirection: "row", gap: "1rem" }}>
        {/* Upcoming Operations */}
        <div className="space-y-3" style={{ flex: "1 1 0", minWidth: 0 }}>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Scissors className="h-4 w-4 text-rose-500" />
                Upcoming Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {loadingOps ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : upcomingOps.length === 0 ? (
                <p className="text-xs text-muted-foreground">No upcoming operations.</p>
              ) : (
                upcomingOps.slice(0, 5).map((op) => {
                  const pt = patients.find((p) => p.patientid === op.patientid);
                  return (
                    <div
                      key={op.operationid}
                      className="flex items-start justify-between border rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                      onClick={() => pt && (window.location.href = `/d/${workspaceid}/plastic-surgery/patients/${pt.patientid}`)}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-medium truncate">{op.operationname}</p>
                        <p className="text-xs text-muted-foreground">
                          {pt ? `${pt.firstname} ${pt.lastname}` : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {new Date(op.scheduleddate).toLocaleDateString()} · {op.theater}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${statusColor(op.status)}`}>
                        {op.status}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Consultations */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Today's Consultations
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {loadingAppts ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : todayAppts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No appointments today.</p>
              ) : (
                todayAppts.slice(0, 5).map((appt) => (
                  <div key={appt.appointmentid} className="flex items-center justify-between border rounded-md p-2">
                    <div>
                      <p className="text-xs font-medium">{appt.notes?.patientname || "Patient"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(appt.starttime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(appt.endtime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
