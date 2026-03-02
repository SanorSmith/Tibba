/**
 * Attendance Check-Out API
 * POST /api/hr/attendance/check-out - Clock out with automatic hours calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkOutSchema } from '@/lib/validations/hr-schemas';
import { requireAuth, logAudit } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Calculate hours worked and overtime
 */
function calculateHours(checkIn: string, checkOut: string) {
  const checkInTime = new Date(checkIn);
  const checkOutTime = new Date(checkOut);
  
  const diffMs = checkOutTime.getTime() - checkInTime.getTime();
  const hoursWorked = diffMs / (1000 * 60 * 60);
  
  // Standard work day is 8 hours
  const overtimeHours = Math.max(hoursWorked - 8, 0);
  
  return {
    total_hours: Math.round(hoursWorked * 100) / 100,
    overtime_hours: Math.round(overtimeHours * 100) / 100,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    // Validate input
    const validatedData = checkOutSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get attendance record
    const { data: attendance, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', validatedData.attendance_id)
      .single();

    if (fetchError || !attendance) {
      return NextResponse.json(errorResponse('Attendance record not found'), { status: 404 });
    }

    // Check if already checked out
    if (attendance.check_out) {
      return NextResponse.json(
        errorResponse('Already checked out for this attendance record'),
        { status: 400 }
      );
    }

    // Calculate hours
    const checkOutTime = new Date().toISOString();
    const { total_hours, overtime_hours } = calculateHours(attendance.check_in, checkOutTime);

    // Update attendance record
    const updateData = {
      check_out: checkOutTime,
      total_hours,
      overtime_hours,
      notes: validatedData.notes ? `${attendance.notes || ''}\n${validatedData.notes}`.trim() : attendance.notes,
      metadata: {
        ...attendance.metadata,
        check_out_device_id: validatedData.device_id,
        check_out_location: validatedData.location,
      },
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', validatedData.attendance_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating attendance:', error);
      return NextResponse.json(errorResponse('Failed to check out'), { status: 500 });
    }

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'CHECK_OUT',
      entity_type: 'attendance',
      entity_id: validatedData.attendance_id,
      changes: {
        before: attendance,
        after: updated,
      },
    });

    return NextResponse.json(
      successResponse({
        ...updated,
        message: `Checked out successfully. Total hours: ${total_hours}h${overtime_hours > 0 ? `, Overtime: ${overtime_hours}h` : ''}`,
      })
    );
  } catch (error: any) {
    console.error('POST /api/hr/attendance/check-out error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
