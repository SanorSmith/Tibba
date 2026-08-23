import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// POST - Send approved offer to candidate
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
    const { expiryDays } = body;

    const existing = await query('SELECT * FROM job_offers WHERE offer_id = $1', [offerId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
    }
    if (existing.rows[0].status !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'Offer must be APPROVED before sending' }, { status: 400 });
    }

    const offer = existing.rows[0];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays || 7));

    await transaction(async (client) => {
      // Update offer status
      await client.query(`
        UPDATE job_offers
        SET status = 'SENT', sent_at = NOW(), expires_at = $1, updated_at = NOW()
        WHERE offer_id = $2
      `, [expiresAt.toISOString(), offerId]);

      // Update application status
      await client.query(`
        UPDATE job_applications SET status = 'OFFERED', updated_at = NOW()
        WHERE application_id = $1
      `, [offer.application_id]);

      // Log communication
      await client.query(`
        INSERT INTO candidate_communications (
          candidate_id, application_id, comm_type, direction,
          subject, body, status, sent_at
        ) VALUES ($1, $2, 'EMAIL', 'OUTBOUND', $3, 'Offer letter sent to candidate', 'SENT', NOW())
      `, [offer.candidate_id, offer.application_id, `Job Offer - ${offer.position_title}`]);
    });

    return NextResponse.json({
      success: true,
      message: 'Offer sent to candidate',
      expiresAt: expiresAt.toISOString()
    });
    });
  } catch (error: any) {
    console.error('Send offer error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to send offer' }, { status: 500 });
  }
}
