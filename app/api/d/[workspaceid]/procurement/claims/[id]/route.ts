import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supplierClaims } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { UpdateSupplierClaimRequest } from '@/lib/types/procurement';
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

// PUT /api/d/[workspaceid]/procurement/claims/[id] - Update claim
const updateClaimSchema = z.object({
  status: z.enum(['submitted', 'approved', 'rejected', 'resolved']).optional(),
  resolutionnotes: z.string().optional(),
  resolveddate: z.string().optional(),
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

    return await withTenant(workspaceid, async () => {
    const body = await req.json();
    const validated = updateClaimSchema.parse(body);

    const updateData: any = {};
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.resolutionnotes !== undefined) updateData.resolutionnotes = validated.resolutionnotes;
    if (validated.resolveddate !== undefined) updateData.resolveddate = new Date(validated.resolveddate);
    updateData.updatedat = new Date();

    const [updatedClaim] = await db
      .update(supplierClaims)
      .set(updateData)
      .where(and(eq(supplierClaims.id, id), eq(supplierClaims.workspaceid, workspaceid)))
      .returning();

    if (!updatedClaim) {
      return NextResponse.json({ error: 'Supplier claim not found' }, { status: 404 });
    }

    return NextResponse.json(updatedClaim);
    });
  } catch (error) {
    console.error('Error updating supplier claim:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update supplier claim' }, { status: 500 });
  }
}

// DELETE /api/d/[workspaceid]/procurement/claims/[id] - Delete claim
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

    return await withTenant(workspaceid, async () => {

    const [deletedClaim] = await db
      .delete(supplierClaims)
      .where(and(eq(supplierClaims.id, id), eq(supplierClaims.workspaceid, workspaceid)))
      .returning();

    if (!deletedClaim) {
      return NextResponse.json({ error: 'Supplier claim not found' }, { status: 404 });
    }

    return NextResponse.json(deletedClaim);
    });
  } catch (error) {
    console.error('Error deleting supplier claim:', error);
    return NextResponse.json({ error: 'Failed to delete supplier claim' }, { status: 500 });
  }
}
