import { patients, visits } from "@/lib/care/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

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

export default function PatientsListPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground">All assigned and waiting patients</p>
      </div>

      <div className="grid gap-4">
        {patients.map((patient) => {
          const visit = visits.find((v) => v.patientId === patient.id);
          return (
            <Card key={patient.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
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
                        {patient.age} yrs • {patient.gender === "male" ? "Male" : "Female"} • MRN {patient.mrn}
                      </div>
                      <div className="mt-1 text-xs">
                        Bed: {patient.bed || "Waiting"} • Doctor: {visit?.doctor || "Unassigned"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {visit && (
                      <Badge variant="outline" className={triageClasses(visit.triageLevel)}>
                        {visit.triageLevel.toUpperCase()}
                      </Badge>
                    )}
                    <Button size="sm" asChild>
                      <Link href={`/care/patients/${patient.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
