import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// POST - Approve an offer (HR → Finance → CEO chain)
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
    const { approverRole, approverId, comments } = body;

    if (!approverRole || !['HR_DIRECTOR', 'FINANCE_MANAGER', 'CEO'].includes(approverRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid approverRole. Must be HR_DIRECTOR, FINANCE_MANAGER, or CEO' },
        { status: 400 }
      );
    }

    const existing = await query('SELECT * FROM job_offers WHERE offer_id = $1', [offerId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
    }

    const offer = existing.rows[0];

    const approvalChain: Record<string, { requiredStatus: string; nextStatus: string }> = {
      'HR_DIRECTOR': { requiredStatus: 'DRAFT', nextStatus: 'PENDING_FINANCE' },
      'FINANCE_MANAGER': { requiredStatus: 'PENDING_FINANCE', nextStatus: 'PENDING_CEO' },
      'CEO': { requiredStatus: 'PENDING_CEO', nextStatus: 'APPROVED' },
    };

    const step = approvalChain[approverRole];
    if (offer.status !== step.requiredStatus) {
      return NextResponse.json({
        success: false,
        error: `Cannot approve at this stage. Current: ${offer.status}, expected: ${step.requiredStatus}`
      }, { status: 400 });
    }

    const result = await query(`
      UPDATE job_offers
      SET status = $1, approved_by = $2, approved_at = NOW(), updated_at = NOW()
      WHERE offer_id = $3
      RETURNING *
    `, [step.nextStatus, approverId || null, offerId]);

    let nextApprover = null;
    if (approverRole === 'HR_DIRECTOR') nextApprover = 'FINANCE_MANAGER';
    else if (approverRole === 'FINANCE_MANAGER') nextApprover = 'CEO';

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Offer approved by ${approverRole.replace('_', ' ')}${nextApprover ? `. Next: ${nextApprover.replace('_', ' ')}` : '. Fully approved!'}`,
      nextApprover,
      newStatus: step.nextStatus
    });
  } catch (error: any) {
    console.error('Approve offer error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to approve offer' }, { status: 500 });
  }
}
