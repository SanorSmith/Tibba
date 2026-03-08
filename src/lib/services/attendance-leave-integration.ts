import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// TYPES
// =====================================================

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_code: string;
  start_date: string;
  end_date: string;
  return_date: string;
  working_days_count: number;
  status: string;
}

export interface AttendanceUpdateResult {
  success: boolean;
  records_created: number;
  records_updated: number;
  dates_processed: string[];
  errors?: string[];
}

// =====================================================
// AUTO-MARK ATTENDANCE ON LEAVE APPROVAL
// =====================================================

export async function updateAttendanceForApprovedLeave(
  leaveRequest: LeaveRequest
): Promise<AttendanceUpdateResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result: AttendanceUpdateResult = {
      success: true,
      records_created: 0,
      records_updated: 0,
      dates_processed: [],
      errors: [],
    };
    
    // Generate all dates in the leave period
    const dates = generateDateRange(
      new Date(leaveRequest.start_date),
      new Date(leaveRequest.end_date)
    );
    
    // Get employee details
    const empResult = await client.query(
      `SELECT staffid, firstname, lastname, custom_staff_id, unit 
       FROM staff WHERE staffid = $1`,
      [leaveRequest.employee_id]
    );
    
    if (empResult.rows.length === 0) {
      throw new Error(`Employee not found: ${leaveRequest.employee_id}`);
    }
    
    const employee = empResult.rows[0];
    
    // Process each date
    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        // Check if attendance record exists
        const existingRecord = await client.query(
          `SELECT id, status FROM daily_attendance 
           WHERE employee_id = $1 AND date = $2`,
          [leaveRequest.employee_id, dateStr]
        );
        
        if (existingRecord.rows.length > 0) {
          // Update existing record
          await client.query(
            `UPDATE daily_attendance 
             SET status = 'LEAVE',
                 updated_at = NOW()
             WHERE employee_id = $1 AND date = $2`,
            [leaveRequest.employee_id, dateStr]
          );
          result.records_updated++;
        } else {
          // Create new attendance record
          await client.query(
            `INSERT INTO daily_attendance (
              employee_id,
              employee_name,
              employee_number,
              date,
              status,
              processed,
              processed_at,
              processed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
            [
              leaveRequest.employee_id,
              `${employee.firstname} ${employee.lastname}`,
              employee.custom_staff_id,
              dateStr,
              'LEAVE',
              true,
              'SYSTEM_LEAVE_APPROVAL',
            ]
          );
          result.records_created++;
        }
        
        result.dates_processed.push(dateStr);
      } catch (error: any) {
        result.errors?.push(`Error processing ${dateStr}: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Attendance updated for leave request ${leaveRequest.id}:`, {
      created: result.records_created,
      updated: result.records_updated,
      dates: result.dates_processed.length,
    });
    
    return result;
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating attendance for leave:', error);
    return {
      success: false,
      records_created: 0,
      records_updated: 0,
      dates_processed: [],
      errors: [error.message],
    };
  } finally {
    client.release();
  }
}

// =====================================================
// RESTORE ATTENDANCE ON LEAVE CANCELLATION
// =====================================================

export async function restoreAttendanceOnLeaveCancellation(
  leaveRequest: LeaveRequest
): Promise<AttendanceUpdateResult> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result: AttendanceUpdateResult = {
      success: true,
      records_created: 0,
      records_updated: 0,
      dates_processed: [],
      errors: [],
    };
    
    // Generate all dates in the leave period
    const dates = generateDateRange(
      new Date(leaveRequest.start_date),
      new Date(leaveRequest.end_date)
    );
    
    // Process each date
    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        // Check if attendance record exists and was marked as LEAVE
        const existingRecord = await client.query(
          `SELECT id, status FROM daily_attendance 
           WHERE employee_id = $1 AND date = $2 AND status = 'LEAVE'`,
          [leaveRequest.employee_id, dateStr]
        );
        
        if (existingRecord.rows.length > 0) {
          // Check if there are actual attendance transactions for this date
          const hasTransactions = await client.query(
            `SELECT COUNT(*) as count FROM attendance_transactions 
             WHERE employee_id = $1 
             AND DATE(timestamp) = $2`,
            [leaveRequest.employee_id, dateStr]
          );
          
          if (parseInt(hasTransactions.rows[0].count) > 0) {
            // Has transactions, mark as PRESENT
            await client.query(
              `UPDATE daily_attendance 
               SET status = 'PRESENT',
                   updated_at = NOW()
               WHERE employee_id = $1 AND date = $2`,
              [leaveRequest.employee_id, dateStr]
            );
          } else {
            // No transactions, mark as ABSENT
            await client.query(
              `UPDATE daily_attendance 
               SET status = 'ABSENT',
                   updated_at = NOW()
               WHERE employee_id = $1 AND date = $2`,
              [leaveRequest.employee_id, dateStr]
            );
          }
          
          result.records_updated++;
          result.dates_processed.push(dateStr);
        }
      } catch (error: any) {
        result.errors?.push(`Error restoring ${dateStr}: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ Attendance restored for cancelled leave ${leaveRequest.id}:`, {
      updated: result.records_updated,
      dates: result.dates_processed.length,
    });
    
    return result;
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error restoring attendance:', error);
    return {
      success: false,
      records_created: 0,
      records_updated: 0,
      dates_processed: [],
      errors: [error.message],
    };
  } finally {
    client.release();
  }
}

// =====================================================
// CHECK ACTIVE LEAVE FOR DATE
// =====================================================

export async function checkActiveLeave(
  employeeId: string,
  date: string
): Promise<LeaveRequest | null> {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        employee_id,
        leave_type_code,
        start_date,
        end_date,
        return_date,
        working_days_count,
        status
       FROM leave_requests
       WHERE employee_id = $1
       AND status = 'APPROVED'
       AND $2 BETWEEN start_date AND COALESCE(return_date, end_date)
       LIMIT 1`,
      [employeeId, date]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0] as LeaveRequest;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error checking active leave:', error);
    return null;
  }
}

// =====================================================
// SYNC ALL APPROVED LEAVES TO ATTENDANCE
// =====================================================

export async function syncAllApprovedLeavesToAttendance(): Promise<{
  success: boolean;
  leaves_processed: number;
  total_records: number;
  errors: string[];
}> {
  try {
    // Get all approved leaves
    const result = await pool.query(
      `SELECT 
        id,
        employee_id,
        leave_type_code,
        start_date,
        end_date,
        return_date,
        working_days_count,
        status
       FROM leave_requests
       WHERE status = 'APPROVED'
       ORDER BY start_date`
    );
    
    const summary = {
      success: true,
      leaves_processed: 0,
      total_records: 0,
      errors: [] as string[],
    };
    
    for (const leave of result.rows) {
      const updateResult = await updateAttendanceForApprovedLeave(leave);
      
      if (updateResult.success) {
        summary.leaves_processed++;
        summary.total_records += updateResult.records_created + updateResult.records_updated;
      } else {
        summary.errors.push(`Leave ${leave.id}: ${updateResult.errors?.join(', ')}`);
      }
    }
    
    console.log(`✅ Sync completed:`, summary);
    
    return summary;
  } catch (error: any) {
    console.error('❌ Error syncing leaves to attendance:', error);
    return {
      success: false,
      leaves_processed: 0,
      total_records: 0,
      errors: [error.message],
    };
  }
}

// =====================================================
// HELPER: Generate Date Range
// =====================================================

function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  updateAttendanceForApprovedLeave,
  restoreAttendanceOnLeaveCancellation,
  checkActiveLeave,
  syncAllApprovedLeavesToAttendance,
};
