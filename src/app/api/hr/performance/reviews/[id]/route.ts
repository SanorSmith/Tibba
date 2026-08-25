import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


// GET - Get single performance review by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const result = await pool.query(
      `SELECT 
        pr.*,
        e.firstname || ' ' || e.lastname as employee_name,
        e.role as employee_role,
        e.unit as employee_department,
        r.firstname || ' ' || r.lastname as reviewer_name
      FROM performance_reviews pr
      LEFT JOIN staff e ON pr.employee_id = e.staffid
      LEFT JOIN staff r ON pr.reviewer_id = r.staffid
      WHERE pr.id = $1 AND pr.workspaceid = $2`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Performance review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

    });
  } catch (error: any) {
    console.error('Error fetching performance review:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update performance review
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const body = await request.json();

    const {
      reviewer_id,
      cycle_id,
      cycle_name,
      review_period_start,
      review_period_end,
      clinical_competence,
      patient_care,
      professionalism,
      teamwork,
      quality_safety,
      attendance_score,
      attendance_rating,
      patient_feedback_score,
      recognition_bonus,
      strengths,
      improvements,
      achievements,
      goals_next_period,
      recommendation,
      status
    } = body;

    // Calculate overall rating if competency scores are provided
    let overall_rating = null;
    if (clinical_competence && patient_care && professionalism && teamwork && quality_safety) {
      overall_rating = (
        parseFloat(clinical_competence) +
        parseFloat(patient_care) +
        parseFloat(professionalism) +
        parseFloat(teamwork) +
        parseFloat(quality_safety)
      ) / 5;
      overall_rating = Math.round(overall_rating * 10) / 10;
    }

    // Update timestamps based on status
    let statusUpdates = '';
    if (status === 'SUBMITTED') {
      statusUpdates = ', submitted_at = CURRENT_TIMESTAMP';
    } else if (status === 'FINALIZED') {
      statusUpdates = ', finalized_at = CURRENT_TIMESTAMP';
    }

    const result = await pool.query(
      `UPDATE performance_reviews SET
        reviewer_id = COALESCE($1, reviewer_id),
        cycle_id = COALESCE($2, cycle_id),
        cycle_name = COALESCE($3, cycle_name),
        review_period_start = COALESCE($4, review_period_start),
        review_period_end = COALESCE($5, review_period_end),
        clinical_competence = COALESCE($6, clinical_competence),
        patient_care = COALESCE($7, patient_care),
        professionalism = COALESCE($8, professionalism),
        teamwork = COALESCE($9, teamwork),
        quality_safety = COALESCE($10, quality_safety),
        overall_rating = COALESCE($11, overall_rating),
        attendance_score = COALESCE($12, attendance_score),
        attendance_rating = COALESCE($13, attendance_rating),
        patient_feedback_score = COALESCE($14, patient_feedback_score),
        recognition_bonus = COALESCE($15, recognition_bonus),
        strengths = COALESCE($16, strengths),
        improvements = COALESCE($17, improvements),
        achievements = COALESCE($18, achievements),
        goals_next_period = COALESCE($19, goals_next_period),
        recommendation = COALESCE($20, recommendation),
        status = COALESCE($21, status)
        ${statusUpdates}
      WHERE id = $22 AND workspaceid = $23
      RETURNING *`,
      [
        reviewer_id, cycle_id, cycle_name,
        review_period_start, review_period_end,
        clinical_competence, patient_care, professionalism,
        teamwork, quality_safety, overall_rating,
        attendance_score, attendance_rating,
        patient_feedback_score, recognition_bonus,
        strengths, improvements, achievements,
        goals_next_period, recommendation, status,
        id,
        workspaceId
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Performance review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Performance review updated successfully'
    });

    });
  } catch (error: any) {
    console.error('Error updating performance review:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete performance review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const { id } = await params;

    const result = await pool.query(
      'DELETE FROM performance_reviews WHERE id = $1 AND workspaceid = $2 RETURNING id',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Performance review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Performance review deleted successfully'
    });

    });
  } catch (error: any) {
    console.error('Error deleting performance review:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
