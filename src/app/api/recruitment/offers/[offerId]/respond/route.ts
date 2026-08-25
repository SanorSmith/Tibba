import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// POST - Candidate responds to offer (ACCEPTED, DECLINED, NEGOTIATING)
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
    return await withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_offers WHERE offer_id = $1 AND workspace_id = $2',
      [offerId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { candidateResponse, candidateNotes, counterOfferAmount, negotiationNotes } = body;

    if (!candidateResponse || !['ACCEPTED', 'DECLINED', 'NEGOTIATING'].includes(candidateResponse)) {
      return NextResponse.json(
        { success: false, error: 'candidateResponse must be ACCEPTED, DECLINED, or NEGOTIATING' },
        { status: 400 }
      );
    }

    const existing = await query('SELECT * FROM job_offers WHERE offer_id = $1', [offerId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
    }
    const offer = existing.rows[0];

    if (!['SENT', 'NEGOTIATING'].includes(offer.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot respond to offer in status: ${offer.status}` },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      let newStatus: string;

      if (candidateResponse === 'ACCEPTED') {
        newStatus = 'ACCEPTED';
        await client.query(`
          UPDATE job_offers
          SET status = 'ACCEPTED', accepted_at = NOW(), responded_at = NOW(), updated_at = NOW()
          WHERE offer_id = $1
        `, [offerId]);
        // Mark application as hired
        await client.query(`
          UPDATE job_applications SET status = 'HIRED', hired_at = NOW(), updated_at = NOW()
          WHERE application_id = $1
        `, [offer.application_id]);
        // Update candidate overall status
        await client.query(`
          UPDATE job_candidates SET overall_status = 'HIRED', updated_at = NOW()
          WHERE id = $1
        `, [offer.candidate_id]);

      } else if (candidateResponse === 'DECLINED') {
        newStatus = 'DECLINED';
        await client.query(`
          UPDATE job_offers
          SET status = 'DECLINED', declined_at = NOW(), decline_reason = $1, responded_at = NOW(), updated_at = NOW()
          WHERE offer_id = $2
        `, [candidateNotes || null, offerId]);
        await client.query(`
          UPDATE job_applications SET status = 'REJECTED', rejection_reason = 'Candidate declined offer', updated_at = NOW()
          WHERE application_id = $1
        `, [offer.application_id]);

      } else {
        // NEGOTIATING
        newStatus = 'NEGOTIATING';
        await client.query(`
          UPDATE job_offers
          SET status = 'NEGOTIATING', responded_at = NOW(), updated_at = NOW()
          WHERE offer_id = $1
        `, [offerId]);
        // Log negotiation round
        await client.query(`
          INSERT INTO offer_negotiation_history (
            offer_id, round_number, initiated_by, proposed_salary,
            other_requests, response_notes
          ) VALUES ($1, 1, 'CANDIDATE', $2, $3, $4)
        `, [offerId, counterOfferAmount || null, negotiationNotes || null, candidateNotes || null]);
      }

      const updated = await client.query('SELECT * FROM job_offers WHERE offer_id = $1', [offerId]);
      return { offer: updated.rows[0], newStatus };
    });

    return NextResponse.json({
      success: true,
      data: result.offer,
      message: `Offer ${candidateResponse.toLowerCase()} successfully`,
      newStatus: result.newStatus
    });
    });
  } catch (error: any) {
    console.error('Respond to offer error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to respond to offer' }, { status: 500 });
  }
}
