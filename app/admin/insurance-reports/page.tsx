"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { FileText, Search, Plus, Loader2, Sparkles, RefreshCw, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type LabOrder = {
  testName: string;
  reason: string;
  requestId: string;
  orderTime: string;
  serviceType?: string; // To identify if it's lab, x-ray, surgery, etc.
};

type Medication = {
  name: string;
  dose: string;
  price: number;
};

export default function InsuranceReportsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPatientData, setLoadingPatientData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [selectedLabOrders, setSelectedLabOrders] = useState<Set<number>>(new Set());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<Set<number>>(new Set());

  const [formData, setFormData] = useState({
    reportType: "",
    insuranceCompany: "",
    diagnosis: "",
    clinicalFindings: "",
    treatmentPlan: "",
    medications: "",
    investigations: "",
    prognosis: "",
    workStatus: "",
    recommendations: "",
  });

  // Search patients
  const searchPatients = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/patients/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error("Error searching patients:", error);
      setMessage({ type: "error", text: "Failed to search patients" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient clinical data from OpenEHR and database
  const fetchPatientData = async (patientId: string) => {
    setLoadingPatientData(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/clinical-data`);
      if (!res.ok) throw new Error("Failed to fetch patient data");
      
      const data = await res.json();
      
      // Set medications and lab orders
      setMedications(data.medications || []);
      setSelectedMedications(new Set());
      setLabOrders(data.labOrders || []);
      setSelectedLabOrders(new Set());
      
      // Pre-populate form with existing data
      setFormData(prev => ({
        ...prev,
        diagnosis: data.diagnoses?.join(", ") || "",
        clinicalFindings: data.clinicalFindings || "",
        medications: "",
        investigations: data.investigations || "",
        treatmentPlan: data.treatmentPlan || "",
      }));
    } catch (error) {
      console.error("Error fetching patient data:", error);
      // Don't show error to user, just log it
    } finally {
      setLoadingPatientData(false);
    }
  };

  // Toggle lab order selection
  const toggleLabOrder = (index: number) => {
    const newSelected = new Set(selectedLabOrders);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLabOrders(newSelected);
  };

  // Select all lab orders
  const selectAllLabOrders = () => {
    if (selectedLabOrders.size === labOrders.length) {
      setSelectedLabOrders(new Set());
    } else {
      setSelectedLabOrders(new Set(labOrders.map((_, i) => i)));
    }
  };

  // Toggle medication selection
  const toggleMedication = (index: number) => {
    const newSelected = new Set(selectedMedications);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedMedications(newSelected);
  };

  // Select all medications
  const selectAllMedications = () => {
    if (selectedMedications.size === medications.length) {
      setSelectedMedications(new Set());
    } else {
      setSelectedMedications(new Set(medications.map((_, i) => i)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setMessage({ type: "error", text: "Please select a patient" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // Build selected lab orders text
      const selectedLabOrdersText = Array.from(selectedLabOrders)
        .map(index => {
          const order = labOrders[index];
          return `${order.testName}${order.reason ? ` (${order.reason})` : ""}${
            order.orderTime ? ` - ${new Date(order.orderTime).toLocaleDateString()}` : ""
          }`;
        })
        .join("\n");

      // Build selected medications text
      const selectedMedicationsText = Array.from(selectedMedications)
        .map(index => {
          const med = medications[index];
          return `${med.name} - ${med.dose} (${med.price.toFixed(2)} IQD)`;
        })
        .join("\n");

      // Combine selected lab orders with additional investigations
      const combinedInvestigations = [selectedLabOrdersText, formData.investigations]
        .filter(Boolean)
        .join("\n\n");

      // Combine selected medications with additional medications
      const combinedMedications = [selectedMedicationsText, formData.medications]
        .filter(Boolean)
        .join("\n\n");

      const res = await fetch("/api/admin/insurance-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.patientid,
          ...formData,
          investigations: combinedInvestigations,
          medications: combinedMedications,
        }),
      });

      if (!res.ok) throw new Error("Failed to create report");

      setMessage({ type: "success", text: "Insurance report created successfully!" });
      // Reset form
      setFormData({
        reportType: "",
        insuranceCompany: "",
        diagnosis: "",
        clinicalFindings: "",
        treatmentPlan: "",
        medications: "",
        investigations: "",
        prognosis: "",
        workStatus: "",
        recommendations: "",
      });
      setSelectedPatient(null);
      setSearchQuery("");
      setPatients([]);
      setLabOrders([]);
      setSelectedLabOrders(new Set());
      setMedications([]);
      setSelectedMedications(new Set());
    } catch (error) {
      console.error("Error creating report:", error);
      setMessage({ type: "error", text: "Failed to create insurance report" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Insurance Clinical Reports
        </h1>
        <p className="text-muted-foreground mt-2">
          Create insurance clinical reports for patients
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Patient Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search by name, ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPatients()}
            />
            <Button onClick={searchPatients} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          {selectedPatient && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">
                    {selectedPatient.firstname} {selectedPatient.lastname}
                  </p>
                  <p className="text-sm text-muted-foreground">ID: {selectedPatient.patientid}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.gender} • {selectedPatient.dateofbirth}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                  Change
                </Button>
              </div>
            </div>
          )}

          {!selectedPatient && patients.length > 0 && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {patients.map((patient) => (
                <div
                  key={patient.patientid}
                  className="p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedPatient(patient);
                    setPatients([]);
                    fetchPatientData(patient.patientid);
                  }}
                >
                  <p className="font-medium">
                    {patient.firstname} {patient.lastname}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {patient.gender} • {patient.dateofbirth} • {patient.phone}
                  </p>
                </div>
              ))}
            </div>
          )}

          {loadingPatientData && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading patient clinical data...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportType">Report Type *</Label>
                <Select
                  value={formData.reportType}
                  onValueChange={(value) => setFormData({ ...formData, reportType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical_claim">Medical Claim</SelectItem>
                    <SelectItem value="disability">Disability Assessment</SelectItem>
                    <SelectItem value="work_fitness">Work Fitness</SelectItem>
                    <SelectItem value="pre_authorization">Pre-Authorization</SelectItem>
                    <SelectItem value="general">General Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="insuranceCompany">Insurance Company *</Label>
                <Input
                  id="insuranceCompany"
                  value={formData.insuranceCompany}
                  onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                  placeholder="e.g., Al Rajhi Takaful"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="diagnosis">Diagnosis *</Label>
                {selectedPatient && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchPatientData(selectedPatient.patientid)}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Load from EHR
                  </Button>
                )}
              </div>
              <Textarea
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="Primary and secondary diagnoses..."
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="clinicalFindings">Clinical Findings</Label>
              <Textarea
                id="clinicalFindings"
                value={formData.clinicalFindings}
                onChange={(e) => setFormData({ ...formData, clinicalFindings: e.target.value })}
                placeholder="Physical examination findings, vital signs, etc..."
                rows={4}
              />
            </div>

            {/* Services Table (Lab Orders, X-rays, Procedures, etc.) */}
            {labOrders.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Clinical Services from EHR ({labOrders.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllLabOrders}
                    className="h-7 text-xs"
                  >
                    {selectedLabOrders.size === labOrders.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="w-12 px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedLabOrders.size === labOrders.length && labOrders.length > 0}
                            onChange={selectAllLabOrders}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium">Service Name</th>
                        <th className="px-3 py-2 text-left font-medium">Details / Reason</th>
                        <th className="px-3 py-2 text-left font-medium">Order Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {labOrders.map((order, index) => (
                        <tr
                          key={index}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedLabOrders.has(index) ? "bg-blue-50" : ""
                          }`}
                          onClick={() => toggleLabOrder(index)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedLabOrders.has(index)}
                              onChange={() => toggleLabOrder(index)}
                              className="rounded border-gray-300"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">{order.testName}</td>
                          <td className="px-3 py-2 text-gray-600">{order.reason || "-"}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {order.orderTime ? new Date(order.orderTime).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedLabOrders.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedLabOrders.size} lab order{selectedLabOrders.size !== 1 ? "s" : ""} selected to include in report
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="investigations">Additional Investigations & Lab Results</Label>
              <Textarea
                id="investigations"
                value={formData.investigations}
                onChange={(e) => setFormData({ ...formData, investigations: e.target.value })}
                placeholder="Add any additional lab tests, imaging, or procedures not listed above..."
                rows={3}
              />
            </div>

            {/* Medications Table */}
            {medications.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Medications from Pharmacy Orders ({medications.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllMedications}
                    className="h-7 text-xs"
                  >
                    {selectedMedications.size === medications.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="w-12 px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedMedications.size === medications.length && medications.length > 0}
                            onChange={selectAllMedications}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium">Medicine Name</th>
                        <th className="px-3 py-2 text-left font-medium">Dose</th>
                        <th className="px-3 py-2 text-right font-medium">Price (IQD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {medications.map((med, index) => (
                        <tr
                          key={index}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedMedications.has(index) ? "bg-blue-50" : ""
                          }`}
                          onClick={() => toggleMedication(index)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedMedications.has(index)}
                              onChange={() => toggleMedication(index)}
                              className="rounded border-gray-300"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">{med.name}</td>
                          <td className="px-3 py-2 text-gray-600">{med.dose}</td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {med.price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedMedications.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedMedications.size} medication{selectedMedications.size !== 1 ? "s" : ""} selected to include in report
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="medications">Additional Medications</Label>
              <Textarea
                id="medications"
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                placeholder="Add any additional medications not listed above..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="treatmentPlan">Treatment Plan</Label>
              <Textarea
                id="treatmentPlan"
                value={formData.treatmentPlan}
                onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                placeholder="Recommended treatment and interventions..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prognosis">Prognosis</Label>
                <Select
                  value={formData.prognosis}
                  onValueChange={(value) => setFormData({ ...formData, prognosis: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select prognosis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="guarded">Guarded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="workStatus">Work Status</Label>
                <Select
                  value={formData.workStatus}
                  onValueChange={(value) => setFormData({ ...formData, workStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit_to_work">Fit to Work</SelectItem>
                    <SelectItem value="modified_duties">Modified Duties</SelectItem>
                    <SelectItem value="sick_leave">Sick Leave</SelectItem>
                    <SelectItem value="unfit_to_work">Unfit to Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                id="recommendations"
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                placeholder="Additional recommendations for insurance company..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    reportType: "",
                    insuranceCompany: "",
                    diagnosis: "",
                    clinicalFindings: "",
                    treatmentPlan: "",
                    medications: "",
                    investigations: "",
                    prognosis: "",
                    workStatus: "",
                    recommendations: "",
                  });
                }}
              >
                Clear
              </Button>
              <Button type="submit" disabled={!selectedPatient || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
