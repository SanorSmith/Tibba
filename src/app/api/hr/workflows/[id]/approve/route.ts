/**
 * Approve Workflow API
 * POST /api/hr/workflows/:id/approve - Approve workflow step
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, logAudit } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { workflowService } from '@/services/workflow-service';
import { z } from 'zod';

const approveSchema = z.object({
  comments: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { id: workflowId } = params;
    const body = await request.json();

    // Validate input
    const validatedData = approveSchema.parse(body);

    // Approve workflow step
    const result = await workflowService.approveStep(
      workflowId,
      user.id,
      validatedData.comments
    );

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'APPROVE_WORKFLOW',
      entity_type: 'workflow',
      entity_id: workflowId,
      changes: {
        status: result.status,
        next_level: result.next_level,
        comments: validatedData.comments,
      },
    });

    let message = '';
    if (result.status === 'approved') {
      message = 'Workflow approved successfully';
    } else if (result.next_level) {
      message = `Approved. Moved to level ${result.next_level}`;
    }

    return NextResponse.json(
      successResponse({
        ...result,
        message,
      })
    );
  } catch (error: any) {
    console.error('POST /api/hr/workflows/:id/approve error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
