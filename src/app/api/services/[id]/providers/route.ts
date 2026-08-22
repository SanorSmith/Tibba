import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/services/[id]/providers
 * Returns all stakeholders assigned to this service with their share config.
 */
export async function GET(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // The service must be ours before its provider list is read or changed.
  const ownsService = await pool.query(
    'SELECT 1 FROM services WHERE id::text = $1 AND workspaceid = $2',
    [id, workspaceId]
  );
  if (ownsService.rows.length === 0) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  try {
    const result = await pool.query(
      `SELECT
         ss.id,
         ss.service_id,
         ss.stakeholder_id,
         ss.provider_role,
         ss.share_type,
         ss.share_percentage,
         ss.share_amount,
         ss.is_active,
         ss.notes,
         s.name_ar     AS stakeholder_name,
         s.name_en     AS stakeholder_name_en,
         s.role        AS stakeholder_role,
         s.mobile      AS stakeholder_mobile,
         s.specialty_ar
       FROM service_stakeholders ss
       JOIN stakeholders s ON ss.stakeholder_id = s.id
       WHERE ss.service_id = $1 AND ss.workspaceid = $2
       ORDER BY ss.share_percentage DESC NULLS LAST`,
      [id, workspaceId]
    );

    // Calculate total allocated percentage
    const totalPct = result.rows.reduce(
      (sum, r) => sum + (parseFloat(r.share_percentage) || 0), 0
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      total_allocated_pct: totalPct,
      hospital_pct: Math.max(0, 100 - totalPct),
    });
  } catch (error) {
    console.error('[services/providers GET]', error);
    return NextResponse.json({ error: 'Failed to fetch providers', detail: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/services/[id]/providers
 * Add a stakeholder as a provider for this service.
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // The service must be ours before its provider list is read or changed.
  const ownsService = await pool.query(
    'SELECT 1 FROM services WHERE id::text = $1 AND workspaceid = $2',
    [id, workspaceId]
  );
  if (ownsService.rows.length === 0) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { stakeholder_id, provider_role = 'DOCTOR', share_type = 'PERCENTAGE', share_percentage, share_amount, notes } = body;

    if (!stakeholder_id) {
      return NextResponse.json({ error: 'stakeholder_id is required' }, { status: 400 });
    }
    if (share_type === 'PERCENTAGE' && (share_percentage == null || share_percentage < 0 || share_percentage > 100)) {
      return NextResponse.json({ error: 'share_percentage must be 0–100' }, { status: 400 });
    }

    // Check total won't exceed 100%
    if (share_type === 'PERCENTAGE') {
      const current = await pool.query(
        'SELECT COALESCE(SUM(share_percentage),0) AS total FROM service_stakeholders WHERE service_id = $1 AND is_active = true AND stakeholder_id != $2 AND workspaceid = $3',
        [id, stakeholder_id, workspaceId]
      );
      const currentTotal = parseFloat(current.rows[0].total) || 0;
      if (currentTotal + parseFloat(share_percentage) > 100) {
        return NextResponse.json({
          error: `Total share would exceed 100%. Currently allocated: ${currentTotal}%, you are adding: ${share_percentage}%`
        }, { status: 400 });
      }
    }

    const result = await pool.query(
      `INSERT INTO service_stakeholders
         (service_id, stakeholder_id, provider_role, share_type, share_percentage, share_amount, notes, workspaceid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (service_id, stakeholder_id)
       DO UPDATE SET
         provider_role = EXCLUDED.provider_role,
         share_type = EXCLUDED.share_type,
         share_percentage = EXCLUDED.share_percentage,
         share_amount = EXCLUDED.share_amount,
         notes = EXCLUDED.notes,
         is_active = true,
         updatedat = NOW()
       RETURNING *`,
      [id, stakeholder_id, provider_role, share_type, share_percentage ?? null, share_amount ?? null, notes ?? null, workspaceId]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[services/providers POST]', error);
    return NextResponse.json({ error: 'Failed to add provider', detail: (error as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/services/[id]/providers
 * Remove a stakeholder from this service (pass stakeholder_id in body).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // The service must be ours before its provider list is read or changed.
  const ownsService = await pool.query(
    'SELECT 1 FROM services WHERE id::text = $1 AND workspaceid = $2',
    [id, workspaceId]
  );
  if (ownsService.rows.length === 0) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { stakeholder_id } = body;
    if (!stakeholder_id) return NextResponse.json({ error: 'stakeholder_id required' }, { status: 400 });

    await pool.query(
      'DELETE FROM service_stakeholders WHERE service_id = $1 AND stakeholder_id = $2 AND workspaceid = $3',
      [id, stakeholder_id, workspaceId]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove provider', detail: (error as Error).message }, { status: 500 });
  }
}
