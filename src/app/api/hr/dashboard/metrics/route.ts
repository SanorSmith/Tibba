import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const today = new Date().toISOString().split('T')[0];
    
    // Get total active employees (all staff are considered active)
    const activeEmployeesResult = await pool.query(
      'SELECT COUNT(*) as count FROM staff WHERE workspaceid = $1',
      [workspaceId]
    );
    const totalActiveEmployees = parseInt(activeEmployeesResult.rows[0].count);

    // Get today's attendance
    const attendanceResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT employee_id) as present_count,
        (SELECT COUNT(*) FROM staff WHERE workspaceid = $2) as total_count
      FROM attendance_transactions 
      WHERE DATE(timestamp) = $1 
        AND transaction_type = 'IN'
        AND is_valid = true
        AND workspaceid = $2
    `, [today, workspaceId]);
    
    const attendanceData = attendanceResult.rows[0];
    const presentCount = parseInt(attendanceData.present_count);
    const totalCount = parseInt(attendanceData.total_count);
    const todayAttendanceRate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

    // Get pending leave requests
    const pendingLeavesResult = await pool.query(
      "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'PENDING' AND workspaceid = $1",
      [workspaceId]
    );
    const pendingLeaveRequests = parseInt(pendingLeavesResult.rows[0].count);

    // Get upcoming license expiries (next 30 days) - mock for now since no license_expiry_date column
    const upcomingLicenseExpiries = 0;

    // Get current month payroll status (mock for now)
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const currentMonthPayrollStatus = 'Processing';

    // Get recent alerts (unread notifications)
    const alertsResult = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE is_read = false AND workspaceid = $1',
      [workspaceId]
    );
    const recentAlerts = parseInt(alertsResult.rows[0].count);

    // Get attendance trend for last 30 days
    const attendanceTrendResult = await pool.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(DISTINCT employee_id) * 100.0 / NULLIF((SELECT COUNT(*) FROM staff WHERE workspaceid = $1), 0) as rate
      FROM attendance_transactions 
      WHERE DATE(timestamp) >= CURRENT_DATE - INTERVAL '29 days'
        AND transaction_type = 'IN'
        AND is_valid = true
        AND workspaceid = $1
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `, [workspaceId]);
    
    const attendanceTrend = attendanceTrendResult.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rate: Math.round(parseFloat(row.rate))
    }));

    // Get department headcount
    const departmentResult = await pool.query(`
      SELECT 
        COALESCE(unit, 'Unassigned') as department,
        COUNT(*) as count
      FROM staff 
      WHERE workspaceid = $1
      GROUP BY unit
      ORDER BY count DESC
    `, [workspaceId]);
    
    const departmentHeadcount = departmentResult.rows.map(row => ({
      department: row.department,
      count: parseInt(row.count)
    }));

    // Get overtime by week (last 8 weeks)
    const overtimeResult = await pool.query(`
      SELECT 
        'Week ' || EXTRACT(WEEK FROM timestamp) - EXTRACT(WEEK FROM CURRENT_DATE - INTERVAL '7 weeks') + 1 as week,
        ROUND(SUM(CASE 
          WHEN EXTRACT(HOUR FROM timestamp) >= 18 
            OR EXTRACT(HOUR FROM timestamp) < 6 
          THEN 1 
          ELSE 0 
        END) * 0.5, 1) as hours
      FROM attendance_transactions 
      WHERE timestamp >= CURRENT_DATE - INTERVAL '7 weeks'
        AND timestamp < CURRENT_DATE
        AND is_valid = true
        AND workspaceid = $1
      GROUP BY EXTRACT(WEEK FROM timestamp)
      ORDER BY week
    `, [workspaceId]);
    
    const overtimeByWeek = overtimeResult.rows.map(row => ({
      week: row.week,
      hours: parseFloat(row.hours) || 0
    }));

    const metrics = {
      totalActiveEmployees,
      todayAttendanceRate: Math.round(todayAttendanceRate * 10) / 10,
      pendingLeaveRequests,
      upcomingLicenseExpiries,
      currentMonthPayrollStatus,
      recentAlerts,
      attendanceTrend,
      departmentHeadcount,
      overtimeByWeek
    };

    return NextResponse.json({
      success: true,
      data: metrics
    });

    });
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch dashboard metrics'
    }, { status: 500 });
  }
}
