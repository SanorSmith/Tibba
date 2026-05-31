import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// POST - Submit requisition for approval (starts with HR)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requisitionId: string }> }
) {
  try {
    const { requisitionId } = await params;

    // Get requisition
    const existing = await query(
      'SELECT * FROM job_requisitions WHERE requisition_id = $1',
      [requisitionId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Requisition not found' },
        { status: 404 }
      );
    }

    const requisition = existing.rows[0];

    if (!['DRAFT', 'REJECTED'].includes(requisition.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot submit requisition in status: ${requisition.status}` },
        { status: 400 }
      );
    }

    // Validate required fields before submission
    const missingFields: string[] = [];
    if (!requisition.position_title) missingFields.push('position_title');
    if (!requisition.business_justification) missingFields.push('business_justification');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields for submission: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Update status to PENDING_HR
    const result = await query(`
      UPDATE job_requisitions 
      SET status = 'PENDING_HR', updated_at = NOW()
      WHERE requisition_id = $1
      RETURNING *
    `, [requisitionId]);

    // Log in approval history
    await query(`
      INSERT INTO requisition_approval_history 
        (requisition_id, approver_role, approver_id, action, comments)
      VALUES ($1, 'REQUESTER', $2, 'SUBMITTED', 'Requisition submitted for HR approval')
    `, [requisitionId, requisition.requested_by || requisition.created_by || '00000000-0000-0000-0000-000000000000']);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Requisition submitted for HR approval',
      nextApprover: 'HR_DIRECTOR'
    });
  } catch (error: any) {
    console.error('Submit requisition error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit requisition' },
      { status: 500 }
    );
  }
}
