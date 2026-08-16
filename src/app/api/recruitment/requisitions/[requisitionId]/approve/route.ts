import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// POST - Approve or reject a requisition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requisitionId: string }> }
) {
  try {
    const { requisitionId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const owns = await query(
      'SELECT 1 FROM job_requisitions WHERE requisition_id = $1 AND workspace_id = $2',
      [requisitionId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    const { approverRole, approverId, action, comments } = body;

    // Validate input
    if (!approverRole || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: approverRole, action' },
        { status: 400 }
      );
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    if (!['HR_DIRECTOR', 'FINANCE_MANAGER', 'CEO'].includes(approverRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid approverRole. Must be HR_DIRECTOR, FINANCE_MANAGER, or CEO' },
        { status: 400 }
      );
    }

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

    // Validate approval chain order
    const approvalChain: Record<string, { requiredStatus: string; nextStatus: string }> = {
      'HR_DIRECTOR': { requiredStatus: 'PENDING_HR', nextStatus: 'PENDING_FINANCE' },
      'FINANCE_MANAGER': { requiredStatus: 'PENDING_FINANCE', nextStatus: 'PENDING_CEO' },
      'CEO': { requiredStatus: 'PENDING_CEO', nextStatus: 'APPROVED' },
    };

    const chainStep = approvalChain[approverRole];

    if (requisition.status !== chainStep.requiredStatus) {
      return NextResponse.json({
        success: false,
        error: `Cannot ${action.toLowerCase()} at this stage. Current status: ${requisition.status}, expected: ${chainStep.requiredStatus}`
      }, { status: 400 });
    }

    // Use a transaction for the update + history insert
    const result = await transaction(async (client) => {
      let newStatus: string;
      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramIndex = 1;

      if (action === 'APPROVED') {
        newStatus = chainStep.nextStatus;

        // Set approver fields
        if (approverRole === 'HR_DIRECTOR') {
          updates.push(`hr_approved_by = $${paramIndex++}`);
          values.push(approverId || null);
          updates.push(`hr_approved_at = NOW()`);
        } else if (approverRole === 'FINANCE_MANAGER') {
          updates.push(`finance_approved_by = $${paramIndex++}`);
          values.push(approverId || null);
          updates.push(`finance_approved_at = NOW()`);
        } else if (approverRole === 'CEO') {
          updates.push(`final_approved_by = $${paramIndex++}`);
          values.push(approverId || null);
          updates.push(`final_approved_at = NOW()`);
        }
      } else {
        // REJECTED
        newStatus = 'REJECTED';
        updates.push(`rejected_by = $${paramIndex++}`);
        values.push(approverId || null);
        updates.push(`rejected_at = NOW()`);
        if (comments) {
          updates.push(`rejection_reason = $${paramIndex++}`);
          values.push(comments);
        }
      }

      updates.push(`status = $${paramIndex++}`);
      values.push(newStatus);

      values.push(requisitionId);

      const updateSql = `
        UPDATE job_requisitions 
        SET ${updates.join(', ')}
        WHERE requisition_id = $${paramIndex}
        RETURNING *
      `;

      const updateResult = await client.query(updateSql, values);

      // Log approval history
      await client.query(`
        INSERT INTO requisition_approval_history 
          (requisition_id, approver_role, approver_id, action, comments)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        requisitionId,
        approverRole,
        approverId || '00000000-0000-0000-0000-000000000000',
        action,
        comments || null
      ]);

      // If fully approved, automatically create a job vacancy
      if (newStatus === 'APPROVED') {
        const req = updateResult.rows[0];
        const vacancyNumber = `VAC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

        await client.query(`
          INSERT INTO job_vacancies (
            id, vacancy_number, position, department, department_id,
            openings, posting_date, deadline, status, priority,
            salary_min, salary_max, description, requirements,
            requisition_id, location, employment_type, job_description,
            responsibilities, required_qualifications, preferred_qualifications,
            workspace_id, created_by
          ) VALUES (
            gen_random_uuid(), $1, $2, '', $3,
            $4, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'OPEN', $5,
            $6, $7, $8, $9,
            $10, $11, $12, $8,
            $13, $9, $14,
            $15, $16
          )
        `, [
          vacancyNumber,
          req.position_title,
          req.department_id,
          req.number_of_positions,
          req.priority || 'NORMAL',
          req.salary_min,
          req.salary_max,
          req.job_description,
          req.required_qualifications,
          req.requisition_id,
          req.location || 'Baghdad',
          req.employment_type || 'FULL_TIME',
          req.key_responsibilities,
          req.preferred_qualifications,
          req.workspace_id,
          req.created_by
        ]);
      }

      return updateResult.rows[0];
    });

    // Determine next approver
    let nextApprover = null;
    if (action === 'APPROVED') {
      if (approverRole === 'HR_DIRECTOR') nextApprover = 'FINANCE_MANAGER';
      else if (approverRole === 'FINANCE_MANAGER') nextApprover = 'CEO';
      else nextApprover = null; // Fully approved
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: action === 'APPROVED'
        ? `Requisition approved by ${approverRole.replace('_', ' ')}${nextApprover ? `. Next: ${nextApprover.replace('_', ' ')}` : '. Fully approved! Vacancy created.'}`
        : `Requisition rejected by ${approverRole.replace('_', ' ')}`,
      nextApprover,
      newStatus: result.status
    });
  } catch (error: any) {
    console.error('Approve requisition error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process approval' },
      { status: 500 }
    );
  }
}
