import { patients, visits } from "@/lib/care/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { CareHeader } from "@/components/care/care-header";

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

export default function PatientsListPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CareHeader
        title="Patients"
        description="All assigned and waiting patients"
      />

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
