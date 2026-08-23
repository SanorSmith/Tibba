import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// GET - List all applications with filters
export async function GET(request: NextRequest) {
  try {
    // workspaceId used to come from the query string and was optional, so
    // omitting it listed every facility's applications.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const vacancyId = searchParams.get('vacancyId');
    const status = searchParams.get('status');
    const stageId = searchParams.get('stageId');
    const search = searchParams.get('search');

    let sql = `
      SELECT 
        a.*,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        c.source as candidate_source,
        v.position as vacancy_position,
        v.department as vacancy_department,
        s.stage_name as current_stage_name,
        s.stage_type as current_stage_type,
        s.stage_order as current_stage_order
      FROM job_applications a
      LEFT JOIN job_candidates c ON a.candidate_id = c.id
      LEFT JOIN job_vacancies v ON a.vacancy_id = v.id
      LEFT JOIN recruitment_stages s ON a.current_stage_id = s.stage_id
      WHERE 1=1
    `;
    const params: any[] = [workspaceId];
    let idx = 2;
    sql += ' AND a.workspace_id = $1';
    if (vacancyId) {
      sql += ` AND a.vacancy_id = $${idx++}`;
      params.push(vacancyId);
    }
    if (status) {
      sql += ` AND a.status = $${idx++}`;
      params.push(status);
    }
    if (stageId) {
      sql += ` AND a.current_stage_id = $${idx++}`;
      params.push(stageId);
    }
    if (search) {
      sql += ` AND (c.first_name ILIKE $${idx} OR c.last_name ILIKE $${idx} OR c.email ILIKE $${idx} OR v.position ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ' ORDER BY a.created_at DESC';

    const result = await query(sql, params);

    // Stats
    const statsParams: any[] = [workspaceId];
    let statsWhere = 'WHERE workspace_id = $1';
    let sIdx = 2;
    if (vacancyId) {
      statsWhere += ` AND vacancy_id = $${sIdx++}`;
      statsParams.push(vacancyId);
    }

    const statsResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
        COUNT(*) FILTER (WHERE status = 'SCREENING') as screening,
        COUNT(*) FILTER (WHERE status = 'INTERVIEWING') as interviewing,
        COUNT(*) FILTER (WHERE status = 'OFFERED') as offered,
        COUNT(*) FILTER (WHERE status = 'HIRED') as hired,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
        COUNT(*) FILTER (WHERE status = 'WITHDRAWN') as withdrawn
      FROM job_applications ${statsWhere}
    `, statsParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0],
      count: result.rows.length
    });
    });
  } catch (error: any) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST - Create new application
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const body = await request.json();
    const {
      candidateId,
      vacancyId,
      source,
      coverLetter,
      isInternal,
      createdBy,
    } = body;

    if (!candidateId || !vacancyId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: candidateId, vacancyId' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await query(
      'SELECT application_id FROM job_applications WHERE candidate_id = $1 AND vacancy_id = $2 AND workspace_id = $3',
      [candidateId, vacancyId, workspaceId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Candidate already applied to this vacancy' },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      // Generate application number
      const appNumber = `APP-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

      // Get first stage (Applied)
      const stageResult = await client.query(
        'SELECT stage_id FROM recruitment_stages WHERE workspace_id = $1 AND stage_order = 1 LIMIT 1',
        [workspaceId]
      );
      const firstStageId = stageResult.rows[0]?.stage_id || null;

      // Create application
      const appResult = await client.query(`
        INSERT INTO job_applications (
          application_number, workspace_id, candidate_id, vacancy_id,
          applied_date, current_stage_id, status, source,
          cover_letter, is_internal, created_by
        ) VALUES ($1, $2, $3, $4, NOW(), $5, 'ACTIVE', $6, $7, $8, $9)
        RETURNING *
      `, [appNumber, workspaceId, candidateId, vacancyId, firstStageId,
          source || null, coverLetter || null, isInternal || false, createdBy || null]);

      const app = appResult.rows[0];

      // Create initial stage history
      if (firstStageId) {
        await client.query(`
          INSERT INTO application_stage_history (application_id, stage_id, entered_at, outcome, notes)
          VALUES ($1, $2, NOW(), 'IN_PROGRESS', 'Application submitted')
        `, [app.application_id, firstStageId]);
      }

      return app;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Application submitted successfully'
    }, { status: 201 });
    });
  } catch (error: any) {
    console.error('Create application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create application' },
      { status: 500 }
    );
  }
}
