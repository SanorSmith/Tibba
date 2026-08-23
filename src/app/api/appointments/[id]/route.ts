/**
 * /api/appointments/[id]
 * PATCH  — update an appointment (status change or edit fields)
 * DELETE — remove an appointment
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


type Params = { params: Promise<{ id: string }> };

// Whitelist of columns a client may update
const EDITABLE = [
  'status', 'starttime', 'endtime', 'location', 'unit',
  'appointmentname', 'appointmenttype', 'clinicalindication',
  'reasonforrequest', 'description', 'notes', 'doctorid', 'staff_id',
];

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(workspaceId, async () => {
  try {
    const body = await request.json();
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const key of EDITABLE) {
      if (key in body && body[key] !== undefined) {
        sets.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (sets.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }
    // touch updatedat if the column exists (ignore failure)
    values.push(id, workspaceId);
    const r = await pool.query(
      `UPDATE appointments SET ${sets.join(', ')}, updatedat = NOW()
       WHERE appointmentid = $${i} AND workspaceid = $${i + 1} RETURNING *`,
      values
    ).catch(async () => {
      // retry without updatedat if that column doesn't exist
      return pool!.query(
        `UPDATE appointments SET ${sets.join(', ')} WHERE appointmentid = $${i} AND workspaceid = $${i + 1} RETURNING *`,
        values
      );
    });
    if (r.rows.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: r.rows[0] });
  } catch (error) {
    console.error('[appointments PATCH]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(workspaceId, async () => {
  try {
    const r = await pool.query(`DELETE FROM appointments WHERE appointmentid = $1 AND workspaceid = $2 RETURNING appointmentid`, [id, workspaceId]);
    if (r.rows.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: r.rows[0].appointmentid });
  } catch (error) {
    console.error('[appointments DELETE]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}
