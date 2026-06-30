export type TriageLevel = "red" | "yellow" | "green";

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: "male" | "female";
  bed?: string;
  allergies: string[];
  fallRisk: "high" | "medium" | "low";
  isolation?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  arrivalTime: string;
  arrivalMode: "ambulance" | "walk-in" | "referral";
  chiefComplaint: string;
  triageLevel: TriageLevel;
  triageTime: string;
  painScore: number;
  esi?: number;
  news2?: number;
  gcs: number;
  status: "waiting" | "in-treatment" | "admitted" | "discharged";
  doctor?: string;
}

export interface Task {
  id: string;
  visitId: string;
  title: string;
  priority: TriageLevel;
  dueTime: string;
  status: "pending" | "in-progress" | "completed";
  assignedBy: string;
  completedBy?: string;
}

export interface VitalEntry {
  id: string;
  visitId: string;
  time: string;
  bp: string;
  hr: number;
  rr: number;
  temp: number;
  spo2: number;
  pain: number;
  weight?: number;
  height?: number;
}

export interface MedicationOrder {
  id: string;
  visitId: string;
  name: string;
  dose: string;
  route: string;
  scheduledTime: string;
  status: "due" | "given" | "refused" | "delayed" | "held";
  givenTime?: string;
  site?: string;
  comment?: string;
}

export const patients: Patient[] = [
  {
    id: "p1",
    mrn: "123456",
    name: "Ali Hassan",
    age: 34,
    gender: "male",
    bed: "Bed 2",
    allergies: ["Penicillin"],
    fallRisk: "high",
    isolation: "Contact",
  },
  {
    id: "p2",
    mrn: "123457",
    name: "Fatima Noor",
    age: 28,
    gender: "female",
    bed: "Bed 5",
    allergies: [],
    fallRisk: "low",
  },
  {
    id: "p3",
    mrn: "123458",
    name: "Omar Khalil",
    age: 67,
    gender: "male",
    bed: "Bed 8",
    allergies: ["Sulfa"],
    fallRisk: "medium",
  },
  {
    id: "p4",
    mrn: "123459",
    name: "Sara Mahdi",
    age: 45,
    gender: "female",
    bed: "Bed 12",
    allergies: [],
    fallRisk: "low",
  },
];

export const visits: Visit[] = [
  {
    id: "v1",
    patientId: "p1",
    arrivalTime: "2026-06-25T07:55:00",
    arrivalMode: "ambulance",
    chiefComplaint: "Chest pain",
    triageLevel: "red",
    triageTime: "2026-06-25T08:00:00",
    painScore: 8,
    esi: 1,
    news2: 7,
    gcs: 15,
    status: "in-treatment",
    doctor: "Dr Ahmed",
  },
  {
    id: "v2",
    patientId: "p2",
    arrivalTime: "2026-06-25T08:30:00",
    arrivalMode: "walk-in",
    chiefComplaint: "Abdominal pain",
    triageLevel: "yellow",
    triageTime: "2026-06-25T08:35:00",
    painScore: 5,
    esi: 3,
    news2: 2,
    gcs: 15,
    status: "waiting",
  },
  {
    id: "v3",
    patientId: "p3",
    arrivalTime: "2026-06-25T06:15:00",
    arrivalMode: "walk-in",
    chiefComplaint: "Shortness of breath",
    triageLevel: "yellow",
    triageTime: "2026-06-25T06:20:00",
    painScore: 3,
    esi: 2,
    news2: 4,
    gcs: 15,
    status: "in-treatment",
    doctor: "Dr Sara",
  },
  {
    id: "v4",
    patientId: "p4",
    arrivalTime: "2026-06-25T09:00:00",
    arrivalMode: "ambulance",
    chiefComplaint: "Headache",
    triageLevel: "green",
    triageTime: "2026-06-25T09:05:00",
    painScore: 2,
    esi: 4,
    news2: 0,
    gcs: 15,
    status: "waiting",
  },
];

export const tasks: Task[] = [
  {
    id: "t1",
    visitId: "v1",
    title: "Give Paracetamol 1g",
    priority: "red",
    dueTime: "2026-06-25T08:00:00",
    status: "pending",
    assignedBy: "Dr Ahmed",
  },
  {
    id: "t2",
    visitId: "v1",
    title: "Repeat BP",
    priority: "red",
    dueTime: "2026-06-25T08:15:00",
    status: "pending",
    assignedBy: "Dr Ahmed",
  },
  {
    id: "t3",
    visitId: "v2",
    title: "Collect Blood Sample",
    priority: "yellow",
    dueTime: "2026-06-25T08:45:00",
    status: "pending",
    assignedBy: "Dr Sara",
  },
  {
    id: "t4",
    visitId: "v3",
    title: "Insert IV Cannula",
    priority: "yellow",
    dueTime: "2026-06-25T08:30:00",
    status: "in-progress",
    assignedBy: "Dr Sara",
  },
  {
    id: "t5",
    visitId: "v4",
    title: "Dressing Change",
    priority: "green",
    dueTime: "2026-06-25T09:30:00",
    status: "pending",
    assignedBy: "Dr Ahmed",
  },
];

export const medications: MedicationOrder[] = [
  {
    id: "m1",
    visitId: "v1",
    name: "Paracetamol",
    dose: "1 g",
    route: "Oral",
    scheduledTime: "08:00",
    status: "due",
  },
  {
    id: "m2",
    visitId: "v1",
    name: "Aspirin",
    dose: "300 mg",
    route: "Oral",
    scheduledTime: "08:15",
    status: "due",
  },
  {
    id: "m3",
    visitId: "v3",
    name: "Salbutamol",
    dose: "5 mg",
    route: "Nebulizer",
    scheduledTime: "07:00",
    status: "given",
    givenTime: "07:05",
  },
  {
    id: "m4",
    visitId: "v2",
    name: "Ondansetron",
    dose: "4 mg",
    route: "IV",
    scheduledTime: "09:00",
    status: "due",
  },
];

export const vitals: VitalEntry[] = [
  {
    id: "vt1",
    visitId: "v1",
    time: "2026-06-25T08:00:00",
    bp: "98/60",
    hr: 110,
    rr: 22,
    temp: 37.2,
    spo2: 92,
    pain: 8,
  },
  {
    id: "vt2",
    visitId: "v2",
    time: "2026-06-25T08:35:00",
    bp: "120/80",
    hr: 84,
    rr: 18,
    temp: 36.9,
    spo2: 99,
    pain: 5,
  },
  {
    id: "vt3",
    visitId: "v3",
    time: "2026-06-25T06:20:00",
    bp: "135/85",
    hr: 96,
    rr: 24,
    temp: 37.1,
    spo2: 94,
    pain: 3,
  },
];

export function getPatient(id: string) {
  return patients.find((p) => p.id === id);
}

export function getVisitByPatient(patientId: string) {
  return visits.find((v) => v.patientId === patientId);
}

export function getVisitTasks(visitId: string) {
  return tasks.filter((t) => t.visitId === visitId);
}

export function getVisitMedications(visitId: string) {
  return medications.filter((m) => m.visitId === visitId);
}

export function getVisitVitals(visitId: string) {
  return vitals.filter((v) => v.visitId === visitId);
}
