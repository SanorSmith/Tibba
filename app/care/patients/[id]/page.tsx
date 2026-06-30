"use client";

import { useState, useEffect, ComponentProps } from "react";
import { useParams } from "next/navigation";
import { useCareWorkspace } from "@/components/care/care-workspace-context";
import { CareHeader } from "@/components/care/care-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Activity, Thermometer, Heart, Wind, Droplets, FlaskConical, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import type { TriageDashboardRecord } from "@/app/api/d/[workspaceid]/triage/route";
import type { VitalSignsRecord } from "@/lib/openehr/openehr";
import EnhancedLabOrderFormMultiple from "@/components/shared/EnhancedLabOrderFormMultiple";
import { getRecommendationsByServiceName, type OrderRecommendations, type TestRecommendation } from "@/lib/lims/test-recommendations";

interface LabAnalyte {
  analyte_name: string;
  analyte_code?: string;
  result_value: string | number;
  result_unit?: string;
  reference_range?: string;
  result_status: string;
  result_flag?: string;
  samplenumber?: string;
}

interface LabResult {
  composition_uid: string;
  recorded_time: string;
  test_name: string;
  protocol?: string;
  specimen_type?: string;
  specimen_collection_time?: string;
  specimen_received_time?: string;
  specimen_id?: string;
  overall_test_status: string;
  clinical_information_provided?: string;
  test_results: LabAnalyte[];
  conclusion?: string;
  test_diagnosis?: string;
  laboratory_name: string;
  reported_by?: string;
  verified_by?: string;
  report_date: string;
  source?: string;
  price?: number;
  currency?: string;
  samples?: Array<{
    sampleid: string;
    samplenumber: string;
    sampletype: string;
    collectiondate: string | null;
    barcode: string | null;
    labcategory: string | null;
  }>;
}

interface ImagingResult {
  composition_uid: string;
  recorded_time: string;
  study_name: string;
  modality: string;
  body_part: string;
  finding_summary: string;
  impression: string;
  radiologist: string;
  report_date: string;
  overall_status: string;
  price: number;
  currency?: string;
  images?: { image_uid: string; description: string }[];
}

interface ECGResult {
  composition_uid: string;
  recorded_time: string;
  test_name: string;
  heart_rate: number;
  rhythm: string;
  pr_interval: string;
  qrs_duration: string;
  qt_interval: string;
  axis: string;
  findings: string;
  interpretation: string;
  reported_by: string;
  report_date: string;
  overall_status: string;
  price: number;
  currency?: string;
  ecg_image?: string;
}

interface LabOrder {
  composition_uid: string;
  recorded_time: string;
  service_name: string;
  service_type_code: string;
  service_type_value: string;
  description: string;
  clinical_indication: string;
  urgency: string;
  requested_date: string;
  requesting_provider: string;
  receiving_provider: string;
  request_status: string;
  timing: string;
  request_id: string;
  narrative: string;
}

interface AccessionSample {
  sampleid: string;
  samplenumber: string;
  accessionnumber: string | null;
  sampletype: string;
  containertype: string | null;
  currentstatus: string;
  collectiondate: string | null;
  accessionedat: string | null;
  orderid: string | null;
  openehrrequestid: string | null;
  patientid: string | null;
  tests: string[] | null;
  collectorname: string | null;
}

interface Patient {
  patientid: string;
  firstname: string;
  lastname: string;
  middlename: string | null;
  nationalid: string | null;
  dateofbirth: string | null;
  gender: string | null;
  bloodgroup: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  ehrid: string | null;
  medicalhistory: unknown;
  createdat: string;
  updatedat: string;
  workspaceid: string | null;
  workspaceName: string | null;
}

function ageFromDob(dob: string | null) {
  if (!dob) return 0;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function getLocalDateTimeString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fallbackSampleType(serviceName: string) {
  const s = serviceName.toLowerCase();
  if (s.includes("urine")) return "urine";
  if (s.includes("stool") || s.includes("fecal")) return "stool";
  if (s.includes("sputum")) return "sputum";
  if (s.includes("saliva")) return "saliva";
  if (s.includes("csf") || s.includes("cerebrospinal")) return "csf";
  if (s.includes("tissue") || s.includes("biopsy")) return "tissue";
  if (s.includes("swab")) return "swab";
  return "blood";
}

function fallbackContainer(sampleType: string) {
  const map: Record<string, string> = {
    blood: "EDTA Tube",
    serum: "Serum Separator Tube",
    plasma: "Heparin Tube",
    urine: "Sterile Container",
    stool: "Stool Container",
    sputum: "Sterile Sputum Container",
    swab: "Swab Transport Medium",
    tissue: "Formalin Container",
    csf: "Sterile Tube",
    saliva: "Sterile Container",
  };
  return map[sampleType] || "Other";
}

function getSpecimenGroups(recommendations: TestRecommendation[]) {
  return recommendations.reduce((acc, rec) => {
    const specimen = rec.sampleType || "Not specified";
    if (!acc[specimen]) {
      acc[specimen] = {
        tests: [] as TestRecommendation[],
        containers: new Set<string>(),
        volumes: [] as string[],
        fasting: false,
      };
    }
    acc[specimen].tests.push(rec);
    if (rec.containerType) acc[specimen].containers.add(rec.containerType);
    if (rec.volume) acc[specimen].volumes.push(`${rec.volume} ${rec.volumeUnit}`);
    if (rec.fastingRequired) acc[specimen].fasting = true;
    return acc;
  }, {} as Record<string, { tests: TestRecommendation[]; containers: Set<string>; volumes: string[]; fasting: boolean }>);
}

function getSpecimenGroupsForOrder(order: LabOrder, recs: TestRecommendation[]) {
  if (recs.length > 0) return getSpecimenGroups(recs);
  const fallbackSample = fallbackSampleType(order.service_name);
  const fallbackContainerType = fallbackContainer(fallbackSample);
  return {
    [fallbackSample]: {
      tests: [
        {
          testCode: order.service_name,
          testName: order.service_name,
          sampleType: fallbackSample,
          containerType: fallbackContainerType,
          volume: 0,
          volumeUnit: "mL",
          fastingRequired: false,
          specialInstructions: "",
        } as TestRecommendation,
      ],
      containers: new Set([fallbackContainerType]),
      volumes: [] as string[],
      fasting: false,
    },
  };
}

function triageClasses(level: string) {
  switch (level) {
    case "red":
      return "bg-[#e54b4f]/10 text-[#e54b4f] border-[#e54b4f]/20";
    case "yellow":
      return "bg-[#ffae04]/10 text-[#c78100] border-[#ffae04]/20";
    case "green":
      return "bg-[#22c55e]/10 text-[#15803d] border-[#22c55e]/20";
    default:
      return "";
  }
}

function resultStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "critical":
    case "high":
      return "bg-[#e54b4f]/10 text-[#e54b4f] border-[#e54b4f]/20";
    case "low":
      return "bg-[#ffae04]/10 text-[#c78100] border-[#ffae04]/20";
    case "normal":
      return "bg-[#22c55e]/10 text-[#15803d] border-[#22c55e]/20";
    default:
      return "";
  }
}

export default function EmergencyPatientDashboardPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId } = useCareWorkspace();
  const { data: sessionData } = useSession();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [triageRecords, setTriageRecords] = useState<TriageDashboardRecord[]>([]);
  const [vitals, setVitals] = useState<VitalSignsRecord[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [imagingResults, setImagingResults] = useState<ImagingResult[]>([]);
  const [ecgResults, setEcgResults] = useState<ECGResult[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [accessionSamples, setAccessionSamples] = useState<AccessionSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labOrderModalOpen, setLabOrderModalOpen] = useState(false);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [sampleCollectionModalOpen, setSampleCollectionModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [orderRecommendations, setOrderRecommendations] = useState<OrderRecommendations | null>(null);
  const [sampleCollectionForm, setSampleCollectionForm] = useState({
    sampleNumber: "",
    collectionDate: getLocalDateTimeString(),
    accessionNumber: "",
    collectorName: "",
    currentLocation: "Emergency",
    comments: "",
  });
  const [sampleCollectionSubmitting, setSampleCollectionSubmitting] = useState(false);
  const [sampleCollectionError, setSampleCollectionError] = useState<string | null>(null);
  const [collectedSpecimenTypes, setCollectedSpecimenTypes] = useState<Record<string, { sampleNumber: string; accessionNumber: string }>>({});
  const [currentCollectingSpecimen, setCurrentCollectingSpecimen] = useState<string>("");
  const [alertDialog, setAlertDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning";
  }>({ show: false, title: "", message: "", type: "success" });

  const [vitalsForm, setVitalsForm] = useState({
    temperature: "",
    systolic: "",
    diastolic: "",
    heartRate: "",
    respiratoryRate: "",
    spO2: "",
  });
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false);

  useEffect(() => {
    if (!workspaceId || !params.id) return;

    async function load() {
      try {
        const [
          patientRes,
          triageRes,
          vitalsRes,
          labResultsRes,
          labOrdersRes,
          samplesRes,
        ] = await Promise.all([
          fetch(`/api/d/${workspaceId}/patients/${params.id}`),
          fetch(`/api/d/${workspaceId}/triage`),
          fetch(`/api/d/${workspaceId}/patients/${params.id}/vital-signs?limit=50`),
          fetch(`/api/d/${workspaceId}/patients/${params.id}/lab-results`),
          fetch(`/api/d/${workspaceId}/patients/${params.id}/lab-orders`),
          fetch(`/api/lims/accession?workspaceid=${workspaceId}&patientid=${params.id}&limit=200`),
        ]);

        const patientData = await patientRes.json();
        const triageData = await triageRes.json();
        const vitalsData = await vitalsRes.json();
        const labResultsData = await labResultsRes.json();
        const labOrdersData = await labOrdersRes.json();
        const samplesData = await samplesRes.json();

        if (!patientRes.ok) throw new Error(patientData.error || "Failed to load patient");
        if (!triageRes.ok) throw new Error(triageData.error || "Failed to load assessment records");
        if (!labResultsRes.ok) throw new Error(labResultsData.error || "Failed to load lab results");
        if (!labOrdersRes.ok) throw new Error(labOrdersData.error || "Failed to load lab orders");
        if (!samplesRes.ok) throw new Error(samplesData.error || "Failed to load samples");

        setPatient(patientData.patient);
        setTriageRecords(
          (triageData.records || []).filter(
            (r: TriageDashboardRecord) => r.patientId === params.id
          )
        );
        setVitals(vitalsData.vitalSigns || []);
        setLabResults(labResultsData.labResults || []);
        setImagingResults(labResultsData.imagingResults || []);
        setEcgResults(labResultsData.ecgResults || []);
        setLabOrders(labOrdersData.labOrders || []);
        setAccessionSamples(samplesData.samples || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patient dashboard");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [workspaceId, params.id]);

  async function submitLabOrder(formData: Record<string, unknown>) {
    if (!workspaceId || !params.id) return;
    try {
      const userResponse = await fetch("/api/auth/session");
      const userData = await userResponse.json();
      const currentUser = userData.user;
      const requesting = currentUser?.name || currentUser?.email || "Unknown Provider";
      const orderData = { ...formData, requesting_provider: requesting };

      const res = await fetch(`/api/d/${workspaceId}/patients/${params.id}/test-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testOrder: orderData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create lab order");

      setLabOrderModalOpen(false);
      const [refresh, samplesRefresh] = await Promise.all([
        fetch(`/api/d/${workspaceId}/patients/${params.id}/lab-orders`),
        fetch(`/api/lims/accession?workspaceid=${workspaceId}&patientid=${params.id}&limit=200`),
      ]);
      const refreshData = await refresh.json();
      const samplesRefreshData = await samplesRefresh.json();
      setLabOrders(refreshData.labOrders || []);
      setAccessionSamples(samplesRefreshData.samples || []);
    } catch (err) {
      console.error("Failed to create lab order:", err);
      throw err;
    }
  }

  async function submitVitals() {
    if (!workspaceId || !params.id) return;
    setVitalsSubmitting(true);
    try {
      const res = await fetch(`/api/d/${workspaceId}/patients/${params.id}/vital-signs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: vitalsForm.temperature || undefined,
          systolic: vitalsForm.systolic || undefined,
          diastolic: vitalsForm.diastolic || undefined,
          heartRate: vitalsForm.heartRate || undefined,
          respiratoryRate: vitalsForm.respiratoryRate || undefined,
          spO2: vitalsForm.spO2 || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record vitals");

      setVitalsModalOpen(false);
      setVitalsForm({
        temperature: "",
        systolic: "",
        diastolic: "",
        heartRate: "",
        respiratoryRate: "",
        spO2: "",
      });
      const refresh = await fetch(`/api/d/${workspaceId}/patients/${params.id}/vital-signs?limit=50`);
      const refreshData = await refresh.json();
      setVitals(refreshData.vitalSigns || []);
    } catch (err) {
      console.error("Failed to record vitals:", err);
    } finally {
      setVitalsSubmitting(false);
    }
  }

  useEffect(() => {
    if (selectedOrder) {
      const recs = getRecommendationsByServiceName(selectedOrder.service_name, selectedOrder.description);
      setOrderRecommendations(recs);
      const orderSamples = accessionSamples.filter(
        (s) =>
          s.openehrrequestid === selectedOrder.composition_uid ||
          s.openehrrequestid === selectedOrder.request_id ||
          s.orderid === selectedOrder.composition_uid ||
          s.orderid === selectedOrder.request_id
      );
      const preCollected = orderSamples.reduce((acc, s) => {
        acc[s.sampletype] = {
          sampleNumber: s.samplenumber,
          accessionNumber: s.accessionnumber || "-",
        };
        return acc;
      }, {} as Record<string, { sampleNumber: string; accessionNumber: string }>);
      setCollectedSpecimenTypes(preCollected);
      const firstSpecimen =
        recs.recommendations[0]?.sampleType ||
        fallbackSampleType(selectedOrder.service_name);
      const firstUncollected = recs.recommendations.find((r) => !preCollected[r.sampleType || fallbackSampleType(selectedOrder.service_name)])?.sampleType;
      setCurrentCollectingSpecimen(firstUncollected || firstSpecimen);
      const collector = sessionData?.user?.name || "";
      setSampleCollectionForm((prev) => ({
        ...prev,
        sampleNumber: "",
        collectionDate: getLocalDateTimeString(),
        collectorName: prev.collectorName || collector,
        currentLocation: "Emergency",
        comments: "",
      }));
      setSampleCollectionError(null);
    } else {
      setOrderRecommendations(null);
      setCurrentCollectingSpecimen("");
      setCollectedSpecimenTypes({});
      setSampleCollectionError(null);
    }
  }, [selectedOrder, sessionData, accessionSamples]);

  async function submitSampleCollection(targetSpecimen?: string) {
    if (!workspaceId || !params.id || !selectedOrder) return;
    setSampleCollectionSubmitting(true);
    setSampleCollectionError(null);
    try {
      const recs = orderRecommendations?.recommendations || [];
      const groups = getSpecimenGroupsForOrder(selectedOrder, recs);
      const specimen = targetSpecimen || currentCollectingSpecimen || fallbackSampleType(selectedOrder.service_name);
      const group = groups[specimen] || {
        tests: [] as typeof recs,
        containers: new Set<string>(),
        volumes: [],
        fasting: false,
      };
      const tests = group.tests.map((r) => r.testCode);
      const sampleType = specimen;
      const containerType = Array.from(group.containers)[0] || fallbackContainer(sampleType);
      const labCategory = group.tests[0]?.testCode || "";
      const body = {
        sampleNumber: sampleCollectionForm.sampleNumber,
        sampleType,
        containerType,
        labCategory,
        collectionDate: new Date(sampleCollectionForm.collectionDate).toISOString(),
        accessionNumber: sampleCollectionForm.accessionNumber,
        collectorName: sampleCollectionForm.collectorName,
        orderId: selectedOrder.composition_uid,
        patientId: params.id,
        ehrId: patient?.ehrid || null,
        subjectIdentifier: patient?.nationalid || patient?.patientid || null,
        workspaceId,
        currentLocation: sampleCollectionForm.currentLocation,
        tests,
        comments: sampleCollectionForm.comments,
      };

      console.log("Collecting sample with body:", body);

      const res = await fetch("/api/lims/accession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Sample collection failed:", data);
        const message =
          data.errors?.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join("; ") ||
          data.error ||
          "Failed to collect sample";
        throw new Error(message);
      }

      setCollectedSpecimenTypes((prev) => ({
        ...prev,
        [specimen]: {
          sampleNumber: data.sample.sampleNumber,
          accessionNumber: data.sample.accessionNumber || "-",
        },
      }));

      const allGroups = Object.keys(groups);
      const allCollected = allGroups.length > 0 && allGroups.every((s) => collectedSpecimenTypes[s] || s === specimen);

      setSampleCollectionForm((prev) => ({
        ...prev,
        sampleNumber: "",
        accessionNumber: "",
      }));

      if (allCollected) {
        setSampleCollectionModalOpen(false);
        setSampleCollectionForm({
          sampleNumber: "",
          collectionDate: getLocalDateTimeString(),
          accessionNumber: "",
          collectorName: "",
          currentLocation: "Emergency",
          comments: "",
        });
        setSelectedOrder(null);
        setOrderRecommendations(null);
        setCurrentCollectingSpecimen("");
        setCollectedSpecimenTypes({});
        setAlertDialog({
          show: true,
          title: "Samples Collected Successfully",
          message: `All required specimen types have been collected.\n\n${allGroups
            .map((s) => `${s}: ${collectedSpecimenTypes[s]?.sampleNumber || data.sample.sampleNumber}`)
            .join("\n")}`,
          type: "success",
        });
      } else {
        const nextSpecimen = allGroups.find((s) => !collectedSpecimenTypes[s] && s !== specimen);
        if (nextSpecimen) setCurrentCollectingSpecimen(nextSpecimen);
      }

      const [refresh, samplesRefresh] = await Promise.all([
        fetch(`/api/d/${workspaceId}/patients/${params.id}/lab-orders`),
        fetch(`/api/lims/accession?workspaceid=${workspaceId}&patientid=${params.id}&limit=200`),
      ]);
      const refreshData = await refresh.json();
      const samplesRefreshData = await samplesRefresh.json();
      setLabOrders(refreshData.labOrders || []);
      setAccessionSamples(samplesRefreshData.samples || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to collect sample";
      setSampleCollectionError(message);
      console.error("Failed to collect sample:", err);
    } finally {
      setSampleCollectionSubmitting(false);
    }
  }

  const latestTriage = triageRecords[0] || null;
  const latestVitals = vitals[0] || null;
  const age = patient ? ageFromDob(patient.dateofbirth) : 0;

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading patient dashboard...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-sm text-destructive">{error}</div>;
  }
  if (!patient) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Patient not found.</div>;
  }

  const patientName = `${patient.firstname} ${patient.middlename || ""} ${patient.lastname}`.trim();
  const mrn = patient.nationalid || patient.patientid;

  return (
    <div className="space-y-6">
      <CareHeader
        title={patientName}
        description={`${age} yrs • ${patient.gender === "male" ? "Male" : "Female"} • MRN ${mrn}`}
        action={
          <Button variant="outline" asChild>
            <Link href="/care">Back to Dashboard</Link>
          </Button>
        }
      />

      <div className="rounded-xl border p-4 bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {latestTriage && (
              <Badge variant="outline" className={triageClasses(latestTriage.triageLevel)}>
                {latestTriage.triageLevel.toUpperCase()}
              </Badge>
            )}
            <span>Arrival: {latestTriage?.arrivalMode || "-"}</span>
            <span>Waiting: {latestTriage?.waiting ?? 0} min</span>
            <span>ESI: {latestTriage?.esi || "-"}</span>
            <span>Pain: {latestTriage ? `${latestTriage.painScore}/10` : "-"}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-muted-foreground">Allergies</div>
            <div className="font-medium">{latestTriage?.allergies || "None recorded"}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-muted-foreground">Chief Complaint</div>
            <div className="font-medium">{latestTriage?.chiefComplaint || "-"}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-muted-foreground">Doctor</div>
            <div className="font-medium">{latestTriage?.doctor || "Unassigned"}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-muted-foreground">Blood Group</div>
            <div className="font-medium">{patient.bloodgroup || "-"}</div>
          </div>
        </div>

        {latestTriage?.triageLevel === "red" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#e54b4f]/10 border border-[#e54b4f]/20 p-3 text-sm text-[#e54b4f]">
            <AlertTriangle className="size-4" />
            Critical patient. {latestTriage.chiefComplaint}. ESI {latestTriage.esi}, Pain{" "}
            {latestTriage.painScore}/10.
          </div>
        )}
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="flex w-full overflow-x-auto space-x-1">
          <TabsTrigger
            value="timeline"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
          >
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value="vitals"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
          >
            Vitals
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
          >
            Services
          </TabsTrigger>
          <TabsTrigger
            value="results"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
          >
            Results
          </TabsTrigger>
          <TabsTrigger
            value="lab-orders"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
          >
            Lab Orders
          </TabsTrigger>
          <TabsTrigger
            value="emergency-report"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4684c2] text-white border-[0.5px] border-gray-400 font-bold"
          >
            Emergency Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4" /> Vital History
              </CardTitle>
              <Button size="sm" onClick={() => setVitalsModalOpen(true)}>
                Record Vitals
              </Button>
            </CardHeader>
            <CardContent>
              {vitals.length === 0 ? (
                <div className="text-sm text-muted-foreground">No vitals recorded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead>BP</TableHead>
                      <TableHead>HR</TableHead>
                      <TableHead>RR</TableHead>
                      <TableHead>SpO₂</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vitals.map((v) => (
                      <TableRow key={v.composition_uid}>
                        <TableCell>
                          {v.recorded_time ? new Date(v.recorded_time).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>{v.temperature ? `${v.temperature} °C` : "-"}</TableCell>
                        <TableCell>
                          {v.systolic || v.diastolic
                            ? `${v.systolic ?? "-"}/${v.diastolic ?? "-"} mmHg`
                            : "-"}
                        </TableCell>
                        <TableCell>{v.heart_rate ? `${v.heart_rate} bpm` : "-"}</TableCell>
                        <TableCell>{v.respiratory_rate ? `${v.respiratory_rate} /min` : "-"}</TableCell>
                        <TableCell>{v.spo2 ? `${v.spo2} %` : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Services Received</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestTriage ? (
                <>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase">Meds Given</div>
                    <div className="mt-1 space-y-1">
                      {latestTriage.medsGiven.length > 0 ? (
                        latestTriage.medsGiven.map((med, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span>{med}</span>
                            <Badge variant="outline">Price: -</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">None recorded</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase">Procedures</div>
                    <div className="mt-1 space-y-1">
                      {latestTriage.procedures ? (
                        latestTriage.procedures.split(",").map((proc, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span>{proc.trim()}</span>
                            <Badge variant="outline">Price: -</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">None recorded</div>
                      )}
                    </div>
                  </div>
                  {latestTriage.notes && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase">Notes</div>
                      <div className="mt-1 whitespace-pre-wrap">{latestTriage.notes}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No initial patient assessment found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const events = [
                  ...triageRecords.map((t) => ({
                    id: t.visitId,
                    time: t.arrivalTime,
                    type: "triage" as const,
                    title: `Initial Assessment: ${t.chiefComplaint} (${t.triageLevel.toUpperCase()})`,
                    detail: undefined as string | undefined,
                  })),
                  ...vitals.map((v) => ({
                    id: v.composition_uid,
                    time: v.recorded_time,
                    type: "vitals" as const,
                    title: "Vitals recorded",
                    detail: undefined as string | undefined,
                  })),
                  ...labOrders.map((o) => ({
                    id: o.composition_uid,
                    time: o.requested_date || o.recorded_time,
                    type: "lab-order" as const,
                    title: `Lab order placed: ${o.service_name}`,
                    detail: `Status: ${o.request_status}`,
                  })),
                  ...accessionSamples.map((s) => ({
                    id: s.sampleid,
                    time: s.accessionedat || s.collectiondate || undefined,
                    type: "sample" as const,
                    title: `Sample collected: ${s.sampletype} (${s.samplenumber})`,
                    detail: s.accessionnumber ? `Accession: ${s.accessionnumber}` : undefined,
                  })),
                ];
                events.sort((a, b) => {
                  const aTime = a.time ? new Date(a.time).getTime() : 0;
                  const bTime = b.time ? new Date(b.time).getTime() : 0;
                  return bTime - aTime;
                });
                if (events.length === 0) {
                  return <div className="text-sm text-muted-foreground">No events recorded yet.</div>;
                }
                return events.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="text-sm text-muted-foreground w-28">
                      {event.time ? new Date(event.time).toLocaleString() : "-"}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      {event.detail && (
                        <div className="text-xs text-muted-foreground">{event.detail}</div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lab Results</CardTitle>
              {labResults.length > 0 && (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  Total: {labResults.reduce((sum, r) => sum + (r.price || 0), 0)} {labResults[0]?.currency || "USD"}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {labResults.length === 0 ? (
                <div className="text-sm text-muted-foreground">No lab results available.</div>
              ) : (
                <div className="space-y-4">
                  {labResults.map((result) => (
                    <div key={result.composition_uid} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{result.test_name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {result.price} {result.currency}
                          </Badge>
                          <Badge variant="outline">{result.overall_test_status}</Badge>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {result.laboratory_name} •{" "}
                        {result.report_date ? new Date(result.report_date).toLocaleString() : "-"}
                      </div>
                      {result.test_results.length > 0 && (
                        <Table className="mt-3">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Analyte</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.test_results.map((analyte, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{analyte.analyte_name}</TableCell>
                                <TableCell>{analyte.result_value}</TableCell>
                                <TableCell>{analyte.result_unit || "-"}</TableCell>
                                <TableCell>{analyte.reference_range || "-"}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={resultStatusClasses(analyte.result_status)}
                                  >
                                    {analyte.result_status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Imaging Results</CardTitle>
              {imagingResults.length > 0 && (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  Total: {imagingResults.reduce((sum, r) => sum + r.price, 0)} {imagingResults[0]?.currency || "USD"}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {imagingResults.length === 0 ? (
                <div className="text-sm text-muted-foreground">No imaging results available.</div>
              ) : (
                <div className="space-y-4">
                  {imagingResults.map((result) => (
                    <div key={result.composition_uid} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{result.study_name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {result.price} {result.currency}
                          </Badge>
                          <Badge variant="outline">{result.overall_status}</Badge>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {result.modality} • {result.body_part} •{" "}
                        {result.report_date ? new Date(result.report_date).toLocaleString() : "-"}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Findings:</span> {result.finding_summary}
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="font-medium">Impression:</span> {result.impression}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Reported by: {result.radiologist}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ECG Results</CardTitle>
              {ecgResults.length > 0 && (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  Total: {ecgResults.reduce((sum, r) => sum + r.price, 0)} {ecgResults[0]?.currency || "USD"}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {ecgResults.length === 0 ? (
                <div className="text-sm text-muted-foreground">No ECG results available.</div>
              ) : (
                <div className="space-y-4">
                  {ecgResults.map((result) => (
                    <div key={result.composition_uid} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{result.test_name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {result.price} {result.currency}
                          </Badge>
                          <Badge variant="outline">{result.overall_status}</Badge>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Reported by: {result.reported_by} •{" "}
                        {result.report_date ? new Date(result.report_date).toLocaleString() : "-"}
                      </div>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-lg bg-muted p-2">
                          <div className="text-muted-foreground text-xs">Heart Rate</div>
                          <div className="font-medium">{result.heart_rate} bpm</div>
                        </div>
                        <div className="rounded-lg bg-muted p-2">
                          <div className="text-muted-foreground text-xs">Rhythm</div>
                          <div className="font-medium">{result.rhythm}</div>
                        </div>
                        <div className="rounded-lg bg-muted p-2">
                          <div className="text-muted-foreground text-xs">PR Interval</div>
                          <div className="font-medium">{result.pr_interval}</div>
                        </div>
                        <div className="rounded-lg bg-muted p-2">
                          <div className="text-muted-foreground text-xs">QRS Duration</div>
                          <div className="font-medium">{result.qrs_duration}</div>
                        </div>
                        <div className="rounded-lg bg-muted p-2">
                          <div className="text-muted-foreground text-xs">QT Interval</div>
                          <div className="font-medium">{result.qt_interval}</div>
                        </div>
                        <div className="rounded-lg bg-muted p-2">
                          <div className="text-muted-foreground text-xs">Axis</div>
                          <div className="font-medium">{result.axis}</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <svg viewBox="0 0 400 80" className="w-full h-20 rounded border bg-white">
                          <polyline
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="2"
                            points="0,40 20,40 30,20 40,60 50,40 70,40 80,30 90,50 100,40 120,40 130,10 140,70 150,40 170,40 180,35 190,45 200,40 220,40 230,15 240,65 250,40 270,40 280,40 290,40 300,40 320,40 330,25 340,55 350,40 370,40 400,40"
                          />
                        </svg>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Findings:</span> {result.findings}
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="font-medium">Interpretation:</span> {result.interpretation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab-orders" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lab Orders</CardTitle>
              <Button size="sm" onClick={() => setLabOrderModalOpen(true)}>
                Add Lab Order
              </Button>
            </CardHeader>
            <CardContent>
              {labOrders.length === 0 ? (
                <div className="text-sm text-muted-foreground">No lab orders.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labOrders.map((order) => {
                      const collected = accessionSamples.some(
                        (s) =>
                          s.openehrrequestid === order.composition_uid ||
                          s.openehrrequestid === order.request_id ||
                          s.orderid === order.composition_uid ||
                          s.orderid === order.request_id
                      );
                      return (
                        <TableRow key={order.composition_uid}>
                          <TableCell>{order.service_name}</TableCell>
                          <TableCell>{order.urgency}</TableCell>
                          <TableCell>{order.request_status}</TableCell>
                          <TableCell>
                            {order.requested_date ? new Date(order.requested_date).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>{order.requesting_provider}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setSampleCollectionModalOpen(true);
                              }}
                              disabled={collected}
                              className={collected ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-green-600 hover:bg-green-700 text-white"}
                            >
                              {collected ? (
                                <>
                                  <CheckCircle2 className="size-3.5 mr-1.5" />
                                  Collected
                                </>
                              ) : (
                                <>
                                  <FlaskConical className="size-3.5 mr-1.5" />
                                  Collect Sample
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collected Samples</CardTitle>
            </CardHeader>
            <CardContent>
              {accessionSamples.length === 0 ? (
                <div className="text-sm text-muted-foreground">No samples collected.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sample Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Container</TableHead>
                      <TableHead>Accession</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessionSamples.map((s) => {
                      const order = labOrders.find(
                        (o) =>
                          o.composition_uid === s.openehrrequestid ||
                          o.request_id === s.openehrrequestid ||
                          o.composition_uid === s.orderid ||
                          o.request_id === s.orderid
                      );
                      return (
                        <TableRow key={s.sampleid}>
                          <TableCell>{s.samplenumber}</TableCell>
                          <TableCell>{s.sampletype}</TableCell>
                          <TableCell>{s.containertype || "-"}</TableCell>
                          <TableCell>{s.accessionnumber || "-"}</TableCell>
                          <TableCell>{order?.service_name || "-"}</TableCell>
                          <TableCell>
                            {s.collectiondate ? new Date(s.collectiondate).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>{s.currentstatus}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency-report" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-muted-foreground">Patient</div>
                  <div className="font-medium">{patientName}</div>
                  <div className="text-xs">
                    {age} yrs • {patient.gender === "male" ? "Male" : "Female"} • MRN {mrn}
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-muted-foreground">Triage Level</div>
                  <div className="font-medium">
                    {latestTriage ? latestTriage.triageLevel.toUpperCase() : "-"}
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-muted-foreground">Chief Complaint</div>
                  <div className="font-medium">{latestTriage?.chiefComplaint || "-"}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-muted-foreground">Assigned Doctor</div>
                  <div className="font-medium">{latestTriage?.doctor || "Unassigned"}</div>
                </div>
              </div>

              {latestVitals && (
                <div className="grid gap-4 md:grid-cols-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">Temperature</div>
                    <div className="font-medium">
                      {latestVitals.temperature ? `${latestVitals.temperature} °C` : "-"}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">Blood Pressure</div>
                    <div className="font-medium">
                      {latestVitals.systolic || latestVitals.diastolic
                        ? `${latestVitals.systolic ?? "-"}/${latestVitals.diastolic ?? "-"}`
                        : "-"}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">Heart Rate</div>
                    <div className="font-medium">
                      {latestVitals.heart_rate ? `${latestVitals.heart_rate} bpm` : "-"}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">Respiratory Rate</div>
                    <div className="font-medium">
                      {latestVitals.respiratory_rate ? `${latestVitals.respiratory_rate} /min` : "-"}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">SpO₂</div>
                    <div className="font-medium">
                      {latestVitals.spo2 ? `${latestVitals.spo2} %` : "-"}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-muted p-3">
                <div className="text-muted-foreground">Assessment</div>
                <div className="font-medium">
                  {latestTriage
                    ? `Patient triaged as ${latestTriage.triageLevel.toUpperCase()}. ESI ${latestTriage.esi}. Pain ${latestTriage.painScore}/10. Waiting ${latestTriage.waiting} min.`
                    : "No triage assessment available."}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EnhancedLabOrderFormMultiple
        open={labOrderModalOpen}
        onOpenChange={setLabOrderModalOpen}
        onSubmit={submitLabOrder as unknown as ComponentProps<typeof EnhancedLabOrderFormMultiple>["onSubmit"]}
        patientId={params.id}
        patientName={patientName}
        workspaceid={workspaceId}
      />

      <Dialog open={vitalsModalOpen} onOpenChange={setVitalsModalOpen}>
        <DialogContent className="max-w-xl p-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Record Vital Signs</DialogTitle>
            <DialogDescription className="text-xs">Essential vital signs</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div>
              <label className="font-medium flex items-center gap-1">
                <Thermometer className="w-3 h-3" />
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="36.5"
                value={vitalsForm.temperature}
                onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="72"
                value={vitalsForm.heartRate}
                onChange={(e) => setVitalsForm({ ...vitalsForm, heartRate: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Systolic BP (mmHg)
              </label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="120"
                value={vitalsForm.systolic}
                onChange={(e) => setVitalsForm({ ...vitalsForm, systolic: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Diastolic BP (mmHg)
              </label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="80"
                value={vitalsForm.diastolic}
                onChange={(e) => setVitalsForm({ ...vitalsForm, diastolic: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium flex items-center gap-1">
                <Wind className="w-3 h-3" />
                Respiratory Rate (/min)
              </label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="16"
                value={vitalsForm.respiratoryRate}
                onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                SpO2 (%)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="98"
                value={vitalsForm.spO2}
                onChange={(e) => setVitalsForm({ ...vitalsForm, spO2: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setVitalsModalOpen(false);
                setVitalsForm({
                  temperature: "",
                  systolic: "",
                  diastolic: "",
                  heartRate: "",
                  respiratoryRate: "",
                  spO2: "",
                });
              }}
              className="bg-blue-200/90 hover:bg-blue-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submitVitals}
              disabled={vitalsSubmitting}
              className="bg-blue-600/90 hover:bg-blue-800"
            >
              {vitalsSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sampleCollectionModalOpen} onOpenChange={setSampleCollectionModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="size-5" />
              Collect Sample
            </DialogTitle>
            <DialogDescription>Register and collect sample for this order</DialogDescription>
          </DialogHeader>

          {selectedOrder && (() => {
            const recs = orderRecommendations?.recommendations || [];
            const groups = getSpecimenGroupsForOrder(selectedOrder, recs);
            const groupEntries = Object.entries(groups);
            const currentGroup = groups[currentCollectingSpecimen] || groupEntries[0]?.[1];
            const isCancelled = selectedOrder.request_status === "CANCELLED";

            return (
              <div className="space-y-4 py-4">
                {sampleCollectionError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {sampleCollectionError}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-900 mb-1">Order Information</div>
                  <div className="text-sm text-blue-700">
                    <div>Order ID: {selectedOrder.composition_uid}</div>
                    <div>Patient: {patientName}</div>
                    <div>Tests: {selectedOrder.service_name || "N/A"}</div>
                  </div>
                </div>

                {orderRecommendations && orderRecommendations.recommendations.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                      <FlaskConical className="size-4" />
                      Recommended Sample Collection
                    </div>
                    <div className="text-sm text-green-800 space-y-1">
                      <div>Primary Sample: {orderRecommendations.primarySampleType}</div>
                      <div>Primary Container: {orderRecommendations.primaryContainer}</div>
                      <div>
                        Total Volume: {orderRecommendations.totalVolume} {orderRecommendations.volumeUnit}
                      </div>
                      {orderRecommendations.fastingRequired && (
                        <div className="font-medium text-orange-700">Fasting required</div>
                      )}
                      {orderRecommendations.specialInstructions.length > 0 && (
                        <div>Instructions: {orderRecommendations.specialInstructions.join(", ")}</div>
                      )}
                    </div>
                  </div>
                )}

                {groupEntries.length > 1 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Specimen Types</div>
                    <div className="grid gap-2">
                      {groupEntries.map(([specimen, data]) => {
                        const isCollected = !!collectedSpecimenTypes[specimen];
                        const isSelected = currentCollectingSpecimen === specimen;
                        return (
                          <button
                            key={specimen}
                            type="button"
                            onClick={() => setCurrentCollectingSpecimen(specimen)}
                            className={`text-left border rounded-lg p-2 transition-colors ${
                              isCollected
                                ? "bg-green-50 border-green-300"
                                : isSelected
                                ? "bg-blue-50 border-blue-300"
                                : "bg-white border-gray-200 hover:border-blue-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <FlaskConical className={`size-4 ${isCollected ? "text-green-600" : "text-blue-600"}`} />
                                <span className="font-medium">{specimen}</span>
                                <span className="text-xs text-gray-500">({data.tests.length} test{data.tests.length > 1 ? "s" : ""})</span>
                              </div>
                              {isCollected && (
                                <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <CheckCircle2 className="size-3" /> Collected
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mt-1 ml-6">
                              Container: {Array.from(data.containers).join(", ") || "-"} • Volume: {data.volumes[0] || "-"}
                            </div>
                            <div className="text-xs text-gray-700 mt-1 ml-6">
                              Tests: {data.tests.map((t) => t.testName).join(", ")}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentGroup && (
                  <div className="bg-gray-50 border border-green-200 rounded-lg p-3">
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5 text-green-900">
                      <FlaskConical className="size-4" />
                      Sample Collection
                      {groupEntries.length > 1 && (
                        <span className="text-xs font-normal text-gray-600">
                          ({Object.keys(collectedSpecimenTypes).length}/{groupEntries.length} collected)
                        </span>
                      )}
                    </h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Sample ID</Label>
                          <Input
                            value={sampleCollectionForm.sampleNumber}
                            onChange={(e) => setSampleCollectionForm({ ...sampleCollectionForm, sampleNumber: e.target.value })}
                            placeholder="Auto-generated"
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Collection Date *</Label>
                          <Input
                            type="datetime-local"
                            value={sampleCollectionForm.collectionDate}
                            onChange={(e) => setSampleCollectionForm({ ...sampleCollectionForm, collectionDate: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Collector</Label>
                          <Input
                            value={sampleCollectionForm.collectorName}
                            readOnly
                            className="h-8 text-xs bg-gray-50"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Location</Label>
                          <Input
                            value={sampleCollectionForm.currentLocation}
                            readOnly
                            className="h-8 text-xs bg-gray-50"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Comments (Optional)</Label>
                        <textarea
                          value={sampleCollectionForm.comments}
                          onChange={(e) => setSampleCollectionForm({ ...sampleCollectionForm, comments: e.target.value })}
                          placeholder="Add notes about sample collection..."
                          rows={2}
                          className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                      </div>

                      {!isCancelled && (() => {
                        const uncollected = groupEntries.filter(([specimen]) => !collectedSpecimenTypes[specimen]);
                        if (uncollected.length === 0) return null;
                        return (
                          <div className="mt-3 space-y-2">
                            {uncollected.map(([specimen]) => (
                              <Button
                                key={specimen}
                                type="button"
                                size="sm"
                                className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                                disabled={sampleCollectionSubmitting}
                                onClick={() => submitSampleCollection(specimen)}
                              >
                                <FlaskConical className="size-3 mr-1" />
                                Collect {specimen} Sample
                              </Button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {orderRecommendations?.fastingRequired && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-sm font-semibold text-amber-700">Fasting Required</div>
                    <p className="text-sm text-amber-800 mt-1">
                      Verify that the patient has fasted for 8-12 hours before collecting this sample.
                    </p>
                  </div>
                )}

                {isCancelled && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <div className="font-semibold">Cannot collect sample: This order has been cancelled.</div>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            {(() => {
              const recs = orderRecommendations?.recommendations || [];
              const groups = getSpecimenGroups(recs);
              const groupEntries = Object.entries(groups);
              const hasSpecimenButtons = groupEntries.length > 0 && groupEntries.some(([specimen]) => !collectedSpecimenTypes[specimen]);
              return (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSampleCollectionModalOpen(false);
                      setSelectedOrder(null);
                      setCurrentCollectingSpecimen("");
                      setCollectedSpecimenTypes({});
                    }}
                  >
                    {Object.keys(collectedSpecimenTypes).length > 0 ? "Done" : "Cancel"}
                  </Button>
                  {!hasSpecimenButtons && (
                    <Button
                      onClick={() => submitSampleCollection()}
                      disabled={sampleCollectionSubmitting || selectedOrder?.request_status === "CANCELLED"}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <FlaskConical className="size-4 mr-2" />
                      {sampleCollectionSubmitting ? "Processing..." : "Collect & Register Sample"}
                    </Button>
                  )}
                </>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertDialog.show} onOpenChange={(open) => setAlertDialog({ ...alertDialog, show: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={
                alertDialog.type === "error"
                  ? "text-red-600"
                  : alertDialog.type === "warning"
                  ? "text-yellow-600"
                  : "text-green-600"
              }
            >
              {alertDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {alertDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setAlertDialog({ show: false, title: "", message: "", type: "success" })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
