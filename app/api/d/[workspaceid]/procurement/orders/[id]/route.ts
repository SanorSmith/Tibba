import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { purchaseOrders, purchaseOrderItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { UpdatePurchaseOrderRequest } from '@/lib/types/procurement';
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

// PUT /api/d/[workspaceid]/procurement/orders/[id] - Update PO
const updatePOSchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'sent', 'partial', 'complete', 'cancelled']).optional(),
  expecteddate: z.string().optional(),
  paymentterms: z.number().optional(),
  shippingaddress: z.string().optional(),
  notes: z.string().optional(),
  approvedby: z.string().optional(),
  sentby: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const { workspaceid, id } = params;

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
    const body = await req.json();
    const validated = updatePOSchema.parse(body);

    const updateData: any = {};
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.expecteddate !== undefined) updateData.expecteddate = new Date(validated.expecteddate);
    if (validated.paymentterms !== undefined) updateData.paymentterms = validated.paymentterms;
    if (validated.shippingaddress !== undefined) updateData.shippingaddress = validated.shippingaddress;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    if (validated.approvedby !== undefined) updateData.approvedby = validated.approvedby;
    if (validated.sentby !== undefined) updateData.sentby = validated.sentby;
    updateData.updatedat = new Date();

    const [updatedPO] = await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, id))
      .returning();

    if (!updatedPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPO);
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 });
  }
}

// DELETE /api/d/[workspaceid]/procurement/orders/[id] - Cancel/Delete PO
export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const { workspaceid, id } = params;

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

    const [deletedPO] = await db
      .update(purchaseOrders)
      .set({ 
        status: 'canceled',
        updatedat: new Date(),
      })
      .where(eq(purchaseOrders.id, id))
      .returning();

    if (!deletedPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json(deletedPO);
    });
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    return NextResponse.json({ error: 'Failed to cancel purchase order' }, { status: 500 });
  }
}
