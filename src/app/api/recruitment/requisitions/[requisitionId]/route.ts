import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - Get requisition details
export async function GET(
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

    // Get requisition with related data
    const result = await query(`
      SELECT 
        r.*,
        req.first_name || ' ' || req.last_name as requester_name,
        req.job_title as requester_title,
        req.email_work as requester_email,
        d.name as department_name,
        rep.first_name || ' ' || rep.last_name as reporting_to_name,
        hrap.name as hr_approver_name,
        finap.name as finance_approver_name,
        ceoap.name as final_approver_name
      FROM job_requisitions r
      LEFT JOIN employees req ON r.requested_by = req.id
      LEFT JOIN departments d ON r.department_id = d.departmentid
      LEFT JOIN employees rep ON r.reporting_to = rep.id
      LEFT JOIN users hrap ON r.hr_approved_by = hrap.userid
      LEFT JOIN users finap ON r.finance_approved_by = finap.userid
      LEFT JOIN users ceoap ON r.final_approved_by = ceoap.userid
      WHERE r.requisition_id = $1
    `, [requisitionId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Requisition not found' },
        { status: 404 }
      );
    }

    // Get approval history
    const historyResult = await query(`
      SELECT 
        ah.*,
        u.name as approver_name
      FROM requisition_approval_history ah
      LEFT JOIN users u ON ah.approver_id = u.userid
      WHERE ah.requisition_id = $1
      ORDER BY ah.approved_at ASC
    `, [requisitionId]);

    // Get linked vacancy if any
    const vacancyResult = await query(`
      SELECT * FROM job_vacancies WHERE requisition_id = $1
    `, [requisitionId]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      approvalHistory: historyResult.rows,
      linkedVacancy: vacancyResult.rows[0] || null
    });
  } catch (error: any) {
    console.error('Get requisition detail error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch requisition' },
      { status: 500 }
    );
  }
}

// PUT - Update requisition
export async function PUT(
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

    // Check if requisition exists and is editable
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

    if (!['DRAFT', 'REJECTED'].includes(existing.rows[0].status)) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit requisition in current status: ' + existing.rows[0].status },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const allowedFields = [
      'position_title', 'department_id', 'reporting_to', 'location',
      'employment_type', 'number_of_positions', 'replacement_for',
      'is_replacement', 'salary_min', 'salary_max', 'currency',
      'priority', 'required_by_date', 'business_justification',
      'job_description', 'key_responsibilities', 'required_qualifications',
      'preferred_qualifications'
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      // Convert camelCase from body to snake_case
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (body[camelField] !== undefined || body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(body[camelField] !== undefined ? body[camelField] : body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);

    // Recalculate budget impact if salary changed
    const sMin = body.salaryMin || body.salary_min || existing.rows[0].salary_min;
    const sMax = body.salaryMax || body.salary_max || existing.rows[0].salary_max;
    const numPos = body.numberOfPositions || body.number_of_positions || existing.rows[0].number_of_positions;
    if (sMin && sMax) {
      const avgSalary = (parseFloat(sMin) + parseFloat(sMax)) / 2;
      const annualBudgetImpact = avgSalary * parseInt(numPos) * 12;
      updates.push(`annual_budget_impact = $${paramIndex++}`);
      values.push(annualBudgetImpact);
    }

    values.push(requisitionId);
    const sql = `
      UPDATE job_requisitions 
      SET ${updates.join(', ')}
      WHERE requisition_id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Requisition updated successfully'
    });
  } catch (error: any) {
    console.error('Update requisition error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update requisition' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a DRAFT requisition
export async function DELETE(
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

    const existing = await query(
      'SELECT status FROM job_requisitions WHERE requisition_id = $1',
      [requisitionId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Requisition not found' },
        { status: 404 }
      );
    }

    if (existing.rows[0].status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only DRAFT requisitions can be deleted' },
        { status: 400 }
      );
    }

    await query('DELETE FROM job_requisitions WHERE requisition_id = $1', [requisitionId]);

    return NextResponse.json({
      success: true,
      message: 'Requisition deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete requisition error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete requisition' },
      { status: 500 }
    );
  }
}
