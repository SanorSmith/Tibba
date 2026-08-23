import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - Get pipeline summary (application counts per stage)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Was a query param, so any facility's pipeline could be requested.
    // Left unwrapped: the "not signed in" guard sits after other work here,
    // so a wrapper would have to run before the facility is known to exist.
    const workspaceId = await getWorkspaceId(request);
    const vacancyId = searchParams.get('vacancyId');

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Get all active stages for workspace
    const stagesResult = await query(`
      SELECT stage_id, stage_name, stage_type, stage_order, target_days
      FROM recruitment_stages
      WHERE workspace_id = $1 AND is_active = TRUE
      ORDER BY stage_order
    `, [workspaceId]);

    // Get application counts per stage
    let countSql = `
      SELECT 
        a.current_stage_id as stage_id,
        COUNT(*) as count
      FROM job_applications a
      WHERE a.workspace_id = $1
    `;
    const countParams: any[] = [workspaceId];
    if (vacancyId) {
      countSql += ' AND a.vacancy_id = $2';
      countParams.push(vacancyId);
    }
    countSql += ' GROUP BY a.current_stage_id';

    const countsResult = await query(countSql, countParams);
    const countsMap: Record<string, number> = {};
    countsResult.rows.forEach((row: any) => {
      if (row.stage_id) countsMap[row.stage_id] = parseInt(row.count);
    });

    // Build pipeline
    const pipeline = stagesResult.rows.map((stage: any) => ({
      stageId: stage.stage_id,
      stageName: stage.stage_name,
      stageType: stage.stage_type,
      stageOrder: stage.stage_order,
      targetDays: stage.target_days,
      count: countsMap[stage.stage_id] || 0,
    }));

    // Status summary
    let statusSql = `
      SELECT status, COUNT(*)::int as count
      FROM job_applications
      WHERE workspace_id = $1
    `;
    const statusParams: any[] = [workspaceId];
    if (vacancyId) {
      statusSql += ' AND vacancy_id = $2';
      statusParams.push(vacancyId);
    }
    statusSql += ' GROUP BY status';

    const statusResult = await query(statusSql, statusParams);

    // Time-to-hire metrics
    let metricsSql = `
      SELECT 
        COUNT(*) as total_applications,
        AVG(CASE WHEN hired_at IS NOT NULL THEN EXTRACT(EPOCH FROM (hired_at - applied_date)) / 86400 END) as avg_time_to_hire_days,
        COUNT(*) FILTER (WHERE status = 'HIRED') as total_hired,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as total_rejected
      FROM job_applications
      WHERE workspace_id = $1
    `;
    const metricsParams: any[] = [workspaceId];
    if (vacancyId) {
      metricsSql += ' AND vacancy_id = $2';
      metricsParams.push(vacancyId);
    }

    const metricsResult = await query(metricsSql, metricsParams);

    return NextResponse.json({
      success: true,
      pipeline,
      statusSummary: statusResult.rows,
      metrics: metricsResult.rows[0]
    });
  } catch (error: any) {
    console.error('Get pipeline summary error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pipeline summary' },
      { status: 500 }
    );
  }
}
