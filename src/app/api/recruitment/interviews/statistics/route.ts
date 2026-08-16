import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - Get interview statistics for an application
export async function GET(request: NextRequest) {
  try {
    // The facility always comes from the session. Previously it was a query
    // param, so stats for any workspace could be requested by id.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (applicationId) {
      // Per-application statistics
      const interviewsResult = await query(`
        SELECT 
          COUNT(*) as total_interviews,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
          COUNT(*) FILTER (WHERE status = 'SCHEDULED') as scheduled,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled
        FROM interviews WHERE application_id = $1 AND workspace_id = $2
      `, [applicationId, workspaceId]);

      const evalsResult = await query(`
        SELECT 
          COUNT(*) as total_evaluations,
          AVG(overall_rating) as avg_overall_rating,
          recommendation, COUNT(*) as rec_count
        FROM interview_evaluations
        WHERE interview_id IN (
          SELECT interview_id FROM interviews
          WHERE application_id = $1 AND workspace_id = $2
        )
        GROUP BY recommendation
      `, [applicationId, workspaceId]);

      // Build recommendation breakdown
      const recommendations: Record<string, number> = {};
      let totalEvals = 0;
      let avgRating = 0;
      evalsResult.rows.forEach((row: any) => {
        recommendations[row.recommendation] = parseInt(row.rec_count);
        totalEvals += parseInt(row.rec_count);
        avgRating += parseFloat(row.avg_overall_rating || 0) * parseInt(row.rec_count);
      });
      if (totalEvals > 0) avgRating = avgRating / totalEvals;

      return NextResponse.json({
        success: true,
        data: {
          interviews: interviewsResult.rows[0],
          totalEvaluations: totalEvals,
          averageRating: parseFloat(avgRating.toFixed(2)),
          recommendations
        }
      });
    }

    // Workspace-level statistics
    const wsStats = await query(`
      SELECT 
        COUNT(*) as total_interviews,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
        COUNT(*) FILTER (WHERE status = 'SCHEDULED') as upcoming,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
        COUNT(DISTINCT application_id) as unique_applications,
        AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL) as avg_rating
      FROM interviews WHERE workspace_id = $1
    `, [workspaceId]);

    const evalStats = await query(`
      SELECT 
        COUNT(*) as total_evaluations,
        AVG(overall_rating) as avg_overall_rating,
        recommendation, COUNT(*) as count
      FROM interview_evaluations
      WHERE interview_id IN (SELECT interview_id FROM interviews WHERE workspace_id = $1)
      GROUP BY recommendation
    `, [workspaceId]);

    return NextResponse.json({
      success: true,
      data: {
        overview: wsStats.rows[0],
        evaluationBreakdown: evalStats.rows
      }
    });
  } catch (error: any) {
    console.error('Get interview statistics error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
