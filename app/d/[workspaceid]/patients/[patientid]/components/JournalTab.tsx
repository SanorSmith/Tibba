"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DispositionData {
  type: "admit" | "transfer" | "discharge" | null;
  ward?: string;
  bedNumber?: string;
  days?: number;
  transferTo?: string;
  dischargeSummary?: string;
  prescription?: string;
  followUp?: string;
  admissionPrice?: number;
  wardPrice?: number;
  totalPrice?: number;
  recorded_time?: string;
  composerName?: string;
  composerId?: string;
  facility?: string;
}

interface JournalTabProps {
  workspaceid: string;
  patientid: string;
}

export function JournalTab({ workspaceid, patientid }: JournalTabProps) {
  const [disposition, setDisposition] = useState<DispositionData>({
    type: null,
  });
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function loadDisposition() {
      try {
        console.log("Loading disposition for patient:", patientid);
        const response = await fetch(`/api/d/${workspaceid}/patients/${patientid}/disposition`);
        console.log("Disposition response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("Disposition data received:", data);
          if (data.disposition) {
            const disp = data.disposition;
            setDisposition({
              type: disp.type,
              ward: disp.ward,
              bedNumber: disp.bedNumber,
              days: disp.days,
              transferTo: disp.transferTo,
              dischargeSummary: disp.dischargeSummary,
              prescription: disp.prescription,
              followUp: disp.followUp,
              admissionPrice: disp.admissionPrice,
              wardPrice: disp.wardPrice,
              totalPrice: disp.totalPrice,
              recorded_time: disp.dateTime,
              composerName: disp.composerName,
              composerId: disp.composerId,
              facility: disp.facility,
            });
          } else {
            console.log("No disposition data in response");
          }
        } else {
          console.log("Disposition fetch failed");
        }
      } catch (error) {
        console.error("Failed to load disposition:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDisposition();
  }, [workspaceid, patientid]);

  function calculateTotalPrice() {
    let total = 0;
    if (disposition.admissionPrice) total += disposition.admissionPrice;
    if (disposition.wardPrice) total += disposition.wardPrice;
    return total;
  }

  return (
    <div className="space-y-4">
      {/* Emergency Disposition Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Emergency Visit Disposition</CardTitle>
          {disposition.type && (
            <Badge
              variant="outline"
              className={
                disposition.type === "admit"
                  ? "bg-[#4684c2] text-white border-[#4684c2]"
                  : disposition.type === "transfer"
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-[#4684c2] text-white border-[#4684c2]"
              }
            >
              {disposition.type.toUpperCase()}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading disposition...</div>
          ) : !disposition.type ? (
            <div className="text-sm text-muted-foreground">No emergency disposition recorded yet.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-medium">
                  {disposition.type === "admit" &&
                    `Admitted to ${disposition.ward || "Ward"} - Bed ${disposition.bedNumber || "TBD"}`}
                  {disposition.type === "transfer" &&
                    `Transferred to ${disposition.transferTo}`}
                  {disposition.type === "discharge" && "Discharged from Emergency"}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full"
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </Button>

              {showDetails && (
                <div className="space-y-4 pt-2 border-t">
                  {disposition.recorded_time && (
                    <div>
                      <div className="text-sm text-muted-foreground">Recorded</div>
                      <div className="text-sm">
                        {new Date(disposition.recorded_time).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {disposition.facility && (
                    <div>
                      <div className="text-sm text-muted-foreground">Facility</div>
                      <div className="text-sm">{disposition.facility}</div>
                    </div>
                  )}

                  {disposition.composerName && (
                    <div>
                      <div className="text-sm text-muted-foreground">Recorded By</div>
                      <div className="text-sm">{disposition.composerName}</div>
                    </div>
                  )}

                  {disposition.type === "admit" && disposition.days && (
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-muted-foreground text-sm">Estimated Stay</div>
                      <div className="font-medium">{disposition.days} days</div>
                    </div>
                  )}

                  {disposition.type === "discharge" && (
                    <>
                      {disposition.dischargeSummary && (
                        <div className="rounded-lg border p-3">
                          <div className="text-muted-foreground text-sm mb-2">
                            Discharge Summary
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {disposition.dischargeSummary}
                          </div>
                        </div>
                      )}
                      {disposition.prescription && (
                        <div className="rounded-lg border p-3">
                          <div className="text-muted-foreground text-sm mb-2">
                            Prescription
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {disposition.prescription}
                          </div>
                        </div>
                      )}
                      {disposition.followUp && (
                        <div className="rounded-lg border p-3">
                          <div className="text-muted-foreground text-sm mb-2">
                            Follow-up Instructions
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {disposition.followUp}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {(disposition.admissionPrice || disposition.wardPrice) && (
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-muted-foreground text-sm mb-2">Cost Summary</div>
                      {disposition.admissionPrice && (
                        <div className="flex justify-between text-sm">
                          <span>Admission Fee:</span>
                          <span className="font-medium">
                            {disposition.admissionPrice.toLocaleString()} IQD
                          </span>
                        </div>
                      )}
                      {disposition.wardPrice && disposition.days && (
                        <div className="flex justify-between text-sm">
                          <span>Ward Stay ({disposition.days} days):</span>
                          <span className="font-medium">
                            {disposition.wardPrice.toLocaleString()} IQD
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t">
                        <span>Total:</span>
                        <span>{calculateTotalPrice().toLocaleString()} IQD</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
