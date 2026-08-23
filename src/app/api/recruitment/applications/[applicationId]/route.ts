import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// GET - Get complete application details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_applications WHERE application_id = $1 AND workspace_id = $2',
      [applicationId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Main application with candidate, vacancy, current stage
    const appResult = await query(`
      SELECT 
        a.*,
        c.id as candidate_id, c.candidate_number, c.first_name, c.last_name,
        c.email, c.phone, c.gender, c.nationality, c.education, c.university,
        c.specialization, c.experience_years, c.current_employer, c.expected_salary,
        c.source as candidate_source, c.overall_status as candidate_overall_status,
        v.id as vac_id, v.vacancy_number, v.position, v.department, v.openings,
        v.salary_min, v.salary_max, v.status as vacancy_status,
        s.stage_id as current_stage_id_detail, s.stage_name, s.stage_type, s.stage_order
      FROM job_applications a
      LEFT JOIN job_candidates c ON a.candidate_id = c.id
      LEFT JOIN job_vacancies v ON a.vacancy_id = v.id
      LEFT JOIN recruitment_stages s ON a.current_stage_id = s.stage_id
      WHERE a.application_id = $1
    `, [applicationId]);

    if (appResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    // Stage history
    const historyResult = await query(`
      SELECT h.*, s.stage_name, s.stage_type, s.stage_order
      FROM application_stage_history h
      LEFT JOIN recruitment_stages s ON h.stage_id = s.stage_id
      WHERE h.application_id = $1
      ORDER BY h.entered_at ASC
    `, [applicationId]);

    // Notes
    const notesResult = await query(`
      SELECT * FROM candidate_notes
      WHERE application_id = $1
      ORDER BY created_at DESC
    `, [applicationId]);

    // Documents
    const docsResult = await query(`
      SELECT * FROM candidate_documents
      WHERE application_id = $1
      ORDER BY created_at DESC
    `, [applicationId]);

    // Interviews
    const interviewsResult = await query(`
      SELECT i.*, s.stage_name
      FROM interviews i
      LEFT JOIN recruitment_stages s ON i.stage_id = s.stage_id
      WHERE i.application_id = $1
      ORDER BY i.scheduled_date DESC
    `, [applicationId]);

    // Assessments
    const assessmentsResult = await query(`
      SELECT ca.*, at.test_name, at.test_type
      FROM candidate_assessments ca
      LEFT JOIN assessment_tests at ON ca.test_id = at.test_id
      WHERE ca.application_id = $1
      ORDER BY ca.assigned_date DESC
    `, [applicationId]);

    // Reference checks
    const refsResult = await query(`
      SELECT * FROM reference_checks
      WHERE application_id = $1
      ORDER BY created_at DESC
    `, [applicationId]);

    // Offer
    const offerResult = await query(`
      SELECT * FROM job_offers
      WHERE application_id = $1
      LIMIT 1
    `, [applicationId]);

    return NextResponse.json({
      success: true,
      data: appResult.rows[0],
      stageHistory: historyResult.rows,
      notes: notesResult.rows,
      documents: docsResult.rows,
      interviews: interviewsResult.rows,
      assessments: assessmentsResult.rows,
      references: refsResult.rows,
      offer: offerResult.rows[0] || null
    });
    });
  } catch (error: any) {
    console.error('Get application detail error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

// PUT - Update application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_applications WHERE application_id = $1 AND workspace_id = $2',
      [applicationId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();

    const allowedFields = [
      'status', 'source', 'cover_letter', 'match_score',
      'rejection_reason', 'rejection_stage', 'withdrawal_reason'
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (body[camelField] !== undefined || body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(body[camelField] !== undefined ? body[camelField] : body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(applicationId);

    const result = await query(`
      UPDATE job_applications SET ${updates.join(', ')}
      WHERE application_id = $${idx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Application updated' });
    });
  } catch (error: any) {
    console.error('Update application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  }
}
