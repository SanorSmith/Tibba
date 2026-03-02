/**
 * Submit Workflow API
 * POST /api/hr/workflows/submit - Submit entity for approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, logAudit } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { workflowService, EntityType } from '@/services/workflow-service';
import { z } from 'zod';

const submitWorkflowSchema = z.object({
  entity_type: z.enum(['leave_request', 'overtime_request', 'expense_claim', 'loan_request', 'advance_request']),
  entity_id: z.string().uuid('Invalid entity ID'),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    // Validate input
    const validatedData = submitWorkflowSchema.parse(body);

    // Submit for approval
    const result = await workflowService.submitForApproval(
      validatedData.entity_type as EntityType,
      validatedData.entity_id,
      user.id
    );

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'SUBMIT_FOR_APPROVAL',
      entity_type: validatedData.entity_type,
      entity_id: validatedData.entity_id,
      changes: {
        workflow_id: result.workflow_id,
        total_levels: result.total_levels,
      },
    });

    return NextResponse.json(
      successResponse({
        ...result,
        message: result.total_levels === 0 
          ? 'Request auto-approved' 
          : `Submitted for ${result.total_levels}-level approval`,
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/hr/workflows/submit error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
