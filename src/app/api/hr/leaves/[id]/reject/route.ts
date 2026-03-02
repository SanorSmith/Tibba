/**
 * Reject Leave Request API
 * PUT /api/hr/leaves/:id/reject - Reject leave with reason
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '@/lib/api-response';
import { rejectLeaveSchema } from '@/lib/validations/hr-schemas';
import { requireRoles, logAudit } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireRoles(request, ['supervisor', 'hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { id } = params;
    const body = await request.json();

    // Validate input
    const validatedData = rejectLeaveSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json(errorResponse('Leave request not found'), { status: 404 });
    }

    // Check if already processed
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        errorResponse(`Leave request is already ${leaveRequest.status.toLowerCase()}`),
        { status: 400 }
      );
    }

    // Update leave request with rejection
    const updateData = {
      status: 'REJECTED',
      rejected_by: validatedData.rejected_by,
      rejected_at: new Date().toISOString(),
      rejection_reason: validatedData.rejection_reason,
      updated_at: new Date().toISOString(),
    };

    const { data: rejected, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employees(id, employee_number, first_name, last_name, departments(name))
      `)
      .single();

    if (error) {
      console.error('Error rejecting leave:', error);
      return NextResponse.json(errorResponse('Failed to reject leave request'), { status: 500 });
    }

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'REJECT_LEAVE',
      entity_type: 'leave_request',
      entity_id: id,
      changes: {
        before: leaveRequest,
        after: rejected,
      },
    });

    return NextResponse.json(
      successResponse({
        ...rejected,
        message: 'Leave request rejected',
      })
    );
  } catch (error: any) {
    console.error('PUT /api/hr/leaves/:id/reject error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
