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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { workspaceid, patientid, doctorid, starttime, endtime } = body;

    console.log('Testing direct appointment insertion...');

    // Test insertion without foreign key constraints
    const testAppointment = await pool.query(`
      INSERT INTO appointments (
        appointmentid,
        workspaceid,
        patientid,
        doctorid,
        staff_id,
        starttime,
        endtime,
        status,
        createdat,
        updatedat
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, 'scheduled', NOW(), NOW()
      )
      RETURNING *
    `, [
      workspaceid,
      patientid,
      doctorid,
      doctorid, // Use doctorid as staff_id
      starttime,
      endtime
    ]);

    console.log('Direct insertion successful:', testAppointment.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Direct database insertion successful',
      appointment: testAppointment.rows[0]
    });

  } catch (error) {
    console.error('Direct insertion error:', error);
    return NextResponse.json(
      { 
        error: 'Direct insertion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
