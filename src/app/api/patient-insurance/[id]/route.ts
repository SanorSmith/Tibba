/**
 * /api/patient-insurance/[id]
 * PUT    — update a patient policy
 * DELETE — remove a patient policy
 * Operates on patient_insurance_information.insuranceid
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  // The policy row itself is patient data and stays shared; the insurer
  // lookup below is this facility's contract, so it needs the session.
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  try {
    const b = await req.json();
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    if (b.policy_number !== undefined) { sets.push(`insurancenumber = $${idx++}`); vals.push(b.policy_number); }
    if (b.policy_type !== undefined)   { sets.push(`policytype = $${idx++}`);     vals.push(b.policy_type); }
    if (b.company_id !== undefined) {
      sets.push(`company_id = $${idx++}`); vals.push(b.company_id);
      const comp = await pool.query(`SELECT company_name FROM insurance_companies WHERE company_id=$1 AND workspaceid=$2`, [b.company_id, workspaceId]);
      if (comp.rows[0]) { sets.push(`insurancecompany = $${idx++}`); vals.push(comp.rows[0].company_name); }
    }
    if (sets.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    sets.push('updatedat = NOW()');
    vals.push(id);

    const r = await pool.query(
      `UPDATE patient_insurance_information SET ${sets.join(', ')} WHERE insuranceid = $${idx} RETURNING insuranceid AS id`,
      vals
    );
    if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: r.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  try {
    const r = await pool.query('DELETE FROM patient_insurance_information WHERE insuranceid = $1 RETURNING insuranceid', [id]);
    if (r.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
