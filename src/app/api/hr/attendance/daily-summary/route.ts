/**
 * Daily Attendance Summary API
 * GET /api/hr/attendance/daily-summary - Get today's attendance for all employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all attendance records for the specified date
    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select(`
        *,
        employees(
          id,
          employee_number,
          first_name,
          last_name,
          departments(name)
        )
      `)
      .eq('attendance_date', date)
      .order('check_in', { ascending: true });

    if (attError) {
      console.error('Error fetching attendance:', attError);
      return NextResponse.json(errorResponse('Failed to fetch attendance summary'), { status: 500 });
    }

    // Get all active employees
    const { data: allEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_number, first_name, last_name, departments(name)')
      .eq('employment_status', 'ACTIVE')
      .order('employee_number');

    if (empError) {
      console.error('Error fetching employees:', empError);
      return NextResponse.json(errorResponse('Failed to fetch employees'), { status: 500 });
    }

    // Create a map of employee IDs who have attendance records
    const attendedEmployeeIds = new Set(attendance?.map(a => a.employee_id) || []);

    // Calculate summary statistics
    const summary = {
      date,
      total_employees: allEmployees?.length || 0,
      present: attendance?.filter(a => a.status === 'PRESENT').length || 0,
      absent: (allEmployees?.length || 0) - attendedEmployeeIds.size,
      late: attendance?.filter(a => {
        if (!a.check_in) return false;
        const checkInTime = new Date(a.check_in);
        const hour = checkInTime.getHours();
        const minute = checkInTime.getMinutes();
        // Consider late if check-in is after 9:00 AM
        return hour > 9 || (hour === 9 && minute > 0);
      }).length || 0,
      on_leave: 0, // Would need to check leave_requests table
      checked_in: attendance?.filter(a => a.check_in && !a.check_out).length || 0,
      checked_out: attendance?.filter(a => a.check_in && a.check_out).length || 0,
      attendance_records: attendance,
      absent_employees: allEmployees?.filter(emp => !attendedEmployeeIds.has(emp.id)) || [],
    };

    return NextResponse.json(successResponse(summary));
  } catch (error: any) {
    console.error('GET /api/hr/attendance/daily-summary error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
