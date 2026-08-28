/**
 * Pharmacy Prescriptions API
 * GET — search patients and return their prescription history + insurance info
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  patients,
  patientInsurance,
  insuranceCompanies,
  pharmacyOrders,
  pharmacyOrderItems,
} from "@/lib/db/schema";
import { eq, and, or, ilike, desc, isNull } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import {
  getOpenEHREHRBySubjectId,
  getOpenEHRPrescriptions,
} from "@/lib/openehr/openehr";

export async function GET(
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const patientid = searchParams.get("patientid");

    // If patientid is provided, fetch full patient detail with prescriptions + insurance
    if (patientid) {
      // Facility-scoped reads under a tenant, released before EHRbase is
      // called — a transaction must not stay open across an HTTP request to
      // another service.
      const pre = await withTenant(workspaceid, async () => {
      const [patient] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.patientid, patientid), eq(patients.workspaceid, workspaceid)))
        .limit(1);

      if (!patient) return null;

      // Fetch insurance info
      const insuranceData = await db
        .select({
          patientinsuranceid: patientInsurance.patientinsuranceid,
          policynumber: patientInsurance.policynumber,
          groupnumber: patientInsurance.groupnumber,
          startdate: patientInsurance.startdate,
          enddate: patientInsurance.enddate,
          isprimary: patientInsurance.isprimary,
          isactive: patientInsurance.isactive,
          insuranceid: insuranceCompanies.insuranceid,
          companyname: insuranceCompanies.name,
          companycode: insuranceCompanies.code,
          coveragepercent: insuranceCompanies.coveragepercent,
          companyphone: insuranceCompanies.phone,
        })
        .from(patientInsurance)
        .innerJoin(insuranceCompanies, eq(patientInsurance.insuranceid, insuranceCompanies.insuranceid))
        .where(
          and(
            eq(patientInsurance.patientid, patientid),
            eq(patientInsurance.isactive, true)
          )
        );

        return { patient, insuranceData };
      });

      if (!pre) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }
      const { patient, insuranceData } = pre;

      // Fetch prescriptions from OpenEHR — no transaction open here
      let prescriptions: unknown[] = [];
      try {
        let ehrId: string | null = null;
        if (patient.nationalid) {
          ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
        }
        if (!ehrId) {
          ehrId = await getOpenEHREHRBySubjectId(patientid);
        }
        if (ehrId) {
          prescriptions = await getOpenEHRPrescriptions(ehrId);
        }
      } catch (err) {
        console.error("Error fetching OpenEHR prescriptions:", err);
      }

      // Orders and items are facility-scoped again, in their own short
      // transaction now that EHRbase is done with.
      const ordersWithItems = await withTenant(workspaceid, async () => {
      const orders = await db
        .select({
          orderid: pharmacyOrders.orderid,
          status: pharmacyOrders.status,
          priority: pharmacyOrders.priority,
          source: pharmacyOrders.source,
          createdat: pharmacyOrders.createdat,
          dispensedat: pharmacyOrders.dispensedat,
          notes: pharmacyOrders.notes,
        })
        .from(pharmacyOrders)
        .where(
          and(
            eq(pharmacyOrders.workspaceid, workspaceid),
            eq(pharmacyOrders.patientid, patientid)
          )
        )
        .orderBy(desc(pharmacyOrders.createdat))
        .limit(50);

      // Fetch order items for each order
      return await Promise.all(
        orders.map(async (order) => {
          const items = await db
            .select({
              itemid: pharmacyOrderItems.itemid,
              drugname: pharmacyOrderItems.drugname,
              dosage: pharmacyOrderItems.dosage,
              quantity: pharmacyOrderItems.quantity,
              unitprice: pharmacyOrderItems.unitprice,
              status: pharmacyOrderItems.status,
            })
            .from(pharmacyOrderItems)
            .where(eq(pharmacyOrderItems.orderid, order.orderid));
          return { ...order, items };
        })
      );
      });

      // Calculate patient age
      let age: number | null = null;
      if (patient.dateofbirth) {
        const birthDate = new Date(patient.dateofbirth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return NextResponse.json({
        patient: {
          patientid: patient.patientid,
          firstname: patient.firstname,
          middlename: patient.middlename,
          lastname: patient.lastname,
          nationalid: patient.nationalid,
          dateofbirth: patient.dateofbirth,
          gender: patient.gender,
          bloodgroup: patient.bloodgroup,
          phone: patient.phone,
          email: patient.email,
          age,
        },
        insurance: insuranceData,
        prescriptions,
        pharmacyOrders: ordersWithItems,
      });
    }

    // Search patients by name or national ID
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ patients: [] });
    }

    const searchPattern = `%${query.trim()}%`;
    const matchedPatients = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        middlename: patients.middlename,
        lastname: patients.lastname,
        nationalid: patients.nationalid,
        dateofbirth: patients.dateofbirth,
        gender: patients.gender,
        phone: patients.phone,
      })
      .from(patients)
      .where(
        and(
            // Shared-read since 0068; the global NULL pool is gone. RLS decides.
          or(
            ilike(patients.firstname, searchPattern),
            ilike(patients.lastname, searchPattern),
            ilike(patients.nationalid, searchPattern),
            ilike(patients.phone, searchPattern)
          )
        )
      )
      .limit(10);

    return NextResponse.json({ patients: matchedPatients });
  } catch (error) {
    console.error("[Pharmacy Prescriptions]", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
