/**
 * /api/appointments/[id]
 * PATCH  — update an appointment (status change or edit fields)
 * DELETE — remove an appointment
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';
import {
  resolveDoctorIdentity,
  noLoginWarning,
} from '@/lib/appointments/resolve-doctor';

export const dynamic = 'force-dynamic';


type Params = { params: Promise<{ id: string }> };

// Whitelist of columns a client may update.
//
// `doctorid` and `staff_id` are deliberately absent: they are two halves of
// one identity and are set together, from whichever id the client sent, by the
// same resolver the create route uses. Letting them through here would let an
// edit put a staffid back into `doctorid` - the very mix-up that hid
// appointments from the doctors they name.
const EDITABLE = [
  'status', 'starttime', 'endtime', 'location', 'unit',
  'appointmentname', 'appointmenttype', 'clinicalindication',
  'reasonforrequest', 'description', 'notes',
];

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
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

    // Changing who the appointment is with sets both columns, or neither.
    let warning: string | undefined;
    if ('doctorid' in body) {
      if (body.doctorid === null || body.doctorid === '') {
        sets.push(`doctorid = $${i++}`, `staff_id = $${i++}`);
        values.push(null, null);
      } else {
        const identity = await resolveDoctorIdentity(
          pool!,
          String(body.doctorid),
          workspaceId
        );
        if (!identity) {
          return NextResponse.json(
            {
              error:
                'That doctor does not belong to this facility. Choose a member of staff or a user account from this hospital.',
            },
            { status: 400 }
          );
        }
        sets.push(`doctorid = $${i++}`, `staff_id = $${i++}`);
        values.push(identity.doctorUserId, identity.staffRecordId);
        warning = noLoginWarning(identity);
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
    return NextResponse.json({ success: true, data: r.rows[0], warning });
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
  return await withTenant(workspaceId, async () => {
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
