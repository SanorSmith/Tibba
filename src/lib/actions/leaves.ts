'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

/**
 * Get leave requests with filtering
 */
export async function getLeaveRequests(filters?: {
  employeeId?: string;
  status?: string;
  leaveTypeId?: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(
          id,
          employee_number,
          first_name,
          last_name,
          department:departments!employees_department_id_fkey(name)
        ),
        leave_type:leave_types(id, name, code)
      `)
      .eq('organization_id', session.organizationId)
      .order('created_at', { ascending: false });

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.leaveTypeId) {
      query = query.eq('leave_type_id', filters.leaveTypeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return { success: false, error: 'Failed to fetch leave requests' };
  }
}

/**
 * Get a single leave request by ID
 */
export async function getLeaveRequestById(id: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(
          id,
          employee_number,
          first_name,
          last_name,
          email,
          phone,
          department:departments!employees_department_id_fkey(name)
        ),
        leave_type:leave_types(id, name, code, name_ar, max_days_per_year, paid)
      `)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching leave request:', error);
    return { success: false, error: 'Leave request not found', data: null };
  }
}

/**
 * Create leave request with balance validation
 */
export async function createLeaveRequest(requestData: {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  contact_number?: string;
  supporting_document_url?: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Calculate working days (excluding Iraqi weekends: Friday & Saturday)
    const start = new Date(requestData.start_date);
    const end = new Date(requestData.end_date);
    let workingDays = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Check leave balance
    const year = new Date().getFullYear();
    const { data: balance } = await supabaseAdmin
      .from('leave_balances')
      .select('available_days')
      .eq('employee_id', requestData.employee_id)
      .eq('leave_type_id', requestData.leave_type_id)
      .eq('year', year)
      .single();

    if (!balance || balance.available_days < workingDays) {
      return {
        success: false,
        error: `Insufficient leave balance. Available: ${balance?.available_days || 0} days, Requested: ${workingDays} days`
      };
    }

    // Generate request number
    const requestNumber = `LR-${Date.now()}`;

    // Get approver (department head)
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('department_id')
      .eq('id', requestData.employee_id)
      .single();

    let approver1Id = null;
    if (employee?.department_id) {
      const { data: department } = await supabaseAdmin
        .from('departments')
        .select('head_employee_id')
        .eq('id', employee.department_id)
        .single();
      approver1Id = department?.head_employee_id || null;
    }

    // Create leave request
    const { data: request, error } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        organization_id: session.organizationId,
        employee_id: requestData.employee_id,
        leave_type_id: requestData.leave_type_id,
        request_number: requestNumber,
        start_date: requestData.start_date,
        end_date: requestData.end_date,
        total_days: workingDays,
        reason: requestData.reason,
        contact_number: requestData.contact_number || null,
        supporting_document_url: requestData.supporting_document_url || null,
        status: 'PENDING',
        approver_1_id: approver1Id,
        approver_1_status: 'PENDING'
      })
      .select()
      .single();

    if (error) throw error;

    // Update pending days in balance
    await supabaseAdmin
      .from('leave_balances')
      .update({
        pending_days: (balance.available_days > 0) ? workingDays : 0
      })
      .eq('employee_id', requestData.employee_id)
      .eq('leave_type_id', requestData.leave_type_id)
      .eq('year', year);

    revalidatePath('/hr/leaves/requests');

    return { success: true, data: request };
  } catch (error) {
    console.error('Error creating leave request:', error);
    return { success: false, error: 'Failed to create leave request' };
  }
}

/**
 * Approve leave request (multi-level approval)
 */
export async function approveLeaveRequest(
  requestId: string,
  approverLevel: 1 | 2 | 3,
  remarks?: string
) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data: request } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) throw new Error('Leave request not found');

    const updates: Record<string, any> = {
      [`approver_${approverLevel}_status`]: 'APPROVED',
      [`approver_${approverLevel}_date`]: new Date().toISOString(),
      [`approver_${approverLevel}_remarks`]: remarks || null
    };

    // Check if this is the final approval
    const isFinalApproval =
      (approverLevel === 1 && !request.approver_2_id) ||
      (approverLevel === 2 && !request.approver_3_id) ||
      (approverLevel === 3);

    if (isFinalApproval) {
      updates.status = 'APPROVED';

      // Move balance from pending to used
      const year = new Date().getFullYear();
      const { data: balance } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('leave_type_id', request.leave_type_id)
        .eq('year', year)
        .single();

      if (balance) {
        await supabaseAdmin
          .from('leave_balances')
          .update({
            used_days: balance.used_days + request.total_days,
            pending_days: Math.max(0, balance.pending_days - request.total_days)
          })
          .eq('id', balance.id);
      }

      // Create attendance records for leave period
      const leaveDates: string[] = [];
      const dateCursor = new Date(request.start_date);
      const endDate = new Date(request.end_date);

      while (dateCursor <= endDate) {
        const dayOfWeek = dateCursor.getDay();
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
          leaveDates.push(dateCursor.toISOString().split('T')[0]);
        }
        dateCursor.setDate(dateCursor.getDate() + 1);
      }

      if (leaveDates.length > 0) {
        const attendanceRecords = leaveDates.map(date => ({
          organization_id: session.organizationId,
          employee_id: request.employee_id,
          attendance_date: date,
          status: 'LEAVE',
          approved_by: session.employeeId || null,
          approved_at: new Date().toISOString()
        }));

        await supabaseAdmin
          .from('attendance_records')
          .upsert(attendanceRecords, { onConflict: 'employee_id,attendance_date' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/leaves/requests');
    revalidatePath(`/hr/leaves/requests/${requestId}`);

    return { success: true, data };
  } catch (error) {
    console.error('Error approving leave request:', error);
    return { success: false, error: 'Failed to approve leave request' };
  }
}

/**
 * Reject leave request
 */
export async function rejectLeaveRequest(
  requestId: string,
  rejectionReason: string
) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data: request } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) throw new Error('Leave request not found');

    // Restore pending days in balance
    const year = new Date().getFullYear();
    const { data: balance } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('employee_id', request.employee_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', year)
      .single();

    if (balance) {
      await supabaseAdmin
        .from('leave_balances')
        .update({
          pending_days: Math.max(0, balance.pending_days - request.total_days)
        })
        .eq('id', balance.id);
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'REJECTED',
        rejected_by: session.employeeId || null,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/leaves/requests');

    return { success: true, data };
  } catch (error) {
    console.error('Error rejecting leave request:', error);
    return { success: false, error: 'Failed to reject leave request' };
  }
}

/**
 * Get leave balances for an employee
 */
export async function getLeaveBalances(employeeId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const year = new Date().getFullYear();

    const { data, error } = await supabaseAdmin
      .from('leave_balances')
      .select(`
        *,
        leave_type:leave_types(id, name, code, name_ar)
      `)
      .eq('employee_id', employeeId)
      .eq('year', year);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    return { success: false, error: 'Failed to fetch leave balances' };
  }
}

/**
 * Get all leave types for the organization
 */
export async function getLeaveTypes() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('leave_types')
      .select('*')
      .eq('organization_id', session.organizationId)
      .eq('active', true)
      .order('name');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching leave types:', error);
    return { success: false, error: 'Failed to fetch leave types' };
  }
}

/**
 * Adjust leave balance (manual adjustment by HR)
 */
export async function adjustLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  amount: number,
  _reason: string
) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const year = new Date().getFullYear();

    const { data: balance } = await supabaseAdmin
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', year)
      .single();

    if (!balance) {
      return { success: false, error: 'Balance record not found' };
    }

    const { data, error } = await supabaseAdmin
      .from('leave_balances')
      .update({
        total_entitlement: balance.total_entitlement + amount
      })
      .eq('id', balance.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/leaves');

    return { success: true, data };
  } catch (error) {
    console.error('Error adjusting leave balance:', error);
    return { success: false, error: 'Failed to adjust leave balance' };
  }
}
