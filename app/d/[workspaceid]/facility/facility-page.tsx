"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Save, CheckCircle, AlertCircle } from "lucide-react";

type Facility = {
  workspaceid: string;
  name: string;
  type: string;
  licensenumber: string | null;
  phone: string | null;
  address: string | null;
};

export default function FacilityDetailsClient({
  workspaceid,
}: {
  workspaceid: string;
}) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "",
    licensenumber: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/d/${workspaceid}/facility`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error || "Could not load facility details");
          return;
        }
        setFacility(data.facility);
        setForm({
          name: data.facility.name ?? "",
          licensenumber: data.facility.licensenumber ?? "",
          phone: data.facility.phone ?? "",
          address: data.facility.address ?? "",
        });
      } catch {
        if (!cancelled) setError("Could not reach the server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceid]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/d/${workspaceid}/facility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not save facility details");
        return;
      }
      setFacility(data.facility);
      setSaved(true);
    } catch {
      setError("Could not reach the server");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    placeholder: string,
    hint?: string,
  ) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => {
          setForm((f) => ({ ...f, [key]: e.target.value }));
          setSaved(false);
        }}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading facility details...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Facility details
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          These appear on this facility&apos;s printed receipts. Anything left
          blank is left off the receipt rather than filled in with a default.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {facility?.name}
            <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
              {facility?.type}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {field("name", "Facility name", "e.g. New Pharmacy")}
          {field(
            "licensenumber",
            "Licence number",
            "e.g. PH-2024-001",
            "Printed on receipts as a statement of this facility's licence. Leave blank until you have the real number.",
          )}
          {field("phone", "Telephone", "e.g. +964 780 000 0000")}
          {field("address", "Address", "e.g. Karrada, Baghdad")}

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={save}
              disabled={saving || form.name.trim() === ""}
              className="gap-2 bg-[#618FF5] text-white hover:bg-[#4a7ae0]"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Saved
              </span>
            )}
            {error && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
