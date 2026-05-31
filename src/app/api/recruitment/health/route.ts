import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await query('SELECT 1', []);

    const counts = await query(`
      SELECT
        (SELECT COUNT(*) FROM job_requisitions) as requisitions,
        (SELECT COUNT(*) FROM job_applications) as applications,
        (SELECT COUNT(*) FROM interviews) as interviews,
        (SELECT COUNT(*) FROM job_offers) as offers,
        (SELECT COUNT(*) FROM assessment_tests) as assessment_tests,
        (SELECT COUNT(*) FROM candidate_assessments) as assessments,
        (SELECT COUNT(*) FROM reference_checks) as reference_checks,
        (SELECT COUNT(*) FROM background_checks) as background_checks,
        (SELECT COUNT(*) FROM recruitment_stages) as stages,
        (SELECT COUNT(*) FROM evaluation_criteria) as criteria
    `, []);

    return NextResponse.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      stats: counts.rows[0]
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
