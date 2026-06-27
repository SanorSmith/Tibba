"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CareHeader } from "@/components/care/care-header";
import { AlertTriangle, HeartPulse, Brain, Droplet, Users } from "lucide-react";

const actions = [
  { id: "code-blue", label: "Code Blue", icon: HeartPulse, color: "bg-blue-600 hover:bg-blue-700" },
  { id: "rapid", label: "Rapid Response", icon: AlertTriangle, color: "bg-orange-500 hover:bg-orange-600" },
  { id: "stroke", label: "Stroke Alert", icon: Brain, color: "bg-purple-600 hover:bg-purple-700" },
  { id: "stemi", label: "STEMI Alert", icon: HeartPulse, color: "bg-red-600 hover:bg-red-700" },
  { id: "hemorrhage", label: "Massive Hemorrhage", icon: Droplet, color: "bg-red-800 hover:bg-red-900" },
  { id: "security", label: "Security / Code Gray", icon: Users, color: "bg-gray-600 hover:bg-gray-700" },
];

export default function EmergencyPage() {
  function trigger(label: string) {
    alert(`${label} triggered. Notifications sent to relevant teams. (mock)`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CareHeader
        title="Emergency Actions"
        description="One-tap alerts for critical events"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((action) => (
          <Card key={action.id} className="overflow-hidden">
            <CardContent className="p-0">
              <Button
                onClick={() => trigger(action.label)}
                className={`w-full h-24 rounded-none text-lg font-bold ${action.color}`}
              >
                <action.icon className="size-6 mr-2" />
                {action.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activation Log</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No emergency actions triggered in this shift.
        </CardContent>
      </Card>
    </div>
  );
}
