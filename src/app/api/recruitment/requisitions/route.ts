import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// GET - List all requisitions
export async function GET(request: NextRequest) {
  try {
    // workspaceId was a query-string filter and optional, so omitting it
    // returned every facility's records.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');

    let sql = `
      SELECT 
        r.*,
        e.first_name || ' ' || e.last_name as requester_name,
        e.job_title as requester_title,
        d.name as department_name
      FROM job_requisitions r
      LEFT JOIN employees e ON r.requested_by = e.id
      LEFT JOIN departments d ON r.department_id = d.departmentid
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    sql += ` AND r.workspace_id = $${paramIndex++}`;
    params.push(workspaceId);
    if (status) {
      sql += ` AND r.status = $${paramIndex++}`;
      params.push(status);
    }
    if (departmentId) {
      sql += ` AND r.department_id = $${paramIndex++}`;
      params.push(departmentId);
    }

    sql += ' ORDER BY r.created_at DESC';

    const result = await query(sql, params);

    // Get summary stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
        COUNT(*) FILTER (WHERE status = 'PENDING_HR') as pending_hr,
        COUNT(*) FILTER (WHERE status = 'PENDING_FINANCE') as pending_finance,
        COUNT(*) FILTER (WHERE status = 'PENDING_CEO') as pending_ceo,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
      FROM job_requisitions
      ${workspaceId ? 'WHERE workspace_id = $1' : ''}
    `, workspaceId ? [workspaceId] : []);

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0],
      count: result.rows.length
    });
    });
  } catch (error: any) {
    console.error('Get requisitions error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch requisitions' },
      { status: 500 }
    );
  }
}

// POST - Create new requisition
export async function POST(request: NextRequest) {
  try {
    // Facility comes from the session, never the request body.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const body = await request.json();
    const {
            positionTitle,
      departmentId,
      reportingTo,
      location,
      employmentType,
      numberOfPositions,
      replacementFor,
      isReplacement,
      salaryMin,
      salaryMax,
      currency,
      priority,
      requiredByDate,
      businessJustification,
      jobDescription,
      keyResponsibilities,
      requiredQualifications,
      preferredQualifications,
      requestedBy,
      createdBy,
    } = body;

    if (!positionTitle) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: positionTitle' },
        { status: 400 }
      );
    }

    // Generate requisition number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const seq = Date.now().toString().slice(-6);
    const requisitionNumber = `REQ-${today}-${seq}`;

    // Calculate budget impact
    const sMin = parseFloat(salaryMin) || 0;
    const sMax = parseFloat(salaryMax) || 0;
    const avgSalary = (sMin + sMax) / 2;
    const numPos = parseInt(numberOfPositions) || 1;
    const annualBudgetImpact = avgSalary * numPos * 12;

    const result = await query(`
      INSERT INTO job_requisitions (
        requisition_number, workspace_id, position_title, department_id,
        reporting_to, location, employment_type, number_of_positions,
        replacement_for, is_replacement, salary_min, salary_max,
        currency, annual_budget_impact, requested_by, requested_date,
        required_by_date, status, priority, business_justification,
        job_description, key_responsibilities, required_qualifications,
        preferred_qualifications, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, CURRENT_DATE, $16,
        'DRAFT', $17, $18, $19, $20, $21, $22, $23
      ) RETURNING *
    `, [
      requisitionNumber, workspaceId, positionTitle, departmentId || null,
      reportingTo || null, location || 'Baghdad', employmentType || 'FULL_TIME',
      numPos, replacementFor || null, isReplacement || false,
      sMin || null, sMax || null, currency || 'IQD',
      annualBudgetImpact || null, requestedBy || null,
      requiredByDate || null, priority || 'NORMAL',
      businessJustification || null, jobDescription || null,
      keyResponsibilities || null, requiredQualifications || null,
      preferredQualifications || null, createdBy || null
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Requisition created successfully'
    }, { status: 201 });
    });
  } catch (error: any) {
    console.error('Create requisition error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create requisition' },
      { status: 500 }
    );
  }
}
