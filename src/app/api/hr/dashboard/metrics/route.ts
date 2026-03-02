/**
 * Dashboard Metrics API
 * Provides real-time KPIs for HR dashboard
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Total Active Employees
    const { count: totalActiveEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('employment_status', 'active');

    // 2. Today's Attendance Rate
    const { count: todayPresent } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_date', today)
      .in('status', ['PRESENT', 'LATE']);

    const todayAttendanceRate = totalActiveEmployees && totalActiveEmployees > 0
      ? ((todayPresent || 0) / totalActiveEmployees) * 100
      : 0;

    // 3. Pending Leave Requests
    const { count: pendingLeaveRequests } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PENDING', 'IN_REVIEW']);

    // 4. Upcoming License Expiries (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: employeesWithLicenses } = await supabase
      .from('employees')
      .select('metadata')
      .eq('employment_status', 'active');

    let upcomingLicenseExpiries = 0;
    if (employeesWithLicenses) {
      employeesWithLicenses.forEach(emp => {
        if (emp.metadata?.licenses) {
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
    const { data: payrollPeriod } = await supabase
      .from('payroll_periods')
      .select('status')
      .like('name', `%${currentMonth}%`)
      .single();

    const currentMonthPayrollStatus = payrollPeriod?.status || 'not_started';

    // 6. Recent Alerts (unread)
    const { count: recentAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    // 7. Attendance Trend (last 30 days)
    const { data: attendanceData } = await supabase
      .from('attendance_records')
      .select('attendance_date, status')
      .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('attendance_date', { ascending: true });

    const attendanceTrend: Array<{ date: string; rate: number }> = [];
    if (attendanceData && totalActiveEmployees) {
      const groupedByDate = attendanceData.reduce((acc: any, record) => {
        if (!acc[record.attendance_date]) {
          acc[record.attendance_date] = { present: 0, total: 0 };
        }
        acc[record.attendance_date].total++;
        if (record.status === 'PRESENT' || record.status === 'LATE') {
          acc[record.attendance_date].present++;
        }
        return acc;
      }, {});

      Object.entries(groupedByDate).forEach(([date, data]: [string, any]) => {
        attendanceTrend.push({
          date,
          rate: (data.present / totalActiveEmployees) * 100,
        });
      });
    }

    // 8. Department Headcount
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name')
      .eq('type', 'department')
      .eq('active', true);

    const departmentHeadcount: Array<{ department: string; count: number }> = [];
    if (departments) {
      for (const dept of departments) {
        const { count } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('department_id', dept.id)
          .eq('employment_status', 'active');

        if (count && count > 0) {
          departmentHeadcount.push({
            department: dept.name,
            count,
          });
        }
      }
    }

    // 9. Overtime by Week (last 4 weeks)
    const overtimeByWeek: Array<{ week: string; hours: number }> = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const { data: overtimeData } = await supabase
        .from('attendance_records')
        .select('overtime_hours')
        .gte('attendance_date', weekStart.toISOString().split('T')[0])
        .lte('attendance_date', weekEnd.toISOString().split('T')[0]);

      const totalHours = overtimeData?.reduce((sum, record) => 
        sum + (record.overtime_hours || 0), 0) || 0;

      overtimeByWeek.push({
        week: `Week ${4 - i}`,
        hours: totalHours,
      });
    }

    // Return metrics
    return NextResponse.json({
      totalActiveEmployees: totalActiveEmployees || 0,
      todayAttendanceRate: Math.round(todayAttendanceRate * 10) / 10,
      pendingLeaveRequests: pendingLeaveRequests || 0,
      upcomingLicenseExpiries,
      currentMonthPayrollStatus,
      recentAlerts: recentAlerts || 0,
      attendanceTrend,
      departmentHeadcount: departmentHeadcount.sort((a, b) => b.count - a.count).slice(0, 10),
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
