/**
 * Operations List Client Component
 * - Display operations in table format
 * - Filter by status
 * - Show details popup
 */
"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scissors, Calendar, User, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type Operation = {
  operationid: string;
  patientid: string;
  surgeonid: string;
  scheduleddate: string;
  estimatedduration: string | null;
  operationtype: "emergency" | "elective" | "urgent";
  status:
    | "scheduled"
    | "in_preparation"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "postponed";
  preoperativeassessment: string | null;
  operationname: string;
  operationdetails: string | null;
  anesthesiatype: string | null;
  theater: string | null;
  operationdiagnosis: string | null;
  actualstarttime: string | null;
  actualendtime: string | null;
  outcomes: string | null;
  complications: string | null;
  comment: string | null;
  price?: string | null;
  currency?: string | null;
  source?: "openehr" | "database";
  patient?: {
    firstname: string;
    middlename?: string | null;
    lastname: string;
    nationalid?: string | null;
  };
};

type Props = {
  workspaceid: string;
  userid: string;
};

type Patient = {
  patientid: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
};

const defaultOperationForm = {
  operationname: "",
  scheduleddate: "",
  estimatedduration: "",
  operationtype: "elective" as "emergency" | "elective" | "urgent",
  theater: "",
  anesthesiatype: "",
  operationdiagnosis: "",
  preoperativeassessment: "",
  operationdetails: "",
  price: "",
  patientid: "",
};

export default function OperationsList({ workspaceid, userid }: Props) {
  const queryClient = useQueryClient();
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(
    null
  );
  const [filter, setFilter] = useState<
    "all" | "scheduled" | "in_progress" | "completed" | "cancelled"
  >("all");

  // Schedule operation state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [savingOperation, setSavingOperation] = useState(false);
  const [operationFormData, setOperationFormData] = useState(defaultOperationForm);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [showPatientResults, setShowPatientResults] = useState(false);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["patients-list", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/patients`);
      if (res.ok) {
        const data = await res.json();
        return data.patients || [];
      }
      return [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const filteredPatients = patientSearch.trim().length >= 1
    ? patients.filter((p) => {
        const fullName = `${p.firstname} ${p.middlename ? p.middlename + " " : ""}${p.lastname}`.toLowerCase();
        const search = patientSearch.toLowerCase();
        return fullName.includes(search) || p.patientid.toLowerCase().includes(search);
      })
    : [];

  const handleScheduleOperation = async () => {
    if (!operationFormData.patientid || !operationFormData.operationname || !operationFormData.scheduleddate) {
      alert("Please fill in required fields: Patient, Operation Name, and Scheduled Date");
      return;
    }
    try {
      setSavingOperation(true);
      const res = await fetch(`/api/d/${workspaceid}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...operationFormData, workspaceid }),
      });
      if (!res.ok) throw new Error("Failed to schedule operation");
      setShowScheduleDialog(false);
      setOperationFormData(defaultOperationForm);
      setPatientSearch("");
      setSelectedPatientName("");
      queryClient.invalidateQueries({ queryKey: ["operations", workspaceid, userid] });
    } catch (error) {
      console.error("Error scheduling operation:", error);
      alert("Failed to schedule operation");
    } finally {
      setSavingOperation(false);
    }
  };

  const { data: operations = [], isLoading: loading } = useQuery({
    queryKey: ["operations", workspaceid, userid],
    queryFn: async () => {
      const res = await fetch(
        `/api/d/${workspaceid}/operations?surgeonid=${userid}`
      );
      if (res.ok) {
        const data = await res.json();
        return (data.operations as Operation[]) || [];
      }
      return [];
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const formatDateTime = (datetime: string) => {
    try {
      const date = new Date(datetime);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: "Unknown", time: "Unknown" };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_preparation":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "postponed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "emergency":
        return "bg-red-100 text-red-800";
      case "urgent":
        return "bg-orange-100 text-orange-800";
      case "elective":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredOperations = operations.filter((op) => {
    if (filter === "all") return true;
    return op.status === filter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOperations.length / PAGE_SIZE));
  const pagedOperations = filteredOperations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div className="flex items-center gap-2">
        <Link href={`/d/${workspaceid}/doctor`}>
          
        </Link>

        <h1 className="text-xl font-semibold"> Operations</h1>
      </div>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground">
            {filteredOperations.length} operation
            {filteredOperations.length !== 1 ? "s" : ""}{" "}
            {filter !== "all" && `(${operations.length} total)`}
          </p>
        </div>
        <Button
          className="bg-[#4684c2] hover:bg-[#3a6fa0] text-white"
          size="sm"
          onClick={() => setShowScheduleDialog(true)}
        >
          <Scissors className="h-4 w-4 mr-1" />
          Schedule Operation
        </Button>
      </div>
  
      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "all"
               ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => { setFilter("all"); setCurrentPage(1); }}
          variant="ghost"
        >
          All
        </Button>

        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "scheduled"
              ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => { setFilter("scheduled"); setCurrentPage(1); }}
          variant="ghost"
        >
          Scheduled
        </Button>

        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "in_progress"
               ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => { setFilter("in_progress"); setCurrentPage(1); }}
          variant="ghost"
        >
          In Progress
        </Button>

        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "completed"
               ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => { setFilter("completed"); setCurrentPage(1); }}
          variant="ghost"
        >
          Completed
        </Button>

        <Button
          className={`rounded-md font-bold border-[0.5px] border-gray-400 ${
            filter === "cancelled"
               ? "bg-orange-400 text-white"
              : "bg-[#4684c2] text-white"
          }`}
          size="sm"
          onClick={() => { setFilter("cancelled"); setCurrentPage(1); }}
          variant="ghost"
        >
          Cancelled
        </Button>
      </div>

      {/* Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {/* Skeleton loader - shows table structure while loading */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Patient</th>
                      <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                      <th className="text-left py-3 px-4 font-medium">Operation</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Theater</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="border-b animate-pulse">
                        <td className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded w-28"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Loading operations from OpenEHR...
              </p>
            </div>
          ) : filteredOperations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No operations found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Patient</th>
                    <th className="text-left py-3 px-4 font-medium">
                      Date & Time
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Operation
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Theater</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOperations.map((op) => {
                    const { date, time } = formatDateTime(op.scheduleddate);
                    const patientName = op.patient
                      ? `${op.patient.firstname} ${
                          op.patient.middlename
                            ? op.patient.middlename + " "
                            : ""
                        }${op.patient.lastname}`
                      : "Unknown Patient";

                    return (
                      <tr
                        key={op.operationid}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium">{patientName}</div>
                          {op.patient?.nationalid && (
                            <div className="text-xs text-muted-foreground">
                              ID: {op.patient.nationalid}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div>{date}</div>
                          <div className="text-muted-foreground">{time}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{op.operationname}</div>
                          {op.estimatedduration && (
                            <div className="text-xs text-muted-foreground">
                              {op.estimatedduration} min
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                              op.operationtype
                            )}`}
                          >
                            {op.operationtype}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {op.theater || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              op.status
                            )}`}
                          >
                            {op.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOperation(op)}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && filteredOperations.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredOperations.length)} of {filteredOperations.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Schedule Operation Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-[65vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Scissors className="h-4 w-4" />
              Schedule Operation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Patient Search */}
            <div className="space-y-1">
              <Label className="text-sm">Patient *</Label>
              <div className="relative">
                <Input
                  placeholder="Search by name or patient ID..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientResults(true);
                    if (!e.target.value) {
                      setOperationFormData({ ...operationFormData, patientid: "" });
                      setSelectedPatientName("");
                    }
                  }}
                  onFocus={() => setShowPatientResults(true)}
                  onBlur={() => setTimeout(() => setShowPatientResults(false), 150)}
                  className={`h-9 ${operationFormData.patientid ? "border-green-500 bg-green-50" : ""}`}
                />
                {operationFormData.patientid && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">
                    ✓ {selectedPatientName}
                  </span>
                )}
                {showPatientResults && filteredPatients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredPatients.map((p) => {
                      const fullName = `${p.firstname} ${p.middlename ? p.middlename + " " : ""}${p.lastname}`;
                      return (
                        <button
                          key={p.patientid}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between gap-2"
                          onMouseDown={() => {
                            setOperationFormData({ ...operationFormData, patientid: p.patientid });
                            setSelectedPatientName(fullName);
                            setPatientSearch(fullName);
                            setShowPatientResults(false);
                          }}
                        >
                          <span className="font-medium">{fullName}</span>
                          <span className="text-xs text-muted-foreground shrink-0">ID: {p.patientid}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {showPatientResults && patientSearch.trim().length >= 1 && filteredPatients.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-sm text-muted-foreground">
                    No patients found
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Operation Name *</Label>
                <Select
                  value={operationFormData.operationname}
                  onValueChange={(value) =>
                    setOperationFormData({ ...operationFormData, operationname: value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appendectomy">Appendectomy</SelectItem>
                    <SelectItem value="Cholecystectomy">Cholecystectomy</SelectItem>
                    <SelectItem value="Hernia Repair">Hernia Repair</SelectItem>
                    <SelectItem value="Cesarean Section">Cesarean Section</SelectItem>
                    <SelectItem value="Hysterectomy">Hysterectomy</SelectItem>
                    <SelectItem value="Knee Arthroscopy">Knee Arthroscopy</SelectItem>
                    <SelectItem value="Hip Replacement">Hip Replacement</SelectItem>
                    <SelectItem value="Knee Replacement">Knee Replacement</SelectItem>
                    <SelectItem value="Cataract Surgery">Cataract Surgery</SelectItem>
                    <SelectItem value="Tonsillectomy">Tonsillectomy</SelectItem>
                    <SelectItem value="Coronary Artery Bypass">Coronary Artery Bypass</SelectItem>
                    <SelectItem value="Mastectomy">Mastectomy</SelectItem>
                    <SelectItem value="Prostatectomy">Prostatectomy</SelectItem>
                    <SelectItem value="Thyroidectomy">Thyroidectomy</SelectItem>
                    <SelectItem value="Spinal Fusion">Spinal Fusion</SelectItem>
                    <SelectItem value="Gastric Bypass">Gastric Bypass</SelectItem>
                    <SelectItem value="Colectomy">Colectomy</SelectItem>
                    <SelectItem value="Craniotomy">Craniotomy</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Scheduled Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={operationFormData.scheduleddate}
                  onChange={(e) =>
                    setOperationFormData({ ...operationFormData, scheduleddate: e.target.value })
                  }
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Operation Type</Label>
                <Select
                  value={operationFormData.operationtype}
                  onValueChange={(value: "emergency" | "elective" | "urgent") =>
                    setOperationFormData({ ...operationFormData, operationtype: value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elective">Elective</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Theater</Label>
                <Input
                  placeholder="e.g., Theater 1"
                  value={operationFormData.theater}
                  onChange={(e) =>
                    setOperationFormData({ ...operationFormData, theater: e.target.value })
                  }
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Anesthesia Type</Label>
                <Input
                  placeholder="e.g., General"
                  value={operationFormData.anesthesiatype}
                  onChange={(e) =>
                    setOperationFormData({ ...operationFormData, anesthesiatype: e.target.value })
                  }
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Price (IQD)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={operationFormData.price}
                    onChange={(e) =>
                      setOperationFormData({ ...operationFormData, price: e.target.value })
                    }
                    className="h-9 pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">IQD</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Diagnosis</Label>
              <Textarea
                placeholder="Enter diagnosis..."
                rows={2}
                value={operationFormData.operationdiagnosis}
                onChange={(e) =>
                  setOperationFormData({ ...operationFormData, operationdiagnosis: e.target.value })
                }
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Pre-operative Assessment</Label>
              <Textarea
                placeholder="Enter pre-operative assessment..."
                rows={2}
                value={operationFormData.preoperativeassessment}
                onChange={(e) =>
                  setOperationFormData({ ...operationFormData, preoperativeassessment: e.target.value })
                }
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Operation Details</Label>
              <Textarea
                placeholder="Enter operation details..."
                rows={2}
                value={operationFormData.operationdetails}
                onChange={(e) =>
                  setOperationFormData({ ...operationFormData, operationdetails: e.target.value })
                }
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
              disabled={savingOperation}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleOperation}
              disabled={savingOperation}
              className="bg-[#4684c2] hover:bg-[#3a6fa0] h-9"
            >
              {savingOperation ? "Scheduling..." : "Schedule Operation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operation Details Dialog */}
      <Dialog
        open={!!selectedOperation}
        onOpenChange={() => setSelectedOperation(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Operation Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the surgical procedure
            </DialogDescription>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedOperation.patient
                      ? `${selectedOperation.patient.firstname} ${
                          selectedOperation.patient.middlename
                            ? selectedOperation.patient.middlename + " "
                            : ""
                        }${selectedOperation.patient.lastname}`
                      : "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">ID:</span>{" "}
                    {selectedOperation.patient?.nationalid || "N/A"}
                  </div>
                </div>
              </div>

              {/* Operation Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Operation Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Operation Name:</span>{" "}
                    {selectedOperation.operationname}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                        selectedOperation.operationtype
                      )}`}
                    >
                      {selectedOperation.operationtype}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        selectedOperation.status
                      )}`}
                    >
                      {selectedOperation.status.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Theater:</span>{" "}
                    {selectedOperation.theater || "Not assigned"}
                  </div>
                  <div>
                    <span className="font-medium">Anesthesia Type:</span>{" "}
                    {selectedOperation.anesthesiatype || "Not specified"}
                  </div>
                  <div>
                    <span className="font-medium">Estimated Duration:</span>{" "}
                    {selectedOperation.estimatedduration
                      ? `${selectedOperation.estimatedduration} minutes`
                      : "Not specified"}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span>{" "}
                    {selectedOperation.price
                      ? `${Number(selectedOperation.price).toLocaleString()} ${selectedOperation.currency ?? "IQD"}`
                      : "Not specified"}
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Scheduled Date:</span>{" "}
                    {formatDateTime(selectedOperation.scheduleddate).date}
                  </div>
                  <div>
                    <span className="font-medium">Scheduled Time:</span>{" "}
                    {formatDateTime(selectedOperation.scheduleddate).time}
                  </div>
                  {selectedOperation.actualstarttime && (
                    <div>
                      <span className="font-medium">Actual Start:</span>{" "}
                      {formatDateTime(selectedOperation.actualstarttime).date}{" "}
                      {formatDateTime(selectedOperation.actualstarttime).time}
                    </div>
                  )}
                  {selectedOperation.actualendtime && (
                    <div>
                      <span className="font-medium">Actual End:</span>{" "}
                      {formatDateTime(selectedOperation.actualendtime).date}{" "}
                      {formatDateTime(selectedOperation.actualendtime).time}
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Medical Information
                </h3>
                <div className="space-y-3 text-sm">
                  {selectedOperation.operationdiagnosis && (
                    <div>
                      <span className="font-medium">Diagnosis:</span>
                      <p className="mt-1">{selectedOperation.operationdiagnosis}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Pre-operative Assessment:</span>
                    <p className="mt-1 text-muted-foreground">
                      {selectedOperation.preoperativeassessment || "No description"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Operation Details:</span>
                    <p className="mt-1 text-muted-foreground">
                      {selectedOperation.operationdetails || "No description"}
                    </p>
                  </div>
                  {selectedOperation.outcomes && (
                    <div>
                      <span className="font-medium">Outcomes:</span>
                      <p className="mt-1">{selectedOperation.outcomes}</p>
                    </div>
                  )}
                  {selectedOperation.complications && (
                    <div>
                      <span className="font-medium">Complications:</span>
                      <p className="mt-1">{selectedOperation.complications}</p>
                    </div>
                  )}
                  {selectedOperation.comment && selectedOperation.comment !== selectedOperation.preoperativeassessment && (
                    <div>
                      <span className="font-medium">Comments:</span>
                      <p className="mt-1">{selectedOperation.comment}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedOperation.patient && (
                  <Link
                    href={`/d/${workspaceid}/patients/${selectedOperation.patientid}`}
                  >
                    <Button size="sm">View Patient</Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedOperation(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
