/**
 * Attendance Check-In API
 * POST /api/hr/attendance/check-in - Clock in with timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkInSchema } from '@/lib/validations/hr-schemas';
import { requireAuth, logAudit } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    // Validate input
    const validatedData = checkInSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if employee exists and get department info
    const { data: employee } = await supabase
      .from('employees')
      .select('id, organization_id, department_id, departments(id, name)')
      .eq('id', validatedData.employee_id)
      .single();

    if (!employee) {
      return NextResponse.json(errorResponse('Employee not found'), { status: 404 });
    }

    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAttendance } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', validatedData.employee_id)
      .eq('attendance_date', today)
      .is('check_out', null)
      .single();

    if (existingAttendance) {
      return NextResponse.json(
        errorResponse('Already checked in today. Please check out first.'),
        { status: 400 }
      );
    }

    // Detect shift type based on check-in time
    const checkInTimeObj = new Date();
    const hour = checkInTimeObj.getHours();
    let shiftType = 'day';
    
    if (hour >= 0 && hour < 8) {
      shiftType = 'night';
    } else if (hour >= 8 && hour < 16) {
      shiftType = 'day';
    } else if (hour >= 16 && hour < 24) {
      shiftType = 'evening';
    }

    // Check if department is hazardous
    let isHazardShift = false;
    if (employee.department_id) {
      const { data: hazardDept } = await supabase
        .from('hazard_departments')
        .select('id')
        .eq('department_id', employee.department_id)
        .eq('is_active', true)
        .single();
      
      isHazardShift = !!hazardDept;
    }

    // Check for scheduled shift
    let shiftScheduleId = null;
    const { data: schedule } = await supabase
      .from('shift_schedules')
      .select('id, shift_id, shifts(shift_type)')
      .eq('employee_id', validatedData.employee_id)
      .eq('schedule_date', today)
      .single();

    if (schedule) {
      shiftScheduleId = schedule.id;
      // Use scheduled shift type if available
      const shifts = schedule.shifts as any;
      if (shifts && shifts.shift_type) {
        shiftType = shifts.shift_type;
      }
    }

    // Create attendance record
    const checkInTime = new Date().toISOString();
    const attendanceData = {
      organization_id: employee.organization_id,
      employee_id: validatedData.employee_id,
      attendance_date: today,
      check_in: checkInTime,
      check_out: null,
      total_hours: 0,
      overtime_hours: 0,
      status: 'PRESENT',
      shift_type: shiftType,
      is_hazard_shift: isHazardShift,
      shift_schedule_id: shiftScheduleId,
      notes: validatedData.notes || null,
      metadata: {
        device_id: validatedData.device_id,
        location: validatedData.location,
        detected_shift_type: shiftType,
        is_hazard_department: isHazardShift,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: attendance, error } = await supabase
      .from('attendance_records')
      .insert(attendanceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating attendance:', error);
      return NextResponse.json(errorResponse('Failed to check in'), { status: 500 });
    }

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'CHECK_IN',
      entity_type: 'attendance',
      entity_id: attendance.id,
      changes: attendanceData,
    });

    return NextResponse.json(
      successResponse({
        ...attendance,
        message: 'Checked in successfully',
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/hr/attendance/check-in error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
