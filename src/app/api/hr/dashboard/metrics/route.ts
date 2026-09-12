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

    // Today's attendance, from the daily summary rather than the raw punches.
    //
    // This counted distinct people with an 'IN' punch, which cannot answer
    // "who is here". A punch is one input among several: someone marked
    // present by a manager has no punch, and someone on approved leave has no
    // punch either but is accounted for. On this deployment eighteen of the
    // nineteen daily rows were written by leave approval and were invisible
    // to the old query, while the HR dashboard next door read the summary and
    // reported a different number for the same day.
    //
    // attendance_transactions is not redundant - the punch handler writes it
    // and rolls it up into this table in the same request. It is the input
    // layer. This is the answer layer.
    const attendanceResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT employee_id) FILTER (WHERE status IN ('PRESENT', 'LATE', 'HALF_DAY')) as present_count,
        COUNT(DISTINCT employee_id) FILTER (WHERE status IN ('LEAVE', 'ON_LEAVE')) as on_leave_count,
        (SELECT COUNT(*) FROM staff WHERE workspaceid = $2) as total_count
      FROM daily_attendance
      WHERE date::date = $1
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

    // Alerts an HR officer would act on, from the last thirty days.
    //
    // This counted every unread notification in the facility, which came to
    // 401 on the HR dashboard - all of them laboratory events, sample
    // registered and results released, none of them anything to do with HR.
    // Not one had ever been read, because the ERP has no screen on which to
    // read one, so the number only ever grew.
    //
    // A tile counting things nobody can open, in a category the reader does
    // not work in, going back six months, is not an alert. It is a number.
    // Scoped to what HR would act on and to the recent past, so a nonzero
    // figure means something needs attention today.
    const alertsResult = await pool.query(
      `SELECT COUNT(*) AS count
         FROM notifications
        WHERE is_read = false
          AND workspaceid = $1
          AND COALESCE(category, '') <> 'LIMS'
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [workspaceId]
    );
    const recentAlerts = parseInt(alertsResult.rows[0].count);

    // Get attendance trend for last 30 days
    // The same correction, applied to the trend, so the chart and the tile
    // above it are drawn from one source.
    const attendanceTrendResult = await pool.query(`
      SELECT 
        date::date as date,
        COUNT(DISTINCT employee_id) FILTER (WHERE status IN ('PRESENT', 'LATE', 'HALF_DAY'))
          * 100.0 / NULLIF((SELECT COUNT(*) FROM staff WHERE workspaceid = $1), 0) as rate
      FROM daily_attendance
      WHERE date::date >= CURRENT_DATE - INTERVAL '29 days'
        AND workspaceid = $1
      GROUP BY date::date
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

    // Overtime by week, from the hours actually recorded.
    //
    // This used to count punches falling outside 06:00-18:00 and multiply by
    // 0.5 to produce "hours" - a number with no relationship to time worked.
    // Someone clocking in at 05:55 scored half an hour of overtime for
    // arriving early. Meanwhile `overtime_hours` sits on the daily summary,
    // computed by the punch handler on check-out as anything beyond an
    // eight-hour day.
    const overtimeResult = await pool.query(`
      SELECT 
        to_char(date_trunc('week', date), 'DD Mon') as week,
        ROUND(SUM(COALESCE(overtime_hours, 0))::numeric, 1) as hours
      FROM daily_attendance
      WHERE date >= CURRENT_DATE - INTERVAL '7 weeks'
        AND date < CURRENT_DATE
        AND workspaceid = $1
      GROUP BY date_trunc('week', date)
      ORDER BY date_trunc('week', date)
    `, [workspaceId]);
    
    const overtimeByWeek = overtimeResult.rows.map(row => ({
      week: row.week,
      hours: parseFloat(row.hours) || 0
    }));

    const metrics = {
      totalActiveEmployees,
      // Distinct from absent. The old query could not tell the difference,
      // because someone on approved leave never punches in.
      onLeaveToday: parseInt(attendanceData.on_leave_count) || 0,
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
