import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('period_id');

    if (!periodId) {
      return NextResponse.json({ error: 'period_id is required' }, { status: 400 });
    }

    // Get period dates
    const periodResult = await pool.query(
      `SELECT start_date, end_date FROM payroll_periods WHERE id = $1`,
      [periodId]
    );

    if (periodResult.rows.length === 0) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    const { start_date, end_date } = periodResult.rows[0];

    // Get attendance summary for all employees in this period
    const result = await pool.query(`
      SELECT 
        s.staffid as employee_id,
        CONCAT(s.firstname, ' ', COALESCE(s.lastname, '')) as employee_name,
        s.unit as department,
        s.role,
        COALESCE(att.present_days, 0) as present_days,
        COALESCE(att.absent_days, 0) as absent_days,
        COALESCE(att.leave_days, 0) as leave_days,
        COALESCE(att.total_overtime, 0) as overtime_hours,
        COALESCE(att.night_shifts, 0) as night_shifts,
        COALESCE(att.late_arrivals, 0) as late_count,
        COALESCE(att.early_departures, 0) as early_departure_count,
        COALESCE(att.avg_hours, 0) as avg_daily_hours,
        COALESCE(att.total_records, 0) as total_records
      FROM staff s
      INNER JOIN employee_compensation ec ON ec.employee_id = s.staffid AND ec.is_active = true
      LEFT JOIN (
        SELECT 
          employee_id,
          COUNT(*) FILTER (WHERE status = 'PRESENT') as present_days,
          COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_days,
          COUNT(*) FILTER (WHERE status = 'LEAVE') as leave_days,
          COALESCE(SUM(overtime_hours), 0) as total_overtime,
          COUNT(*) FILTER (WHERE shift_name LIKE '%Night%') as night_shifts,
          COUNT(*) FILTER (WHERE late_arrival_minutes > 0) as late_arrivals,
          COUNT(*) FILTER (WHERE early_departure_min > 0) as early_departures,
          ROUND(AVG(COALESCE(total_hours, 0))::numeric, 1) as avg_hours,
          COUNT(*) as total_records
        FROM daily_attendance
        WHERE date BETWEEN $1 AND $2
        GROUP BY employee_id
      ) att ON att.employee_id = s.staffid
      ORDER BY s.firstname
    `, [start_date, end_date]);

    return NextResponse.json({
      success: true,
      period: { start_date, end_date },
      data: result.rows,
      total_employees: result.rows.length,
    });

  } catch (error: any) {
    console.error('Attendance API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
