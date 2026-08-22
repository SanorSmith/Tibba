import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


// GET /api/insurance-claims/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM insurance_claims WHERE id = $1 AND workspaceid = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('GET claim error:', error);
    return NextResponse.json({ error: 'Failed to fetch claim' }, { status: 500 });
  }
}

// PUT /api/insurance-claims/[id]
// Handles three update types:
//   action: 'approve'     → status = APPROVED, set approved_amount, approval_date
//   action: 'reject'      → status = REJECTED, set rejection_reason
//   action: 'record_payment' → status = PAID | PARTIALLY_PAID, set paid_amount, payment_date
//   action: 'resubmit'    → status = SUBMITTED
//   (no action)           → generic field update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Fetch current claim
    const current = await pool.query(
      'SELECT * FROM insurance_claims WHERE id = $1 AND workspaceid = $2',
      [id, workspaceId]
    );
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }
    const claim = current.rows[0];

    let updateQuery = '';
    let updateValues: any[] = [];

    if (action === 'approve') {
      const { approved_amount } = body;
      if (approved_amount === undefined || approved_amount < 0) {
        return NextResponse.json({ error: 'approved_amount is required' }, { status: 400 });
      }
      const approveResult = await pool.query(
        `UPDATE insurance_claims
         SET status = 'APPROVED',
             approved_amount = $1,
             approval_date = CURRENT_DATE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [approved_amount, id]
      );

      // Sync the linked invoice's coverage amount to what was actually approved
      // (non-fatal) — keeps the invoice list/report in step with the claim outcome.
      if (claim.invoice_id) {
        try {
          await pool.query(
            `UPDATE invoices
             SET insurance_coverage_amount = $1,
                 patient_responsibility = GREATEST(total_amount - $1, 0),
                 updatedat = NOW()
             WHERE id = $2 AND workspaceid = $3`,
            [approved_amount, claim.invoice_id, workspaceId]
          );
        } catch (syncErr) {
          console.warn('[approve] invoice sync error (non-fatal):', syncErr);
        }
      }

      return NextResponse.json({ success: true, data: approveResult.rows[0] });

    } else if (action === 'reject') {
      const { rejection_reason } = body;
      updateQuery = `
        UPDATE insurance_claims
        SET status = 'REJECTED',
            rejection_reason = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      updateValues = [rejection_reason || 'No reason provided', id];

    } else if (action === 'record_payment') {
      const { paid_amount, payment_date } = body;
      if (paid_amount === undefined || paid_amount < 0) {
        return NextResponse.json({ error: 'paid_amount is required' }, { status: 400 });
      }

      const claimPrevPaid  = parseFloat(claim.paid_amount)   || 0;
      const claimApproved  = parseFloat(claim.approved_amount) || 0;
      const newPayment     = parseFloat(paid_amount);
      const claimTotalPaid = claimPrevPaid + newPayment;
      const claimNewStatus = claimTotalPaid >= claimApproved ? 'PAID' : 'PARTIALLY_PAID';

      // 1. Update claim first
      const claimResult = await pool.query(
        `UPDATE insurance_claims
         SET paid_amount = $1,
             status = $2,
             payment_date = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [
          claimTotalPaid,
          claimNewStatus,
          payment_date || new Date().toISOString().split('T')[0],
          id,
        ]
      );

      // 2. Sync the linked invoice (non-fatal)
      if (claim.invoice_id) {
        try {
          const invRes = await pool.query(
            'SELECT total_amount, amount_paid FROM invoices WHERE id = $1 AND workspaceid = $2',
            [claim.invoice_id, workspaceId]
          );
          if (invRes.rows.length > 0) {
            const inv = invRes.rows[0];
            const invTotalAmount = parseFloat(inv.total_amount) || 0;
            const invAmountPaid  = (parseFloat(inv.amount_paid) || 0) + newPayment;
            const invBalanceDue  = Math.max(0, invTotalAmount - invAmountPaid);
            const invStatus      = invBalanceDue <= 0 ? 'PAID' : 'PARTIAL';
            await pool.query(
              `UPDATE invoices
               SET amount_paid = $1, balance_due = $2, status = $3, updatedat = NOW()
               WHERE id = $4 AND workspaceid = $5`,
              [invAmountPaid, invBalanceDue, invStatus, claim.invoice_id, workspaceId]
            );
          }
        } catch (syncErr) {
          console.warn('[record_payment] invoice sync error (non-fatal):', syncErr);
        }
      }

      return NextResponse.json({ success: true, data: claimResult.rows[0] });

    } else if (action === 'resubmit') {
      updateQuery = `
        UPDATE insurance_claims
        SET status = 'SUBMITTED',
            rejection_reason = NULL,
            submission_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      updateValues = [id];

    } else if (action === 'under_review') {
      updateQuery = `
        UPDATE insurance_claims
        SET status = 'UNDER_REVIEW',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      updateValues = [id];

    } else {
      // Generic update
      const { notes, approved_amount, status } = body;
      updateQuery = `
        UPDATE insurance_claims
        SET notes = COALESCE($1, notes),
            approved_amount = COALESCE($2, approved_amount),
            status = COALESCE($3, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      updateValues = [notes ?? null, approved_amount ?? null, status ?? null, id];
    }

    const result = await pool.query(updateQuery, updateValues);
    return NextResponse.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('PUT claim error:', error);
    return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 });
  }
}

// DELETE /api/insurance-claims/[id]  (only DRAFT or REJECTED claims)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const current = await pool.query(
      'SELECT status FROM insurance_claims WHERE id = $1 AND workspaceid = $2',
      [id, workspaceId]
    );
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }
    const { status } = current.rows[0];
    if (!['SUBMITTED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: `Cannot delete a claim with status ${status}` },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM insurance_claims WHERE id = $1 AND workspaceid = $2', [id, workspaceId]);
    return NextResponse.json({ success: true, message: 'Claim deleted' });
  } catch (error) {
    console.error('DELETE claim error:', error);
    return NextResponse.json({ error: 'Failed to delete claim' }, { status: 500 });
  }
}
