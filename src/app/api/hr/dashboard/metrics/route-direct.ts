/**
 * Dashboard Metrics API - Direct PostgreSQL Version
 * Provides real-time KPIs for HR dashboard using direct postgres connection
 */

import { NextResponse } from 'next/server';
import postgres from 'postgres';

const databaseUrl = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL is not configured');
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Total Active Employees
    const [totalActiveEmployees] = await sql`
      SELECT COUNT(*) as count 
      FROM employees 
      WHERE employment_status = 'ACTIVE'
    `;

    // 2. Today's Attendance Rate
    const [todayPresent] = await sql`
      SELECT COUNT(*) as count 
      FROM attendance_records 
      WHERE attendance_date = ${today}
      AND status IN ('PRESENT', 'LATE')
    `;

    const todayAttendanceRate = totalActiveEmployees.count > 0
      ? (todayPresent.count / totalActiveEmployees.count) * 100
      : 0;

    // 3. Pending Leave Requests
    const [pendingLeaveRequests] = await sql`
      SELECT COUNT(*) as count 
      FROM leave_requests 
      WHERE status IN ('PENDING', 'IN_REVIEW')
    `;

    // 4. Upcoming License Expiries (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const employeesWithLicenses = await sql`
      SELECT metadata 
      FROM employees 
      WHERE employment_status = 'ACTIVE'
      AND metadata IS NOT NULL
    `;

    let upcomingLicenseExpiries = 0;
    if (employeesWithLicenses) {
      employeesWithLicenses.forEach(emp => {
        if (emp.metadata && emp.metadata.licenses) {
          emp.metadata.licenses.forEach((license: any) => {
            if (license.expiry_date) {
              const expiryDate = new Date(license.expiry_date);
              if (expiryDate <= thirtyDaysFromNow && expiryDate >= new Date()) {
                upcomingLicenseExpiries++;
              }
            }
          });
        }
      });
    }

    // 5. Current Month Payroll Status
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [payrollPeriod] = await sql`
      SELECT status 
      FROM payroll_periods 
      WHERE name LIKE ${'%' + currentMonth + '%'}
      LIMIT 1
    `;

    const currentMonthPayrollStatus = payrollPeriod?.status || 'not_started';

    // 6. Recent Alerts (unread)
    const [recentAlerts] = await sql`
      SELECT COUNT(*) as count 
      FROM alerts 
      WHERE is_read = false
    `;

    // 7. Attendance Trend (last 30 days)
    const attendanceData = await sql`
      SELECT 
        attendance_date,
        status,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 END) as present_count
      FROM attendance_records 
      WHERE attendance_date >= ${thirtyDaysAgo.toISOString().split('T')[0]}
      GROUP BY attendance_date, status
      ORDER BY attendance_date ASC
    `;

    const attendanceTrend: Array<{ date: string; rate: number }> = [];
    if (attendanceData && totalActiveEmployees.count > 0) {
      const groupedByDate: Record<string, { present: number; total: number }> = {};
      
      attendanceData.forEach(record => {
        if (!groupedByDate[record.attendance_date]) {
          groupedByDate[record.attendance_date] = { present: 0, total: 0 };
        }
        groupedByDate[record.attendance_date].total += record.total_count;
        if (record.status === 'PRESENT' || record.status === 'LATE') {
          groupedByDate[record.attendance_date].present += record.present_count;
        }
      });

      Object.entries(groupedByDate).forEach(([date, data]) => {
        attendanceTrend.push({
          date,
          rate: (data.present / totalActiveEmployees.count) * 100,
        });
      });
    }

    // 8. Department Headcount
    const departmentHeadcount = await sql`
      SELECT 
        d.name as department,
        COUNT(e.id) as count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      WHERE d.type = 'department' AND d.active = true
      GROUP BY d.id, d.name
      HAVING COUNT(e.id) > 0
      ORDER BY count DESC
      LIMIT 10
    `;

    // 9. Overtime by Week (last 4 weeks)
    const overtimeByWeek: Array<{ week: string; hours: number }> = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const [overtimeData] = await sql`
        SELECT COALESCE(SUM(overtime_hours), 0) as total_hours
        FROM attendance_records
        WHERE attendance_date >= ${weekStart.toISOString().split('T')[0]}
        AND attendance_date <= ${weekEnd.toISOString().split('T')[0]}
      `;

      overtimeByWeek.push({
        week: `Week ${4 - i}`,
        hours: parseFloat(overtimeData.total_hours) || 0,
      });
    }

    // Return metrics
    return NextResponse.json({
      totalActiveEmployees: totalActiveEmployees.count || 0,
      todayAttendanceRate: Math.round(todayAttendanceRate * 10) / 10,
      pendingLeaveRequests: pendingLeaveRequests.count || 0,
      upcomingLicenseExpiries,
      currentMonthPayrollStatus,
      recentAlerts: recentAlerts.count || 0,
      attendanceTrend,
      departmentHeadcount: departmentHeadcount.map((dept: any) => ({
        department: dept.department,
        count: dept.count,
      })),
      overtimeByWeek,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics', details: error.message },
      { status: 500 }
    );
  }
}
