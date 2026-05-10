"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function InsurancePreApprovalsPage() {
  const [preApprovals, setPreApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patientid: "",
    insuranceid: "",
    cpt_codes: "",
    icd10_codes: "",
    clinical_justification: "",
  });

  useEffect(() => {
    fetchPreApprovals();
  }, []);

  const fetchPreApprovals = async () => {
    try {
      const res = await fetch("/api/admin/insurance-pre-approvals");
      const data = await res.json();
      setPreApprovals(data.preApprovals || []);
    } catch (error) {
      console.error("Failed to fetch pre-approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/insurance-pre-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          cpt_codes: formData.cpt_codes.split(",").map((c) => c.trim()),
          icd10_codes: formData.icd10_codes.split(",").map((c) => c.trim()),
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({
          patientid: "",
          insuranceid: "",
          cpt_codes: "",
          icd10_codes: "",
          clinical_justification: "",
        });
        fetchPreApprovals();
      }
    } catch (error) {
      console.error("Failed to create pre-approval:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "denied":
        return "bg-red-500";
      case "approved_with_conditions":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Insurance Pre-Approvals</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Pre-Approval Request"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Pre-Approval Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="patientid">Patient ID</Label>
                <Input
                  id="patientid"
                  value={formData.patientid}
                  onChange={(e) => setFormData({ ...formData, patientid: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="insuranceid">Insurance ID</Label>
                <Input
                  id="insuranceid"
                  value={formData.insuranceid}
                  onChange={(e) => setFormData({ ...formData, insuranceid: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cpt_codes">CPT Codes (comma-separated)</Label>
                <Input
                  id="cpt_codes"
                  value={formData.cpt_codes}
                  onChange={(e) => setFormData({ ...formData, cpt_codes: e.target.value })}
                  placeholder="e.g. 93458, 93306"
                />
              </div>
              <div>
                <Label htmlFor="icd10_codes">ICD-10 Codes (comma-separated)</Label>
                <Input
                  id="icd10_codes"
                  value={formData.icd10_codes}
                  onChange={(e) => setFormData({ ...formData, icd10_codes: e.target.value })}
                  placeholder="e.g. I25.10"
                />
              </div>
              <div>
                <Label htmlFor="clinical_justification">Clinical Justification</Label>
                <Textarea
                  id="clinical_justification"
                  value={formData.clinical_justification}
                  onChange={(e) => setFormData({ ...formData, clinical_justification: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pre-Approval Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Patient ID</TableHead>
                <TableHead>Insurance ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>CPT Codes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preApprovals.map((pa) => (
                <TableRow key={pa.preapprovalid}>
                  <TableCell>{pa.preapprovalid.slice(0, 8)}...</TableCell>
                  <TableCell>{pa.patientid?.slice(0, 8)}...</TableCell>
                  <TableCell>{pa.insuranceid?.slice(0, 8)}...</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(pa.status)}>{pa.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(pa.request_date).toLocaleDateString()}</TableCell>
                  <TableCell>{pa.cpt_codes?.join(", ") || "-"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {preApprovals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No pre-approval requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
