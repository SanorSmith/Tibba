/**
 * /api/hr/dashboard
 * Real-DB aggregation for the HR dashboard KPIs, charts, alerts and activity.
 * Each query is individually guarded so a missing table never breaks the page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  // Every tile below is a cross-table count, so each query is restricted to
  // the caller's facility rather than summing the whole platform.
  const ws = await getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(ws, async () => {

  // The roster lives in `staff`, which is what the Staff Directory, the add
  // employee form and the rest of the ERP read. This tile used to count
  // `employees`, a near-abandoned table holding ten seeded demo records. It
  // reported 10 while the directory reported 1, and both were querying the
  // same facility correctly — the disagreement was the table, not the scope.
  // Four LEFT JOINs against `employees` survive in the recruitment routes;
  // every column they join on is null, so they resolve to nothing either way.
  //
  // `staff` has no employment_status column: a row exists for as long as the
  // person is employed, so everyone in it is active. It has no category
  // column either — the add employee form collects "Employee Category" and
  // then never stores it — so the five buckets are derived from `role`, a
  // free-text job title like "Senior Physician". Hence patterns rather than
  // exact matches. Order carries meaning: nursing first so a "Nurse Manager"
  // is not administration, imaging before medicine so a "Radiologist" is not
  // filed next to the surgeons.
  const emp = await safe(async () => {
    const r = await pool.query(`
      WITH categorised AS (
        SELECT CASE
          WHEN role ILIKE ANY (ARRAY['%nurse%','%midwife%'])                        THEN 'nursing'
          WHEN role ILIKE ANY (ARRAY['%technician%','%lab%','%radiolog%','%pharmac%','%imaging%'])        THEN 'technical'
          WHEN role ILIKE ANY (ARRAY['%doctor%','%physician%','%surgeon%','%consultant%','%specialist%','%ologist%','%iatrist%','%dentist%']) THEN 'medical'
          WHEN role ILIKE ANY (ARRAY['%administrator%','%admin%','%reception%','%account%','%human resource%','%hr officer%','%hr_officer%','%manager%','%clerk%','%officer%']) THEN 'admin'
          ELSE 'support'
        END AS category
        FROM staff WHERE workspaceid = $1
      )
      SELECT
        COUNT(*)                                      AS active,
        COUNT(*) FILTER (WHERE category = 'medical')   AS medical,
        COUNT(*) FILTER (WHERE category = 'nursing')   AS nursing,
        COUNT(*) FILTER (WHERE category = 'admin')     AS admin,
        COUNT(*) FILTER (WHERE category = 'technical') AS technical,
        COUNT(*) FILTER (WHERE category = 'support')   AS support
      FROM categorised`, [ws]);
    return r.rows[0];
  }, { active: 0, medical: 0, nursing: 0, admin: 0, technical: 0, support: 0 });

  // Who is away right now: approved leave spanning today, counted by person.
  //
  // It counted distinct `employee_name` instead. Two people sharing a name
  // were one person to this query, and one person renamed became two. That is
  // not hypothetical here - the leave records held two distinct employee ids
  // under the single name "Sanor Smith".
  //
  // `leave_requests` still carries a denormalised name alongside an
  // `employee_id` that once pointed at the retired `employees` table, so there
  // is no foreign key to lean on. The id is nonetheless the only thing in the
  // row that identifies a person; keying on it is right whether or not that
  // key is ever enforced.
  const onLeave = await safe(async () => {
    const r = await pool.query(`
      SELECT COUNT(DISTINCT employee_id) AS c FROM leave_requests
      WHERE workspaceid = $1 AND status = 'APPROVED'
        AND CURRENT_DATE BETWEEN start_date AND end_date`, [ws]);
    return parseInt(r.rows[0].c) || 0;
  }, 0);

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

  // The tile is labelled "Open Vacancies", so it counts postings. The sum of
  // `openings` is the headcount being recruited, which is a larger and
  // different number; this query used to compute it and then discard it.
  const vacancies = await safe(async () => {
    const r = await pool.query(`
      SELECT COUNT(*) AS open_count
      FROM job_vacancies WHERE status = 'OPEN' AND workspace_id = $1`, [ws]);
    return r.rows[0];
  }, { open_count: 0 });

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
             s.firstname || ' ' || s.lastname AS employee_name
      FROM employee_recognitions er
      LEFT JOIN staff s ON s.staffid = er.employee_id
      WHERE er.workspaceid = $1
      ORDER BY er.recognition_date DESC NULLS LAST LIMIT 3`, [ws]);
    return r.rows;
  }, []);

  return NextResponse.json({
    success: true,
    employees: {
      active: parseInt(emp.active) || 0,
      on_leave: onLeave,
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
  });
}
