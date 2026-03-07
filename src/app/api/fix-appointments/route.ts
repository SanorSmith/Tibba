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
    const { action } = body;

    if (action === 'drop_constraint') {
      // Drop the foreign key constraint temporarily
      await pool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'appointments_staff_id_fkey' 
            AND table_name = 'appointments'
          ) THEN
            ALTER TABLE appointments DROP CONSTRAINT appointments_staff_id_fkey;
            RAISE NOTICE 'Dropped appointments_staff_id_fkey constraint';
          END IF;
        END $$
      `);

      return NextResponse.json({
        success: true,
        message: 'Foreign key constraint dropped successfully'
      });
    }

    if (action === 'test_insert') {
      const { workspaceid, patientid, doctorid, starttime, endtime } = body;

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

      return NextResponse.json({
        success: true,
        message: 'Test insertion successful',
        appointment: testAppointment.rows[0]
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Unknown action',
      availableActions: ['drop_constraint', 'test_insert']
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { 
        error: 'Operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
