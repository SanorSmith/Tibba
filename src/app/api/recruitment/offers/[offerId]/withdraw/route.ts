import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// POST - Withdraw an offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const { offerId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_offers WHERE offer_id = $1 AND workspace_id = $2',
      [offerId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { reason } = body;

    const existing = await query('SELECT * FROM job_offers WHERE offer_id = $1', [offerId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
    }
    if (existing.rows[0].status === 'ACCEPTED') {
      return NextResponse.json({ success: false, error: 'Cannot withdraw an accepted offer' }, { status: 400 });
    }

    const offer = existing.rows[0];

    await transaction(async (client) => {
      await client.query(`
        UPDATE job_offers
        SET status = 'WITHDRAWN', revoked_at = NOW(), revoke_reason = $1, updated_at = NOW()
        WHERE offer_id = $2
      `, [reason || null, offerId]);

      await client.query(`
        UPDATE job_applications SET status = 'ACTIVE', updated_at = NOW()
        WHERE application_id = $1
      `, [offer.application_id]);
    });

    return NextResponse.json({
      success: true,
      message: 'Offer withdrawn successfully'
    });
    });
  } catch (error: any) {
    console.error('Withdraw offer error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to withdraw offer' }, { status: 500 });
  }
}
