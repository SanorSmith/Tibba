/**
 * PUT /api/lims/billing/test-price — set what this lab charges for a test.
 *
 * Prices live in test_reference_ranges, keyed by test code and facility, so
 * two labs can charge differently for the same test. Setting a price here
 * means the next order for that code arrives at the counter already priced
 * instead of needing to be typed again.
 *
 * A test with no code cannot be saved — there would be nothing to match the
 * next order against. Those can still be priced on the cart line for the sale
 * in hand.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testReferenceRanges } from "@/lib/db/schema/test-reference-ranges";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceid, testCode, testName, price } = await request.json();
    if (!workspaceid || !testCode) {
      return NextResponse.json(
        { error: "This test has no code, so a price cannot be saved against it." },
        { status: 400 }
      );
    }
    if (!(Number(price) >= 0)) {
      return NextResponse.json({ error: "Price must be zero or above" }, { status: 400 });
    }

    const [existing] = await db
      .select({ rangeid: testReferenceRanges.rangeid })
      .from(testReferenceRanges)
      .where(
        and(
          eq(testReferenceRanges.workspaceid, workspaceid),
          eq(testReferenceRanges.testcode, testCode)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(testReferenceRanges)
        .set({
          price: String(Number(price).toFixed(2)),
          updatedby: user.userid,
          updatedat: new Date(),
        })
        .where(eq(testReferenceRanges.rangeid, existing.rangeid));
      return NextResponse.json({ ok: true, created: false });
    }

    // No reference range for this code yet — create a minimal one carrying the
    // price. Clinical ranges are set separately in Lab Management; this only
    // establishes what the test costs.
    await db.insert(testReferenceRanges).values({
      workspaceid,
      testcode: testCode,
      testname: testName ?? testCode,
      unit: "unit",
      price: String(Number(price).toFixed(2)),
      isactive: "Y",
      createdby: user.userid,
    });

    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    console.error("[lab test-price]", error);
    return NextResponse.json({ error: "Could not save the price" }, { status: 500 });
  }
}
