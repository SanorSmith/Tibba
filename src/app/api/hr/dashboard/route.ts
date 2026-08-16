/**
 * /api/hr/dashboard
 * Real-DB aggregation for the HR dashboard KPIs, charts, alerts and activity.
 * Each query is individually guarded so a missing table never breaks the page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  // Every tile below is a cross-table count, so each query is restricted to
  // the caller's facility rather than summing the whole platform.
  const ws = getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const emp = await safe(async () => {
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE employment_status = 'ACTIVE')   AS active,
        COUNT(*) FILTER (WHERE employment_status = 'ON_LEAVE') AS on_leave,
        COUNT(*) FILTER (WHERE employment_status = 'ACTIVE' AND employee_category = 'MEDICAL_STAFF')   AS medical,
        COUNT(*) FILTER (WHERE employment_status = 'ACTIVE' AND employee_category = 'NURSING')         AS nursing,
        COUNT(*) FILTER (WHERE employment_status = 'ACTIVE' AND employee_category = 'ADMINISTRATIVE')  AS admin,
        COUNT(*) FILTER (WHERE employment_status = 'ACTIVE' AND employee_category = 'TECHNICAL')       AS technical,
        COUNT(*) FILTER (WHERE employment_status = 'ACTIVE' AND employee_category = 'SUPPORT')         AS support
      FROM employees WHERE workspaceid = $1`, [ws]);
    return r.rows[0];
  }, { active: 0, on_leave: 0, medical: 0, nursing: 0, admin: 0, technical: 0, support: 0 });

  const attendance = await safe(async () => {
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PRESENT') AS present,
        COUNT(*) FILTER (WHERE status = 'ABSENT')  AS absent
      FROM daily_attendance WHERE date = CURRENT_DATE AND workspaceid = $1`, [ws]);
    return r.rows[0];
  }, { present: 0, absent: 0 });

  const pendingLeaves = await safe(async () => {
    const r = await pool.query(`SELECT COUNT(*) AS c FROM leave_requests WHERE status ILIKE '%pending%' AND workspaceid = $1`, [ws]);
    return parseInt(r.rows[0].c) || 0;
  }, 0);

  const recentApprovedLeaves = await safe(async () => {
    const r = await pool.query(`
      SELECT employee_name, leave_type_code, start_date, end_date, approved_by_name
      FROM leave_requests WHERE status = 'APPROVED' AND workspaceid = $1
      ORDER BY approved_at DESC NULLS LAST LIMIT 2`, [ws]);
    return r.rows;
  }, []);

  const vacancies = await safe(async () => {
    const r = await pool.query(`
      SELECT COUNT(*) AS open_count, COALESCE(SUM(openings),0) AS openings
      FROM job_vacancies WHERE status = 'OPEN' AND workspace_id = $1`, [ws]);
    return r.rows[0];
  }, { open_count: 0, openings: 0 });

  const candidates = await safe(async () => {
    const r = await pool.query(`SELECT COUNT(*) AS c FROM job_applications WHERE workspace_id = $1`, [ws]);
    return parseInt(r.rows[0].c) || 0;
  }, 0);

  const payroll = await safe(async () => {
    const r = await pool.query(`
      SELECT period_name, status, total_gross, total_net
      FROM payroll_periods WHERE workspaceid = $1
      ORDER BY start_date DESC NULLS LAST LIMIT 1`, [ws]);
    return r.rows[0] || null;
  }, null);

  const pendingReviews = await safe(async () => {
    const r = await pool.query(`SELECT COUNT(*) AS c FROM performance_reviews WHERE status = 'SUBMITTED' AND workspaceid = $1`, [ws]);
    return parseInt(r.rows[0].c) || 0;
  }, 0);

  const recognitions = await safe(async () => {
    const r = await pool.query(`
      SELECT er.title, er.reason, er.recognition_date,
             e.first_name || ' ' || e.last_name AS employee_name
      FROM employee_recognitions er
      LEFT JOIN employees e ON e.id = er.employee_id
      WHERE er.workspaceid = $1
      ORDER BY er.recognition_date DESC NULLS LAST LIMIT 3`, [ws]);
    return r.rows;
  }, []);

  return NextResponse.json({
    success: true,
    employees: {
      active: parseInt(emp.active) || 0,
      on_leave: parseInt(emp.on_leave) || 0,
      categories: [
        { name: 'Medical',   value: parseInt(emp.medical)   || 0, color: '#3B82F6' },
        { name: 'Nursing',   value: parseInt(emp.nursing)   || 0, color: '#EC4899' },
        { name: 'Admin',     value: parseInt(emp.admin)     || 0, color: '#6366F1' },
        { name: 'Technical', value: parseInt(emp.technical) || 0, color: '#10B981' },
        { name: 'Support',   value: parseInt(emp.support)   || 0, color: '#F59E0B' },
      ],
    },
    attendance: { present: parseInt(attendance.present) || 0, absent: parseInt(attendance.absent) || 0 },
    pendingLeaves,
    recentApprovedLeaves,
    vacancies: { open: parseInt(vacancies.open_count) || 0, candidates },
    payroll,
    pendingReviews,
    recognitions,
  });
}
