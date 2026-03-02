/**
 * Reject Workflow API
 * POST /api/hr/workflows/:id/reject - Reject workflow step
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, logAudit } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { workflowService } from '@/services/workflow-service';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
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
    const validatedData = rejectSchema.parse(body);

    // Reject workflow step
    const result = await workflowService.rejectStep(
      workflowId,
      user.id,
      validatedData.reason
    );

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'REJECT_WORKFLOW',
      entity_type: 'workflow',
      entity_id: workflowId,
      changes: {
        status: result.status,
        reason: validatedData.reason,
      },
    });

    return NextResponse.json(
      successResponse({
        ...result,
        message: 'Workflow rejected',
      })
    );
  } catch (error: any) {
    console.error('POST /api/hr/workflows/:id/reject error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
