import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, Thermometer, Wind, Droplets } from "lucide-react";
import { CareHeader } from "@/components/care/care-header";

const alerts = [
  { id: "a1", patient: "Ali Hassan", type: "SpO₂ < 90%", value: "88%", icon: Wind, priority: "critical" },
  { id: "a2", patient: "Ali Hassan", type: "BP 70/40", value: "68/42", icon: Activity, priority: "critical" },
  { id: "a3", patient: "Omar Khalil", type: "HR 180", value: "182", icon: Activity, priority: "critical" },
  { id: "a4", patient: "Fatima Noor", type: "Temperature 40°C", value: "40.2", icon: Thermometer, priority: "critical" },
  { id: "a5", patient: "Sara Mahdi", type: "Critical Lab Result", value: "K+ 6.8", icon: Droplets, priority: "critical" },
];

export default function AlertsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CareHeader
        title="Clinical Alerts"
        description="Critical thresholds and sepsis alerts"
      />
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-red-100 p-2">
                  <alert.icon className="size-5 text-red-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{alert.type}</span>
                    <Badge variant="destructive">Critical</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {alert.patient} • Value: {alert.value}
                  </div>
                </div>
                <AlertTriangle className="size-5 text-red-700" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
