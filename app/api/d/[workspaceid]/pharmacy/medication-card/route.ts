/**
 * Individual Medication Card PDF Generation API
 * 
 * POST - Generate a printable PDF for a single medication card
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/user";
import { pharmacyOrders, pharmacyOrderItems, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import jsPDF from "jspdf";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

interface MedicationCardRequest {
  orderId: string;
  patientId?: string;
  itemName?: string;
  dosage?: string;
  quantity?: number;
  doseAmount?: string;
  doseUnit?: string;
  route?: string;
  timingDirections?: string;
  directionDuration?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    const body: MedicationCardRequest = await request.json();
    
    // Validate required fields
    if (!body.orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Fetch order and patient details
    const [order] = await db
      .select({
        order: pharmacyOrders,
        patient: patients,
      })
      .from(pharmacyOrders)
      .leftJoin(patients, eq(pharmacyOrders.patientid, patients.patientid))
      .where(eq(pharmacyOrders.orderid, body.orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Create PDF with small size for medication packages (15cm x 4cm)
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "cm",
      format: [15, 4] // width: 15cm, height: 4cm - perfect for medication packages
    });

    // Set font
    pdf.setFont("helvetica");

    // Header: Patient Name | Doctor Name (no date on top)
    pdf.setFontSize(9);
    pdf.setTextColor(0);
    const orderDate = new Date(order.order.createdat).toLocaleDateString();
    const doctorName = (order.order as any).prescribername || "";
    const patientName = order.patient
      ? `${order.patient.firstname} ${order.patient.lastname}`
      : "Unknown";
    pdf.setFont("helvetica", "bold");
    pdf.text(`${patientName}  |  ${doctorName}`, 0.5, 0.6);

    // Parse the labeled, pipe-separated dosage string
    const dosageDetails: Record<string, string> = {};
    if (body.dosage) {
      body.dosage.split("|").forEach((segment) => {
        const part = segment.trim();
        const colonIdx = part.indexOf(":");
        if (colonIdx === -1) return;
        const key = part.slice(0, colonIdx).trim().toLowerCase();
        const val = part.slice(colonIdx + 1).trim();
        if (val) dosageDetails[key] = val;
      });
    }

    // Medication name + dose on the same line (bold)
    pdf.setFontSize(10);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");
    const medicationName = body.itemName || "Medication";
    const doseText = body.doseAmount && body.doseUnit
      ? `${body.doseAmount} ${body.doseUnit}`
      : dosageDetails.dose || "";
    const medLine = doseText ? `${medicationName}  ${doseText}` : medicationName;
    const maxNameWidth = 14;
    const nameLines = pdf.splitTextToSize(medLine, maxNameWidth);
    pdf.text(nameLines, 0.5, 1.3);

    // Usage | Instructions on the next line
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    let currentY = 1.3 + nameLines.length * 0.4 + 0.2;

    const usageText = dosageDetails.usage || "";
    let instructionsText = dosageDetails.instructions || "";
    if (!instructionsText && body.dosage && !body.dosage.includes(":")) {
      instructionsText = body.dosage.trim();
    }

    const infoParts = [usageText, instructionsText].filter(Boolean);
    if (infoParts.length > 0) {
      const infoLine = infoParts.join("  |  ");
      const infoLines = pdf.splitTextToSize(infoLine, 14);
      pdf.text(infoLines, 0.5, currentY);
      currentY += 0.3 * infoLines.length;
    }

    // Right side: Pharmacy name + date (vertical / rotated 90°)
    pdf.setFontSize(7);
    pdf.setTextColor(120);
    pdf.setFont("helvetica", "normal");
    // Rotate text 90° on the right edge
    pdf.text("Pharmacy Management System", 14.5, 3.8, { angle: 90 });
    pdf.text(orderDate, 14, 3.8, { angle: 90 });

    // Convert PDF to base64
    const pdfData = pdf.output("datauristring").split(",")[1];
    const medicationNameClean = medicationName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `medication-card-${medicationNameClean}-${order.order.orderid.slice(0, 8)}-${Date.now()}.pdf`;

    return NextResponse.json({
      success: true,
      pdfData,
      filename
    });

    });
  } catch (error) {
    console.error("[Medication Card PDF]", error);
    return NextResponse.json({ error: "Failed to generate medication card PDF" }, { status: 500 });
  }
}
