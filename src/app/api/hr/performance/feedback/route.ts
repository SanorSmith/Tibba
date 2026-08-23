import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


// GET - List patient feedback with filters
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const patientId = searchParams.get('patient_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        pf.*,
        s.firstname || ' ' || s.lastname as employee_name,
        s.role as employee_role,
        p.firstname || ' ' || p.lastname as patient_name
      FROM patient_feedback pf
      -- patient_feedback has no workspace column of its own, so the facility
      -- filter has to come from the employee the feedback is about. INNER
      -- JOIN, not LEFT, or unmatched rows would leak through.
      JOIN staff s ON pf.employee_id = s.staffid AND s.workspaceid = $1
      LEFT JOIN patients p ON pf.patient_id = p.patientid
      WHERE 1=1
    `;
    
    const params: any[] = [workspaceId];
    let paramCount = 2;

    if (employeeId) {
      query += ` AND pf.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }

    if (patientId) {
      query += ` AND pf.patient_id = $${paramCount}`;
      params.push(patientId);
      paramCount++;
    }

    query += ` ORDER BY pf.feedback_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

    });
  } catch (error: any) {
    console.error('Error fetching patient feedback:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Submit patient feedback
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const body = await request.json();
    
    const {
      employee_id,
      patient_id,
      appointment_date,
      communication_rating,
      professionalism_rating,
      care_quality_rating,
      overall_satisfaction,
      positive_comments,
      improvement_areas,
      additional_comments,
      is_anonymous = false
    } = body;

    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    // The feedback is about an employee, so that employee must be ours.
    const emp = await pool.query(
      'SELECT 1 FROM staff WHERE staffid = $1 AND workspaceid = $2',
      [employee_id, workspaceId]
    );
    if (emp.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const result = await pool.query(
      `INSERT INTO patient_feedback (
        employee_id, patient_id, appointment_date,
        communication_rating, professionalism_rating,
        care_quality_rating, overall_satisfaction,
        positive_comments, improvement_areas,
        additional_comments, is_anonymous
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        employee_id, patient_id, appointment_date,
        communication_rating, professionalism_rating,
        care_quality_rating, overall_satisfaction,
        positive_comments, improvement_areas,
        additional_comments, is_anonymous
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Feedback submitted successfully'
    }, { status: 201 });

    });
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
