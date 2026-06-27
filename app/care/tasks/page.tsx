"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { tasks, patients, visits, type Task, type TriageLevel } from "@/lib/care/mock-data";
import { CareHeader } from "@/components/care/care-header";
import { Clock, AlertTriangle } from "lucide-react";

function priorityClasses(p: TriageLevel) {
  switch (p) {
    case "red":
      return "bg-red-100 text-red-700 border-red-200";
    case "yellow":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "green":
      return "bg-green-100 text-green-700 border-green-200";
  }
}

function isOverdue(due: string) {
  return new Date(due).getTime() < Date.now();
}

export default function TasksPage() {
  const [items, setItems] = useState<Task[]>(tasks);

  function toggleStatus(id: string) {
    setItems((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
          : t
      )
    );
  }

  const sorted = [...items].sort((a, b) => {
    const score = { red: 0, yellow: 1, green: 2 };
    return score[a.priority] - score[b.priority] || new Date(a.dueTime).getTime() - new Date(b.dueTime).getTime();
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CareHeader
        title="My Tasks"
        description="Priority, due time, and status"
        action={<Button>Add Task</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {items.filter((t) => t.status !== "completed").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-600">
            {items.filter((t) => t.status !== "completed" && isOverdue(t.dueTime)).length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Critical</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {items.filter((t) => t.priority === "red" && t.status !== "completed").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {items.filter((t) => t.status === "completed").length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.map((task) => {
            const visit = visits.find((v) => v.id === task.visitId);
            const patient = visit ? patients.find((p) => p.id === visit.patientId) : null;
            const overdue = task.status !== "completed" && isOverdue(task.dueTime);
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50"
              >
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={() => toggleStatus(task.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={task.status === "completed" ? "line-through text-muted-foreground" : "font-medium"}>
                      {task.title}
                    </span>
                    <Badge variant="outline" className={priorityClasses(task.priority)}>
                      {task.priority.toUpperCase()}
                    </Badge>
                    {overdue && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="size-3" /> Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Patient: {patient?.name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      Due {new Date(task.dueTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span>Assigned by: {task.assignedBy}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
