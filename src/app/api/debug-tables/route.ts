import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Check appointments table structure
    const appointmentsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      ORDER BY ordinal_position
    `);

    // Check patients table structure
    const patientsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      ORDER BY ordinal_position
    `);

    // Check staff table structure
    const staffColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      ORDER BY ordinal_position
    `);

    // Test a simple query
    let testQuery = `
      SELECT 
        a.appointmentid,
        a.patientid,
        a.staff_id
      FROM appointments a
      LIMIT 1
    `;

    const testResult = await pool.query(testQuery);

    return NextResponse.json({
      success: true,
      tables: {
        appointments: appointmentsColumns.rows,
        patients: patientsColumns.rows,
        staff: staffColumns.rows
      },
      testQuery: testResult.rows
    });

  } catch (error) {
    console.error('Debug Error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
