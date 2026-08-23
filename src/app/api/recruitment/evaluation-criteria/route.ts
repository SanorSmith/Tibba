import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// GET - List evaluation criteria
export async function GET(request: NextRequest) {
  try {
    // Was supplied by the caller, so one facility could read or write
    // another's by passing its id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const appliesTo = searchParams.get('appliesTo');

    let sql = `
      SELECT * FROM evaluation_criteria
      WHERE workspace_id = $1 AND is_active = TRUE
    `;
    const params: any[] = [workspaceId];
    let idx = 2;

    if (appliesTo) {
      sql += ` AND (applies_to = $${idx} OR applies_to = 'ALL')`;
      params.push(appliesTo);
      idx++;
    }

    sql += ' ORDER BY criteria_category, weight DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    });
  } catch (error: any) {
    console.error('Get criteria error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch criteria' },
      { status: 500 }
    );
  }
}

// POST - Create a new evaluation criterion
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
      criteriaName,
      criteriaCategory,
      description,
      weight,
      maxScore,
      isRequired,
      appliesTo,
    } = body;

    if (!criteriaName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: criteriaName' },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO evaluation_criteria (
        workspace_id, criteria_name, criteria_category,
        description, weight, max_score, is_required, is_active, applies_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
      RETURNING *
    `, [
      workspaceId, criteriaName, criteriaCategory || 'GENERAL',
      description || null, weight || 1.0, maxScore || 5.0,
      isRequired !== false, appliesTo || 'ALL'
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Evaluation criterion created'
    }, { status: 201 });
    });
  } catch (error: any) {
    console.error('Create criterion error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create criterion' },
      { status: 500 }
    );
  }
}
