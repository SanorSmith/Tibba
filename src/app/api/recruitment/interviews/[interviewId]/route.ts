import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// GET - Get interview details with panel and evaluations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;

    // Interview with application and candidate info
    const intResult = await query(`
      SELECT 
        i.*,
        a.application_number, a.status as application_status,
        c.first_name as candidate_first_name, c.last_name as candidate_last_name,
        c.email as candidate_email, c.phone as candidate_phone,
        v.position as vacancy_position, v.department as vacancy_department,
        s.stage_name, s.stage_type
      FROM interviews i
      LEFT JOIN job_applications a ON i.application_id = a.application_id
      LEFT JOIN job_candidates c ON a.candidate_id = c.id
      LEFT JOIN job_vacancies v ON a.vacancy_id = v.id
      LEFT JOIN recruitment_stages s ON i.stage_id = s.stage_id
      WHERE i.interview_id = $1
    `, [interviewId]);

    if (intResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Interview not found' }, { status: 404 });
    }

    // Panel members
    const panelResult = await query(`
      SELECT p.*, e.first_name, e.last_name, e.job_title, e.email_work
      FROM interview_panel p
      LEFT JOIN employees e ON p.interviewer_id = e.id
      WHERE p.interview_id = $1
      ORDER BY p.is_lead DESC, p.created_at
    `, [interviewId]);

    // Evaluations
    const evalResult = await query(`
      SELECT ev.*, u.name as evaluator_name
      FROM interview_evaluations ev
      LEFT JOIN users u ON ev.evaluator_id = u.userid
      WHERE ev.interview_id = $1
      ORDER BY ev.submitted_at
    `, [interviewId]);

    return NextResponse.json({
      success: true,
      data: intResult.rows[0],
      panel: panelResult.rows,
      evaluations: evalResult.rows
    });
  } catch (error: any) {
    console.error('Get interview detail error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch interview' },
      { status: 500 }
    );
  }
}

// PUT - Update interview
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  try {
    const { interviewId } = await params;
    const body = await request.json();

    const allowedFields = [
      'interview_type', 'scheduled_date', 'start_time', 'end_time',
      'location', 'meeting_link', 'status', 'summary',
      'overall_rating', 'overall_recommendation'
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
    values.push(interviewId);

    const result = await query(`
      UPDATE interviews SET ${updates.join(', ')}
      WHERE interview_id = $${idx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Interview updated' });
  } catch (error: any) {
    console.error('Update interview error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update interview' },
      { status: 500 }
    );
  }
}
