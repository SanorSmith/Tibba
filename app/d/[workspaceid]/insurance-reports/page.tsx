"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  const params = useParams();
  const workspaceid = params.workspaceid as string;
  
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
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [savedReportData, setSavedReportData] = useState<any>(null);

  const [formData, setFormData] = useState({
    reportType: "",
    insuranceCompany: "",
    policyNumber: "",
    groupNumber: "",
    policyHolder: "",
    coverageType: "",
    coveragePercentage: "",
    policyEffectiveDate: "",
    policyExpirationDate: "",
    primaryInsurance: "",
    providerName: "",
    providerId: "",
    department: "",
    requestingPhysician: "",
    physicianNPI: "",
    providerPhone: "",
    providerEmail: "",
    diagnosis: "",
    clinicalFindings: "",
    medicalHistory: "",
    currentSymptoms: "",
    diagnosticFindings: "",
    medicalNecessity: "",
    alternativeTreatments: "",
    conservativeTreatments: "",
    treatmentPlan: "",
    medications: "",
    investigations: "",
    supportingDocuments: "",
    estimatedCost: "",
    urgency: "",
    requestedServiceDate: "",
    expectedReviewTime: "",
    authorizationExpiration: "",
    specialConsiderations: "",
    workStatus: "",
    recommendations: "",
    // New fields from sample report
    requestId: "",
    dateSubmitted: "",
    status: "Pending Review",
    priority: "Standard",
    // Service details
    serviceType: "", // lab_order, medication, operation, imaging, other
    cptCode: "",
    serviceDescription: "",
    icd10Code: "",
    diagnosisDescription: "",
    requestedQuantity: "",
    facility: "",
    scheduledDate: "",
    // Cost breakdown
    totalEstimatedCost: "",
    insuranceCoverageAmount: "",
    patientResponsibilityAmount: "",
    // Provider certification
    physicianSignature: "",
    physicianSpecialty: "",
    licenseNumber: "",
    certificationDate: "",
    // Hospital authorization
    hospitalAdministratorSignature: "",
    hospitalAdministratorName: "",
    hospitalAdministratorTitle: "",
    hospitalAuthorizationDate: "",
    // Contact information
    hospitalContactName: "",
    hospitalContactTitle: "",
    hospitalContactPhone: "",
    hospitalContactEmail: "",
    insuranceCompanyContactName: "",
    insuranceCompanyContactPhone: "",
    insuranceCompanyContactEmail: "",
  });

  // Search patients
  const searchPatients = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/d/${workspaceid}/patients?search=${encodeURIComponent(searchQuery)}`);
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
      const res = await fetch(`/api/d/${workspaceid}/patients/${patientId}/clinical-data`);
      if (!res.ok) throw new Error("Failed to fetch patient data");
      
      const data = await res.json();
      console.log("=== CLINICAL DATA RECEIVED ===");
      console.log("Diagnoses:", data.diagnoses);
      console.log("Clinical Findings:", data.clinicalFindings);
      console.log("Lab Orders:", data.labOrders);
      console.log("Medications:", data.medications);
      
      // Set medications and lab orders
      setMedications(data.medications || []);
      setSelectedMedications(new Set());
      setLabOrders(data.labOrders || []);
      setSelectedLabOrders(new Set());
      
      // Format diagnosis as bullet list if it's an array
      const formattedDiagnosis = Array.isArray(data.diagnoses)
        ? data.diagnoses.map((d: string) => d.trim()).filter(Boolean).join("\n• ")
        : String(data.diagnoses || "").trim();
      
      // Format clinical findings - clean up any pipe-separated or messy formats
      let formattedClinicalFindings = data.clinicalFindings || "";
      if (typeof formattedClinicalFindings === 'string' && formattedClinicalFindings.includes('|')) {
        // Parse pipe-separated format
        const parts = formattedClinicalFindings.split('|').map((p: string) => p.trim());
        const findingsObj: Record<string, string> = {};
        parts.forEach((part: string) => {
          const [key, ...valueParts] = part.split(':');
          if (key && valueParts.length > 0) {
            findingsObj[key.trim()] = valueParts.join(':').trim();
          }
        });
        
        // Format as clean text
        formattedClinicalFindings = Object.entries(findingsObj)
          .filter(([_, value]) => value && value !== '')
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
      }
      
      // Pre-populate form with existing data
      const newFormData = {
        ...formData,
        diagnosis: formattedDiagnosis ? `• ${formattedDiagnosis}` : "",
        clinicalFindings: formattedClinicalFindings,
        medications: "",
        investigations: data.investigations || "",
        treatmentPlan: data.treatmentPlan || "",
        medicalHistory: "",
        currentSymptoms: "",
        diagnosticFindings: "",
        medicalNecessity: "",
        alternativeTreatments: "",
        conservativeTreatments: "",
        supportingDocuments: "",
        estimatedCost: "",
        urgency: "",
        requestedServiceDate: "",
        expectedReviewTime: "",
        authorizationExpiration: "",
        specialConsiderations: "",
      };
      console.log("=== NEW FORM DATA ===");
      console.log("New diagnosis:", newFormData.diagnosis);
      console.log("New clinicalFindings:", newFormData.clinicalFindings);
      setFormData(newFormData);
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
    const filteredLabOrders = labOrders.filter((order) => !order.testName?.startsWith('Medication:'));
    const filteredIndices = filteredLabOrders.map((_, index) => labOrders.indexOf(filteredLabOrders[index]));
    
    if (selectedLabOrders.size === filteredLabOrders.length) {
      setSelectedLabOrders(new Set());
    } else {
      setSelectedLabOrders(new Set(filteredIndices));
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

      const res = await fetch(`/api/d/${workspaceid}/insurance-reports`, {
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

      const data = await res.json();
      setCreatedReportId(data.reportId);
      
      // Save report data for PDF generation before resetting form
      setSavedReportData({
        ...formData,
        investigations: combinedInvestigations,
        medications: combinedMedications,
        patient: selectedPatient,
      });
      
      setMessage({ type: "success", text: "Insurance report created successfully! You can now print it as PDF." });
      // Reset form
      setFormData({
        reportType: "",
        insuranceCompany: "",
        policyNumber: "",
        groupNumber: "",
        policyHolder: "",
        coverageType: "",
        coveragePercentage: "",
        policyEffectiveDate: "",
        policyExpirationDate: "",
        primaryInsurance: "",
        providerName: "",
        providerId: "",
        department: "",
        requestingPhysician: "",
        physicianNPI: "",
        providerPhone: "",
        providerEmail: "",
        diagnosis: "",
        clinicalFindings: "",
        medicalHistory: "",
        currentSymptoms: "",
        diagnosticFindings: "",
        medicalNecessity: "",
        alternativeTreatments: "",
        conservativeTreatments: "",
        treatmentPlan: "",
        medications: "",
        investigations: "",
        supportingDocuments: "",
        estimatedCost: "",
        urgency: "",
        requestedServiceDate: "",
        expectedReviewTime: "",
        authorizationExpiration: "",
        specialConsiderations: "",
        workStatus: "",
        recommendations: "",
        // New fields from sample report
        requestId: "",
        dateSubmitted: "",
        status: "Pending Review",
        priority: "Standard",
        // Service details
        serviceType: "",
        cptCode: "",
        serviceDescription: "",
        icd10Code: "",
        diagnosisDescription: "",
        requestedQuantity: "",
        facility: "",
        scheduledDate: "",
        // Cost breakdown
        totalEstimatedCost: "",
        insuranceCoverageAmount: "",
        patientResponsibilityAmount: "",
        // Provider certification
        physicianSignature: "",
        physicianSpecialty: "",
        licenseNumber: "",
        certificationDate: "",
        // Hospital authorization
        hospitalAdministratorSignature: "",
        hospitalAdministratorName: "",
        hospitalAdministratorTitle: "",
        hospitalAuthorizationDate: "",
        // Contact information
        hospitalContactName: "",
        hospitalContactTitle: "",
        hospitalContactPhone: "",
        hospitalContactEmail: "",
        insuranceCompanyContactName: "",
        insuranceCompanyContactPhone: "",
        insuranceCompanyContactEmail: "",
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

  const handlePrintPDF = () => {
    if (!createdReportId || !savedReportData) return;
    
    const reportData = savedReportData;
    const patient = reportData.patient;
    
    // Create a printable version of the report
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Insurance Pre-Approval Request - ${patient.firstname} ${patient.lastname}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
            background: white;
          }
          .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 15mm;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #2c5282;
          }
          .header h1 {
            font-size: 20px;
            color: #2c5282;
            margin-bottom: 3px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header p {
            font-size: 11px;
            color: #718096;
          }
          .section {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
          }
          .section:last-child {
            border-bottom: none;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            color: #2c5282;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: #f7fafc;
            padding: 8px;
            border-left: 3px solid #2c5282;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 8px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-weight: 600;
            color: #4a5568;
            font-size: 9px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .info-value {
            color: #2d3748;
            font-size: 10px;
          }
          .content-text {
            color: #2d3748;
            font-size: 10px;
            line-height: 1.6;
            white-space: pre-wrap;
            margin-top: 8px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 9px;
          }
          .table th,
          .table td {
            padding: 6px 8px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          .table th {
            background: #edf2f7;
            font-weight: 600;
            color: #4a5568;
            text-transform: uppercase;
          }
          .table td {
            color: #2d3748;
          }
          .signature-section {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
          }
          .signature-line {
            margin-top: 30px;
            border-top: 1px solid #333;
            width: 200px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 9px;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .container {
              margin: 0;
              padding: 10mm;
              max-width: none;
            }
          }
          @page {
            margin: 10mm;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Insurance Pre-Approval Request</h1>
            <p>Pre-Authorization & Clinical Documentation</p>
          </div>

          <div class="section">
            <div class="section-title">Pre-Approval Request Details</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Request ID</div>
                <div class="info-value">${reportData.requestId || createdReportId || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date Submitted</div>
                <div class="info-value">${reportData.dateSubmitted || new Date().toLocaleDateString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">${reportData.status || 'Pending Review'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Priority</div>
                <div class="info-value">${reportData.priority || 'Standard'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Report Type</div>
                <div class="info-value">${reportData.reportType || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Patient Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Patient Name</div>
                <div class="info-value">${patient.firstname} ${patient.lastname}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Patient ID</div>
                <div class="info-value">${patient.patientid || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date of Birth</div>
                <div class="info-value">${patient.dateofbirth || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Gender</div>
                <div class="info-value">${patient.gender || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">${patient.phone || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${patient.email || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Insurance Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Insurance Company</div>
                <div class="info-value">${reportData.insuranceCompany || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Policy Number</div>
                <div class="info-value">${reportData.policyNumber || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Group Number</div>
                <div class="info-value">${reportData.groupNumber || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Policy Holder</div>
                <div class="info-value">${reportData.policyHolder || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Coverage Type</div>
                <div class="info-value">${reportData.coverageType || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Coverage Percentage</div>
                <div class="info-value">${reportData.coveragePercentage || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Policy Effective Date</div>
                <div class="info-value">${reportData.policyEffectiveDate || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Policy Expiration Date</div>
                <div class="info-value">${reportData.policyExpirationDate || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Requesting Provider Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Provider Name</div>
                <div class="info-value">${reportData.providerName || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Provider ID</div>
                <div class="info-value">${reportData.providerId || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Department</div>
                <div class="info-value">${reportData.department || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Requesting Physician</div>
                <div class="info-value">${reportData.requestingPhysician || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Physician NPI</div>
                <div class="info-value">${reportData.physicianNPI || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Provider Phone</div>
                <div class="info-value">${reportData.providerPhone || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Provider Email</div>
                <div class="info-value">${reportData.providerEmail || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Requested Services</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Service Type</div>
                <div class="info-value">${reportData.serviceType || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">CPT Code</div>
                <div class="info-value">${reportData.cptCode || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">ICD-10 Diagnosis Code</div>
                <div class="info-value">${reportData.icd10Code || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Requested Quantity</div>
                <div class="info-value">${reportData.requestedQuantity || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Facility</div>
                <div class="info-value">${reportData.facility || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Scheduled Date</div>
                <div class="info-value">${reportData.scheduledDate || 'N/A'}</div>
              </div>
            </div>
            <div class="content-text" style="margin-top: 10px;">
              <div class="info-label">Service Description:</div>
              <div class="content-text">${reportData.serviceDescription || 'N/A'}</div>
            </div>
            <div class="content-text" style="margin-top: 8px;">
              <div class="info-label">Diagnosis Description:</div>
              <div class="content-text">${reportData.diagnosisDescription || 'N/A'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Diagnosis</div>
            <div class="content-text">${reportData.diagnosis || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Clinical Findings</div>
            <div class="content-text">${reportData.clinicalFindings || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Medical History</div>
            <div class="content-text">${reportData.medicalHistory || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Current Symptoms</div>
            <div class="content-text">${reportData.currentSymptoms || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Diagnostic Findings</div>
            <div class="content-text">${reportData.diagnosticFindings || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Medical Necessity</div>
            <div class="content-text">${reportData.medicalNecessity || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Alternative Treatments Considered</div>
            <div class="content-text">${reportData.alternativeTreatments || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Conservative Treatments Tried</div>
            <div class="content-text">${reportData.conservativeTreatments || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Treatment Plan</div>
            <div class="content-text">${reportData.treatmentPlan || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Medications</div>
            <div class="content-text">${reportData.medications || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Investigations & Lab Results</div>
            <div class="content-text">${reportData.investigations || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Supporting Documentation</div>
            <div class="content-text">${reportData.supportingDocuments || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Cost Breakdown</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Estimated Cost</td>
                  <td>${reportData.totalEstimatedCost || reportData.estimatedCost || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Insurance Coverage</td>
                  <td>${reportData.insuranceCoverageAmount || reportData.coveragePercentage || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Patient Responsibility</td>
                  <td>${reportData.patientResponsibilityAmount || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Request Timeline</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Urgency</div>
                <div class="info-value">${reportData.urgency || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Requested Service Date</div>
                <div class="info-value">${reportData.requestedServiceDate || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Expected Review Time</div>
                <div class="info-value">${reportData.expectedReviewTime || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Authorization Expiration</div>
                <div class="info-value">${reportData.authorizationExpiration || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Special Considerations</div>
            <div class="content-text">${reportData.specialConsiderations || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Provider Certification</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Physician Signature</div>
                <div class="info-value">${reportData.physicianSignature || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Specialty</div>
                <div class="info-value">${reportData.physicianSpecialty || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">License Number</div>
                <div class="info-value">${reportData.licenseNumber || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Certification Date</div>
                <div class="info-value">${reportData.certificationDate || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Hospital Authorization</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Administrator Signature</div>
                <div class="info-value">${reportData.hospitalAdministratorSignature || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Administrator Name</div>
                <div class="info-value">${reportData.hospitalAdministratorName || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Title</div>
                <div class="info-value">${reportData.hospitalAdministratorTitle || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Authorization Date</div>
                <div class="info-value">${reportData.hospitalAuthorizationDate || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contact Information</div>
            <div class="content-text">
              <strong>Hospital Contact:</strong><br>
              Name: ${reportData.hospitalContactName || 'N/A'}<br>
              Title: ${reportData.hospitalContactTitle || 'N/A'}<br>
              Phone: ${reportData.hospitalContactPhone || 'N/A'}<br>
              Email: ${reportData.hospitalContactEmail || 'N/A'}
            </div>
            <div class="content-text" style="margin-top: 10px;">
              <strong>Insurance Company Contact:</strong><br>
              Name: ${reportData.insuranceCompanyContactName || 'N/A'}<br>
              Phone: ${reportData.insuranceCompanyContactPhone || 'N/A'}<br>
              Email: ${reportData.insuranceCompanyContactEmail || 'N/A'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Work Status</div>
            <div class="content-text">${reportData.workStatus || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Recommendations</div>
            <div class="content-text">${reportData.recommendations || 'N/A'}</div>
          </div>

          <div class="signature-section">
            <div class="section-title">Provider Certification</div>
            <div class="content-text">
              I certify that the requested services are medically necessary for the treatment of this patient's condition. The information provided is accurate and complete to the best of my knowledge.
            </div>
            <div class="signature-line"></div>
            <div class="info-value">${reportData.requestingPhysician || 'Physician Signature'}</div>
            <div class="info-value">Date: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="footer">
            <p>This document is confidential and contains protected health information.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(reportContent);
    printWindow.document.close();
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
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            {message.type === "success" && createdReportId && (
              <Button onClick={handlePrintPDF} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Print PDF
              </Button>
            )}
          </div>
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
            <CardTitle>Pre-Approval Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requestId">Request ID</Label>
                <Input
                  id="requestId"
                  value={formData.requestId}
                  onChange={(e) => setFormData({ ...formData, requestId: e.target.value })}
                  placeholder="e.g., PA-2024-005678"
                />
              </div>

              <div>
                <Label htmlFor="dateSubmitted">Date Submitted</Label>
                <Input
                  id="dateSubmitted"
                  type="date"
                  value={formData.dateSubmitted}
                  onChange={(e) => setFormData({ ...formData, dateSubmitted: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending Review">Pending Review</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Denied">Denied</SelectItem>
                    <SelectItem value="Approved with Conditions">Approved with Conditions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

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

            {/* Insurance Information */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Insurance Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="policyNumber">Policy Number</Label>
                  <Input
                    id="policyNumber"
                    value={formData.policyNumber}
                    onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                    placeholder="POL-2024-789456"
                  />
                </div>
                <div>
                  <Label htmlFor="groupNumber">Group Number</Label>
                  <Input
                    id="groupNumber"
                    value={formData.groupNumber}
                    onChange={(e) => setFormData({ ...formData, groupNumber: e.target.value })}
                    placeholder="GRP-12345"
                  />
                </div>
                <div>
                  <Label htmlFor="policyHolder">Policy Holder</Label>
                  <Input
                    id="policyHolder"
                    value={formData.policyHolder}
                    onChange={(e) => setFormData({ ...formData, policyHolder: e.target.value })}
                    placeholder="Patient name or other"
                  />
                </div>
                <div>
                  <Label htmlFor="coverageType">Coverage Type</Label>
                  <Input
                    id="coverageType"
                    value={formData.coverageType}
                    onChange={(e) => setFormData({ ...formData, coverageType: e.target.value })}
                    placeholder="Comprehensive Health Plan"
                  />
                </div>
                <div>
                  <Label htmlFor="coveragePercentage">Coverage Percentage</Label>
                  <Input
                    id="coveragePercentage"
                    value={formData.coveragePercentage}
                    onChange={(e) => setFormData({ ...formData, coveragePercentage: e.target.value })}
                    placeholder="85%"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryInsurance">Primary Insurance</Label>
                  <Select
                    value={formData.primaryInsurance}
                    onValueChange={(value) => setFormData({ ...formData, primaryInsurance: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="policyEffectiveDate">Policy Effective Date</Label>
                  <Input
                    id="policyEffectiveDate"
                    type="date"
                    value={formData.policyEffectiveDate}
                    onChange={(e) => setFormData({ ...formData, policyEffectiveDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="policyExpirationDate">Policy Expiration Date</Label>
                  <Input
                    id="policyExpirationDate"
                    type="date"
                    value={formData.policyExpirationDate}
                    onChange={(e) => setFormData({ ...formData, policyExpirationDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Provider Information */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Requesting Provider Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="providerName">Provider Name</Label>
                  <Input
                    id="providerName"
                    value={formData.providerName}
                    onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                    placeholder="City General Hospital"
                  />
                </div>
                <div>
                  <Label htmlFor="providerId">Provider ID</Label>
                  <Input
                    id="providerId"
                    value={formData.providerId}
                    onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                    placeholder="HOSP-001"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Cardiology"
                  />
                </div>
                <div>
                  <Label htmlFor="requestingPhysician">Requesting Physician</Label>
                  <Input
                    id="requestingPhysician"
                    value={formData.requestingPhysician}
                    onChange={(e) => setFormData({ ...formData, requestingPhysician: e.target.value })}
                    placeholder="Dr. Fatima Hassan"
                  />
                </div>
                <div>
                  <Label htmlFor="physicianNPI">Physician NPI</Label>
                  <Input
                    id="physicianNPI"
                    value={formData.physicianNPI}
                    onChange={(e) => setFormData({ ...formData, physicianNPI: e.target.value })}
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="providerPhone">Provider Phone</Label>
                  <Input
                    id="providerPhone"
                    value={formData.providerPhone}
                    onChange={(e) => setFormData({ ...formData, providerPhone: e.target.value })}
                    placeholder="+964 1 234 5678"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="providerEmail">Provider Email</Label>
                  <Input
                    id="providerEmail"
                    type="email"
                    value={formData.providerEmail}
                    onChange={(e) => setFormData({ ...formData, providerEmail: e.target.value })}
                    placeholder="cardiology@cityhospital.iq"
                  />
                </div>
              </div>
            </div>

            {/* Services Table (Lab Orders, X-rays, Procedures, etc.) */}
            {labOrders.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Clinical Services from EHR ({labOrders.filter(o => !o.testName?.startsWith('Medication:')).length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllLabOrders}
                    className="h-7 text-xs"
                  >
                    {selectedLabOrders.size === labOrders.filter(o => !o.testName?.startsWith('Medication:')).length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="w-12 px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedLabOrders.size === labOrders.filter(o => !o.testName?.startsWith('Medication:')).length && labOrders.filter(o => !o.testName?.startsWith('Medication:')).length > 0}
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
                      {labOrders
                        .filter((order) => !order.testName?.startsWith('Medication:'))
                        .map((order, index) => {
                          // Parse pipe-separated details for better display
                          let parsedDetails = order.reason || "-";
                          if (order.reason && order.reason.includes('|')) {
                            const details = order.reason.split('|').map((d: string) => d.trim());
                            const detailsObj: Record<string, string> = {};
                            details.forEach((d: string) => {
                              const [key, ...valueParts] = d.split(':');
                              if (key && valueParts.length > 0) {
                                detailsObj[key.trim()] = valueParts.join(':').trim();
                              }
                            });
                            
                            // Format the details nicely
                            const formattedDetails = Object.entries(detailsObj)
                              .filter(([key, value]) => value && value !== '' && key !== 'Status' && key !== 'Urgency')
                              .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                              .join('<br>');
                            
                            if (formattedDetails) {
                              parsedDetails = formattedDetails;
                            }
                          }

                          return (
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
                              <td className="px-3 py-2 text-gray-600" dangerouslySetInnerHTML={{ __html: parsedDetails }} />
                              <td className="px-3 py-2 text-gray-600">
                                {order.orderTime ? new Date(order.orderTime).toLocaleDateString() : "-"}
                              </td>
                            </tr>
                          );
                        })}
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

            {/* Requested Services */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Requested Services</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="serviceType">Service Type *</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab_order">Lab Order</SelectItem>
                      <SelectItem value="medication">Medication</SelectItem>
                      <SelectItem value="operation">Operation/Procedure</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                      <SelectItem value="therapy">Therapy</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cptCode">CPT Code</Label>
                    <Input
                      id="cptCode"
                      value={formData.cptCode}
                      onChange={(e) => setFormData({ ...formData, cptCode: e.target.value })}
                      placeholder="e.g., 93458"
                    />
                  </div>
                  <div>
                    <Label htmlFor="icd10Code">ICD-10 Diagnosis Code</Label>
                    <Input
                      id="icd10Code"
                      value={formData.icd10Code}
                      onChange={(e) => setFormData({ ...formData, icd10Code: e.target.value })}
                      placeholder="e.g., I25.10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="serviceDescription">Service Description</Label>
                  <Textarea
                    id="serviceDescription"
                    value={formData.serviceDescription}
                    onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                    placeholder="Detailed description of the requested service..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="diagnosisDescription">Diagnosis Description</Label>
                  <Textarea
                    id="diagnosisDescription"
                    value={formData.diagnosisDescription}
                    onChange={(e) => setFormData({ ...formData, diagnosisDescription: e.target.value })}
                    placeholder="Description of the diagnosis..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="requestedQuantity">Requested Quantity</Label>
                    <Input
                      id="requestedQuantity"
                      value={formData.requestedQuantity}
                      onChange={(e) => setFormData({ ...formData, requestedQuantity: e.target.value })}
                      placeholder="e.g., 1 procedure"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facility">Facility</Label>
                    <Input
                      id="facility"
                      value={formData.facility}
                      onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                      placeholder="e.g., City General Hospital Catheterization Lab"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="scheduledDate">Scheduled Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Clinical Justification */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Clinical Justification</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="medicalHistory">Medical History</Label>
                  <Textarea
                    id="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                    placeholder="Patient's medical history..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="currentSymptoms">Current Symptoms</Label>
                  <Textarea
                    id="currentSymptoms"
                    value={formData.currentSymptoms}
                    onChange={(e) => setFormData({ ...formData, currentSymptoms: e.target.value })}
                    placeholder="Current symptoms and complaints..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="diagnosticFindings">Diagnostic Findings</Label>
                  <Textarea
                    id="diagnosticFindings"
                    value={formData.diagnosticFindings}
                    onChange={(e) => setFormData({ ...formData, diagnosticFindings: e.target.value })}
                    placeholder="ECG, stress test, lab results, etc..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="medicalNecessity">Medical Necessity</Label>
                  <Textarea
                    id="medicalNecessity"
                    value={formData.medicalNecessity}
                    onChange={(e) => setFormData({ ...formData, medicalNecessity: e.target.value })}
                    placeholder="Explain why the requested services are medically necessary..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="alternativeTreatments">Alternative Treatments Considered</Label>
                  <Textarea
                    id="alternativeTreatments"
                    value={formData.alternativeTreatments}
                    onChange={(e) => setFormData({ ...formData, alternativeTreatments: e.target.value })}
                    placeholder="Alternative treatments that were considered and why they were not chosen..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="conservativeTreatments">Conservative Treatments Tried</Label>
                  <Textarea
                    id="conservativeTreatments"
                    value={formData.conservativeTreatments}
                    onChange={(e) => setFormData({ ...formData, conservativeTreatments: e.target.value })}
                    placeholder="Conservative treatments that have been attempted..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="treatmentPlan">Treatment Plan</Label>
              <Textarea
                id="treatmentPlan"
                value={formData.treatmentPlan}
                onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                placeholder="Proposed treatment plan..."
                rows={3}
              />
            </div>

            {/* Additional Information */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Additional Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedCost">Estimated Cost</Label>
                  <Input
                    id="estimatedCost"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    placeholder="$1,750.00"
                  />
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="requestedServiceDate">Requested Service Date</Label>
                  <Input
                    id="requestedServiceDate"
                    type="date"
                    value={formData.requestedServiceDate}
                    onChange={(e) => setFormData({ ...formData, requestedServiceDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expectedReviewTime">Expected Review Time</Label>
                  <Input
                    id="expectedReviewTime"
                    value={formData.expectedReviewTime}
                    onChange={(e) => setFormData({ ...formData, expectedReviewTime: e.target.value })}
                    placeholder="3-5 business days"
                  />
                </div>
                <div>
                  <Label htmlFor="authorizationExpiration">Authorization Expiration</Label>
                  <Input
                    id="authorizationExpiration"
                    type="date"
                    value={formData.authorizationExpiration}
                    onChange={(e) => setFormData({ ...formData, authorizationExpiration: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="supportingDocuments">Supporting Documentation</Label>
                <Textarea
                  id="supportingDocuments"
                  value={formData.supportingDocuments}
                  onChange={(e) => setFormData({ ...formData, supportingDocuments: e.target.value })}
                  placeholder="List of attached documents (ECG reports, lab results, clinical notes, etc.)..."
                  rows={3}
                />
              </div>

              {/* Cost Breakdown */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3">Cost Breakdown</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="totalEstimatedCost">Total Estimated Cost</Label>
                    <Input
                      id="totalEstimatedCost"
                      value={formData.totalEstimatedCost}
                      onChange={(e) => setFormData({ ...formData, totalEstimatedCost: e.target.value })}
                      placeholder="e.g., $1,750.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="insuranceCoverageAmount">Insurance Coverage Amount</Label>
                    <Input
                      id="insuranceCoverageAmount"
                      value={formData.insuranceCoverageAmount}
                      onChange={(e) => setFormData({ ...formData, insuranceCoverageAmount: e.target.value })}
                      placeholder="e.g., $1,487.50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patientResponsibilityAmount">Patient Responsibility Amount</Label>
                    <Input
                      id="patientResponsibilityAmount"
                      value={formData.patientResponsibilityAmount}
                      onChange={(e) => setFormData({ ...formData, patientResponsibilityAmount: e.target.value })}
                      placeholder="e.g., $262.50"
                    />
                  </div>
                </div>
              </div>

              {/* Provider Certification */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3">Provider Certification</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="physicianSignature">Physician Signature</Label>
                    <Input
                      id="physicianSignature"
                      value={formData.physicianSignature}
                      onChange={(e) => setFormData({ ...formData, physicianSignature: e.target.value })}
                      placeholder="Dr. Fatima Hassan, MD"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="physicianSpecialty">Specialty</Label>
                      <Input
                        id="physicianSpecialty"
                        value={formData.physicianSpecialty}
                        onChange={(e) => setFormData({ ...formData, physicianSpecialty: e.target.value })}
                        placeholder="Cardiology"
                      />
                    </div>
                    <div>
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        placeholder="IRAQ-CARD-12345"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="certificationDate">Certification Date</Label>
                    <Input
                      id="certificationDate"
                      type="date"
                      value={formData.certificationDate}
                      onChange={(e) => setFormData({ ...formData, certificationDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Hospital Authorization */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3">Hospital Authorization</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hospitalAdministratorSignature">Administrator Signature</Label>
                    <Input
                      id="hospitalAdministratorSignature"
                      value={formData.hospitalAdministratorSignature}
                      onChange={(e) => setFormData({ ...formData, hospitalAdministratorSignature: e.target.value })}
                      placeholder="Omar Khalid"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hospitalAdministratorName">Administrator Name</Label>
                      <Input
                        id="hospitalAdministratorName"
                        value={formData.hospitalAdministratorName}
                        onChange={(e) => setFormData({ ...formData, hospitalAdministratorName: e.target.value })}
                        placeholder="Omar Khalid"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hospitalAdministratorTitle">Title</Label>
                      <Input
                        id="hospitalAdministratorTitle"
                        value={formData.hospitalAdministratorTitle}
                        onChange={(e) => setFormData({ ...formData, hospitalAdministratorTitle: e.target.value })}
                        placeholder="Medical Director"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="hospitalAuthorizationDate">Authorization Date</Label>
                    <Input
                      id="hospitalAuthorizationDate"
                      type="date"
                      value={formData.hospitalAuthorizationDate}
                      onChange={(e) => setFormData({ ...formData, hospitalAuthorizationDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Hospital Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hospitalContactName">Contact Name</Label>
                        <Input
                          id="hospitalContactName"
                          value={formData.hospitalContactName}
                          onChange={(e) => setFormData({ ...formData, hospitalContactName: e.target.value })}
                          placeholder="Sarah Ahmed"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hospitalContactTitle">Title</Label>
                        <Input
                          id="hospitalContactTitle"
                          value={formData.hospitalContactTitle}
                          onChange={(e) => setFormData({ ...formData, hospitalContactTitle: e.target.value })}
                          placeholder="Insurance Coordinator"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hospitalContactPhone">Phone</Label>
                        <Input
                          id="hospitalContactPhone"
                          value={formData.hospitalContactPhone}
                          onChange={(e) => setFormData({ ...formData, hospitalContactPhone: e.target.value })}
                          placeholder="+964 1 234 5678 ext. 123"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hospitalContactEmail">Email</Label>
                        <Input
                          id="hospitalContactEmail"
                          type="email"
                          value={formData.hospitalContactEmail}
                          onChange={(e) => setFormData({ ...formData, hospitalContactEmail: e.target.value })}
                          placeholder="insurance@cityhospital.iq"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Insurance Company Contact</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="insuranceCompanyContactName">Contact Name</Label>
                        <Input
                          id="insuranceCompanyContactName"
                          value={formData.insuranceCompanyContactName}
                          onChange={(e) => setFormData({ ...formData, insuranceCompanyContactName: e.target.value })}
                          placeholder="Insurance Contact"
                        />
                      </div>
                      <div>
                        <Label htmlFor="insuranceCompanyContactPhone">Phone</Label>
                        <Input
                          id="insuranceCompanyContactPhone"
                          value={formData.insuranceCompanyContactPhone}
                          onChange={(e) => setFormData({ ...formData, insuranceCompanyContactPhone: e.target.value })}
                          placeholder="Insurance Phone"
                        />
                      </div>
                      <div>
                        <Label htmlFor="insuranceCompanyContactEmail">Email</Label>
                        <Input
                          id="insuranceCompanyContactEmail"
                          type="email"
                          value={formData.insuranceCompanyContactEmail}
                          onChange={(e) => setFormData({ ...formData, insuranceCompanyContactEmail: e.target.value })}
                          placeholder="insurance@company.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="specialConsiderations">Special Considerations</Label>
                <Textarea
                  id="specialConsiderations"
                  value={formData.specialConsiderations}
                  onChange={(e) => setFormData({ ...formData, specialConsiderations: e.target.value })}
                  placeholder="Any special considerations or risk factors... (e.g., Work Status: Patient is employed and may require work restrictions based on findings)"
                  rows={3}
                />
              </div>
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
                    policyNumber: "",
                    groupNumber: "",
                    policyHolder: "",
                    coverageType: "",
                    coveragePercentage: "",
                    policyEffectiveDate: "",
                    policyExpirationDate: "",
                    primaryInsurance: "",
                    providerName: "",
                    providerId: "",
                    department: "",
                    requestingPhysician: "",
                    physicianNPI: "",
                    providerPhone: "",
                    providerEmail: "",
                    diagnosis: "",
                    clinicalFindings: "",
                    medicalHistory: "",
                    currentSymptoms: "",
                    diagnosticFindings: "",
                    medicalNecessity: "",
                    alternativeTreatments: "",
                    conservativeTreatments: "",
                    treatmentPlan: "",
                    medications: "",
                    investigations: "",
                    supportingDocuments: "",
                    estimatedCost: "",
                    urgency: "",
                    requestedServiceDate: "",
                    expectedReviewTime: "",
                    authorizationExpiration: "",
                    specialConsiderations: "",
                    workStatus: "",
                    recommendations: "",
                    // New fields from sample report
                    requestId: "",
                    dateSubmitted: "",
                    status: "Pending Review",
                    priority: "Standard",
                    // Service details
                    serviceType: "",
                    cptCode: "",
                    serviceDescription: "",
                    icd10Code: "",
                    diagnosisDescription: "",
                    requestedQuantity: "",
                    facility: "",
                    scheduledDate: "",
                    // Cost breakdown
                    totalEstimatedCost: "",
                    insuranceCoverageAmount: "",
                    patientResponsibilityAmount: "",
                    // Provider certification
                    physicianSignature: "",
                    physicianSpecialty: "",
                    licenseNumber: "",
                    certificationDate: "",
                    // Hospital authorization
                    hospitalAdministratorSignature: "",
                    hospitalAdministratorName: "",
                    hospitalAdministratorTitle: "",
                    hospitalAuthorizationDate: "",
                    // Contact information
                    hospitalContactName: "",
                    hospitalContactTitle: "",
                    hospitalContactPhone: "",
                    hospitalContactEmail: "",
                    insuranceCompanyContactName: "",
                    insuranceCompanyContactPhone: "",
                    insuranceCompanyContactEmail: "",
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
