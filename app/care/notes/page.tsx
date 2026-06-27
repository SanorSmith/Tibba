"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { patients } from "@/lib/care/mock-data";

export default function NotesPage() {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<string[]>([]);

  function submit() {
    if (!note.trim()) return;
    setSaved((prev) => [note, ...prev]);
    setNote("");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nursing Notes</h1>
        <p className="text-muted-foreground">Progress and visit notes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Patient</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Document care..." />
          </div>
          <Button onClick={submit}>Save Note</Button>
        </CardContent>
      </Card>

      {saved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {saved.map((n, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                {n}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
