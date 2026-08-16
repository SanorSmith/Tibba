import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// POST - Employer submits counter-offer during negotiation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const { offerId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const owns = await query(
      'SELECT 1 FROM job_offers WHERE offer_id = $1 AND workspace_id = $2',
      [offerId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { proposedSalary, proposedStartDate, proposedBenefits, notes } = body;

    const existing = await query('SELECT * FROM job_offers WHERE offer_id = $1', [offerId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
    }
    if (existing.rows[0].status !== 'NEGOTIATING') {
      return NextResponse.json({ success: false, error: 'Offer is not in negotiation' }, { status: 400 });
    }

    // Get current round
    const roundResult = await query(
      'SELECT COALESCE(MAX(round_number), 0) as max_round FROM offer_negotiation_history WHERE offer_id = $1',
      [offerId]
    );
    const nextRound = parseInt(roundResult.rows[0].max_round) + 1;

    // Log counter-offer
    await query(`
      INSERT INTO offer_negotiation_history (
        offer_id, round_number, initiated_by, proposed_salary,
        proposed_start_date, proposed_benefits, other_requests
      ) VALUES ($1, $2, 'EMPLOYER', $3, $4, $5, $6)
    `, [offerId, nextRound, proposedSalary || null, proposedStartDate || null, proposedBenefits || null, notes || null]);

    // Update offer with new terms if provided
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let idx = 1;
    if (proposedSalary) { updates.push(`offered_salary = $${idx++}`); values.push(proposedSalary); }
    if (proposedStartDate) { updates.push(`start_date = $${idx++}`); values.push(proposedStartDate); }
    values.push(offerId);

    await query(`UPDATE job_offers SET ${updates.join(', ')} WHERE offer_id = $${idx}`, values);

    return NextResponse.json({
      success: true,
      message: 'Counter-offer submitted',
      roundNumber: nextRound
    });
  } catch (error: any) {
    console.error('Counter-offer error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit counter-offer' }, { status: 500 });
  }
}
