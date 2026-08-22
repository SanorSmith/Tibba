/**
 * GET /api/reception/stats — the reception counter's headline figures.
 *
 * These were hardcoded placeholders (24 patients, 8 pending, 1,250,000 IQD)
 * shown identically to every facility. They are now real, and scoped.
 *
 * The scoping rule here is the important part. Patients themselves are shared
 * across facilities by design — the same person can be treated at more than
 * one hospital. What is *not* shared is the activity: an appointment, an
 * invoice, a payment belongs to the facility that created it. So "today's
 * patients" means people seen *here* today, not everyone in the patient table,
 * and the revenue is what *this* hospital billed and collected.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    // Distinct people with an appointment here today. Counting appointments
    // instead would double-count anyone seen twice.
    const todayPatients = await pool.query(
      `SELECT COUNT(DISTINCT patientid)::int AS n
         FROM appointments
        WHERE workspaceid = $1
          AND starttime::date = CURRENT_DATE
          AND status IS DISTINCT FROM 'cancelled'`,
      [workspaceId]
    );

    // Appointments still to happen or in progress today.
    const activeAppointments = await pool.query(
      `SELECT COUNT(*)::int AS n
         FROM appointments
        WHERE workspaceid = $1
          AND starttime::date = CURRENT_DATE
          AND (status IS NULL OR status NOT IN ('cancelled', 'completed'))`,
      [workspaceId]
    );

    // Bills this facility raised that are not yet settled — not limited to
    // today, since an unpaid bill from last week is still outstanding.
    const pending = await pool.query(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(balance_due), 0) AS amount
         FROM invoices
        WHERE workspaceid = $1
          AND COALESCE(status, '') NOT IN ('PAID', 'CANCELLED')
          AND COALESCE(balance_due, 0) > 0`,
      [workspaceId]
    );

    // Collected today, by payment date — money actually taken, rather than
    // invoiced. An invoice raised today but unpaid is in `pending` instead.
    const revenue = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS amount
         FROM invoices
        WHERE workspaceid = $1
          AND COALESCE(payment_date, invoice_date)::date = CURRENT_DATE
          AND COALESCE(status, '') <> 'CANCELLED'`,
      [workspaceId]
    );

    // Last few things that actually happened at this facility, newest first —
    // replaces the "Ahmed Mohammed - 2 mins ago" placeholder that used to be
    // shown identically to every hospital regardless of what really occurred.
    const activity = await pool.query(
      `SELECT * FROM (
         SELECT 'invoice' AS kind, createdat AS at,
                COALESCE(patient_name, 'Patient') AS who,
                total_amount AS amount, status
           FROM invoices WHERE workspaceid = $1
         UNION ALL
         SELECT 'appointment' AS kind, createdat AS at,
                COALESCE(appointmentname::text, 'Appointment') AS who,
                NULL AS amount, status::text
           FROM appointments WHERE workspaceid = $1
       ) recent
       ORDER BY at DESC
       LIMIT 5`,
      [workspaceId]
    );

    return NextResponse.json({
      success: true,
      data: {
        todayPatients: todayPatients.rows[0].n,
        activeAppointments: activeAppointments.rows[0].n,
        pendingPayments: pending.rows[0].n,
        pendingAmount: Math.round(parseFloat(pending.rows[0].amount) || 0),
        todayRevenue: Math.round(parseFloat(revenue.rows[0].amount) || 0),
        recentActivity: activity.rows.map((r) => ({
          kind: r.kind,
          who: r.who,
          amount: r.amount != null ? Math.round(parseFloat(r.amount)) : null,
          status: r.status,
          at: r.at,
        })),
      },
    });
  } catch (error) {
    console.error('[reception/stats] error:', error);
    return NextResponse.json(
      { error: 'Failed to load reception stats', detail: (error as Error).message },
      { status: 500 }
    );
  }
}
