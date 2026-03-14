import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30days';

    const client = await pool.connect();
    
    try {
      // Get basic metrics
      const [totalApplicants, hireRate, avgTimeToHire, costPerHire] = await Promise.all([
        client.query('SELECT COUNT(*) as count FROM job_candidates'),
        client.query(`
          SELECT ROUND(
            (COUNT(*) FILTER (WHERE status = 'HIRED')::float / COUNT(*)::float) * 100, 2
          ) as rate
          FROM job_candidates
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `),
        client.query(`
          SELECT ROUND(
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400), 1
          ) as avg_days
          FROM job_candidates
          WHERE status = 'HIRED' AND created_at >= NOW() - INTERVAL '30 days'
        `),
        client.query(`
          SELECT ROUND(AVG(expected_salary), 0) as avg_salary
          FROM job_candidates
          WHERE status = 'HIRED' AND created_at >= NOW() - INTERVAL '30 days'
        `)
      ]);

      // Get funnel data
      const funnelResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'NEW') as applied,
          COUNT(*) FILTER (WHERE status = 'SCREENING') as screening,
          COUNT(*) FILTER (WHERE status = 'INTERVIEWING') as interviewing,
          COUNT(*) FILTER (WHERE status = 'OFFERED') as offered,
          COUNT(*) FILTER (WHERE status = 'HIRED') as hired
        FROM job_candidates
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      // Get source performance
      const sourceResult = await client.query(`
        SELECT 
          source,
          COUNT(*) as applicants,
          COUNT(*) FILTER (WHERE status = 'HIRED') as hired
        FROM job_candidates
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY source
        ORDER BY applicants DESC
      `);

      // Calculate source rates
      const sourcePerformance = sourceResult.rows.map(row => ({
        ...row,
        rate: row.applicants > 0 ? ((row.hired / row.applicants) * 100).toFixed(1) : '0.0'
      }));

      const analytics = {
        totalApplicants: totalApplicants.rows[0].count,
        hireRate: hireRate.rows[0].rate || 0,
        avgTimeToHire: avgTimeToHire.rows[0].avg_days || 35,
        costPerHire: costPerHire.rows[0].avg_salary ? (parseFloat(costPerHire.rows[0].avg_salary) / 1000000).toFixed(1) : '2.5',
        funnel: funnelResult.rows[0],
        sourcePerformance
      };

      return NextResponse.json({
        success: true,
        data: analytics
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
