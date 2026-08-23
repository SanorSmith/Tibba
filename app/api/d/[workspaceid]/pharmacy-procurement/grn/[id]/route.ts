import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyGoodsReceipt,
  pharmacyGoodsReceiptItems,
  pharmacyClaimDamage,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; id: string }> }
) {
  const { workspaceid, id } = await params;

  // This route had no authentication at all: the facility's data was
  // served to anyone who could type the URL. Who you are, whether you
  // belong here, and only then the data.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return withTenant(workspaceid, async () => {
  try {
    const [receipt] = await db
      .select()
      .from(pharmacyGoodsReceipt)
      .where(eq(pharmacyGoodsReceipt.id, id));

    if (!receipt)
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const receiptItems = await db
      .select()
      .from(pharmacyGoodsReceiptItems)
      .where(eq(pharmacyGoodsReceiptItems.receiptid, id));

    const claims = await db
      .select()
      .from(pharmacyClaimDamage)
      .where(eq(pharmacyClaimDamage.receiptid, id));

    return NextResponse.json({ receipt, items: receiptItems, claims });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}
