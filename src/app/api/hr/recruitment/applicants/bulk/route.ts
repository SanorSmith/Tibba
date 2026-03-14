import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, applicantIds } = body;

    if (!action || !Array.isArray(applicantIds) || applicantIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let updateQuery = '';
      let updateValues = [];
      
      switch (action) {
        case 'screening':
          updateQuery = `
            UPDATE job_candidates 
            SET status = 'SCREENING', updated_at = NOW()
            WHERE id = ANY($1)
          `;
          updateValues = [applicantIds];
          break;
          
        case 'interviewing':
          updateQuery = `
            UPDATE job_candidates 
            SET status = 'INTERVIEWING', updated_at = NOW()
            WHERE id = ANY($1)
          `;
          updateValues = [applicantIds];
          break;
          
        case 'offered':
          updateQuery = `
            UPDATE job_candidates 
            SET status = 'OFFERED', updated_at = NOW()
            WHERE id = ANY($1)
          `;
          updateValues = [applicantIds];
          break;
          
        case 'hired':
          updateQuery = `
            UPDATE job_candidates 
            SET status = 'HIRED', updated_at = NOW()
            WHERE id = ANY($1)
          `;
          updateValues = [applicantIds];
          break;
          
        case 'reject':
          updateQuery = `
            UPDATE job_candidates 
            SET status = 'REJECTED', updated_at = NOW()
            WHERE id = ANY($1)
          `;
          updateValues = [applicantIds];
          break;
          
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          );
      }

      const result = await client.query(updateQuery, updateValues);
      
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Successfully ${action} ${result.rowCount} applicants`,
        updatedCount: result.rowCount
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
