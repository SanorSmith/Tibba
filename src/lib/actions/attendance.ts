'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

/**
 * Get attendance records for a date range
 */
export async function getAttendanceRecords(startDate?: string, endDate?: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    let query = supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        employee:employees!attendance_records_employee_id_fkey(
          id,
          employee_number,
          first_name,
          last_name,
          department:departments!employees_department_id_fkey(name)
        )
      `)
      .eq('organization_id', session.organizationId)
      .order('attendance_date', { ascending: false });

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return { success: false, error: 'Failed to fetch attendance records' };
  }
}

/**
 * Record check-in (biometric or manual)
 */
export async function recordCheckIn(employeeId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if already checked in today
    const { data: existing } = await supabaseAdmin
      .from('attendance_records')
      .select('id, check_in')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .single();

    if (existing?.check_in) {
      return { success: false, error: 'Already checked in today' };
    }

    // Calculate if late (assuming work starts at 8:00 AM)
    const checkInTime = new Date(now);
    const workStartTime = new Date(today + 'T08:00:00');
    const lateMinutes = Math.max(0, Math.floor((checkInTime.getTime() - workStartTime.getTime()) / 60000));

    const status = lateMinutes > 0 ? 'LATE' : 'PRESENT';

    if (existing) {
      // Update existing record
      const { data, error } = await supabaseAdmin
        .from('attendance_records')
        .update({
          check_in: now,
          status,
          late_minutes: lateMinutes
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      revalidatePath('/hr/attendance');
      return { success: true, data };
    } else {
      // Create new record
      const { data, error } = await supabaseAdmin
        .from('attendance_records')
        .insert({
          organization_id: session.organizationId,
          employee_id: employeeId,
          attendance_date: today,
          check_in: now,
          status,
          late_minutes: lateMinutes
        })
        .select()
        .single();

      if (error) throw error;

      revalidatePath('/hr/attendance');
      return { success: true, data };
    }
  } catch (error) {
    console.error('Error recording check-in:', error);
    return { success: false, error: 'Failed to record check-in' };
  }
}

/**
 * Record check-out
 */
export async function recordCheckOut(employeeId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { data: record } = await supabaseAdmin
      .from('attendance_records')
      .select('id, check_in, check_out')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .single();

    if (!record) {
      return { success: false, error: 'No check-in found for today' };
    }

    if (record.check_out) {
      return { success: false, error: 'Already checked out today' };
    }

    // Calculate total hours
    const checkInTime = new Date(record.check_in);
    const checkOutTime = new Date(now);
    const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / 3600000;

    // Calculate overtime (assuming 8 hour workday)
    const overtimeHours = Math.max(0, totalHours - 8);

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .update({
        check_out: now,
        total_hours: totalHours,
        overtime_hours: overtimeHours
      })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/attendance');
    return { success: true, data };
  } catch (error) {
    console.error('Error recording check-out:', error);
    return { success: false, error: 'Failed to record check-out' };
  }
}

/**
 * Get attendance summary for dashboard
 */
export async function getAttendanceSummary(date?: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .select('status')
      .eq('organization_id', session.organizationId)
      .eq('attendance_date', targetDate);

    if (error) throw error;

    const summary = {
      total: data?.length || 0,
      present: data?.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length || 0,
      late: data?.filter(r => r.status === 'LATE').length || 0,
      absent: data?.filter(r => r.status === 'ABSENT').length || 0,
      leave: data?.filter(r => r.status === 'LEAVE').length || 0
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return { success: false, error: 'Failed to fetch attendance summary' };
  }
}

/**
 * Process attendance for a period (bulk operation)
 */
export async function processAttendance(startDate: string, endDate: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Get all active employees
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('organization_id', session.organizationId)
      .eq('active', true);

    if (!employees) throw new Error('No employees found');

    // Get all attendance records in the period
    const { data: records } = await supabaseAdmin
      .from('attendance_records')
      .select('employee_id, attendance_date')
      .eq('organization_id', session.organizationId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    // Create a set of existing records
    const existingRecords = new Set(
      records?.map(r => `${r.employee_id}-${r.attendance_date}`) || []
    );

    // Generate all working dates in range (skip Iraqi weekends: Fri=5, Sat=6)
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();

      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        dates.push(dateStr);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Mark absent for missing records
    const absentRecords = [];
    for (const employee of employees) {
      for (const date of dates) {
        const key = `${employee.id}-${date}`;
        if (!existingRecords.has(key)) {
          absentRecords.push({
            organization_id: session.organizationId,
            employee_id: employee.id,
            attendance_date: date,
            status: 'ABSENT',
            approved_by: session.employeeId || null,
            approved_at: new Date().toISOString()
          });
        }
      }
    }

    if (absentRecords.length > 0) {
      const { error } = await supabaseAdmin
        .from('attendance_records')
        .insert(absentRecords);

      if (error) throw error;
    }

    revalidatePath('/hr/attendance');

    return {
      success: true,
      data: {
        processed: absentRecords.length,
        message: `Processed ${absentRecords.length} absent records`
      }
    };
  } catch (error) {
    console.error('Error processing attendance:', error);
    return { success: false, error: 'Failed to process attendance' };
  }
}
