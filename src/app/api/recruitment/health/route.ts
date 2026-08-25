import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { query } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // The counts below are a facility's own recruitment volume, not the
    // platform's, so this reports only the caller's numbers.
    const ws = await getWorkspaceId(request);
    if (!ws) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(ws, async () => {

    await query('SELECT 1', []);

    const counts = await query(`
      SELECT
        (SELECT COUNT(*) FROM job_requisitions     WHERE workspace_id = $1) as requisitions,
        (SELECT COUNT(*) FROM job_applications     WHERE workspace_id = $1) as applications,
        (SELECT COUNT(*) FROM interviews           WHERE workspace_id = $1) as interviews,
        (SELECT COUNT(*) FROM job_offers           WHERE workspace_id = $1) as offers,
        (SELECT COUNT(*) FROM assessment_tests     WHERE workspace_id = $1) as assessment_tests,
        (SELECT COUNT(*) FROM candidate_assessments WHERE workspaceid  = $1) as assessments,
        (SELECT COUNT(*) FROM reference_checks     WHERE workspaceid  = $1) as reference_checks,
        (SELECT COUNT(*) FROM background_checks    WHERE workspaceid  = $1) as background_checks,
        (SELECT COUNT(*) FROM recruitment_stages   WHERE workspace_id = $1) as stages,
        (SELECT COUNT(*) FROM evaluation_criteria  WHERE workspace_id = $1) as criteria
    `, [ws]);

    return NextResponse.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      stats: counts.rows[0]
    });
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
