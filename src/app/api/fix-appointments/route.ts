import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}


export async function POST(request: NextRequest) {
  // Schema/seed utility. These endpoints create tables, seed rows and — in
  // the appointments cases — drop foreign-key constraints on tables shared by
  // every facility, so the blast radius is the whole platform rather than one
  // hospital. A workspace filter is not the right control here; requiring a
  // session is the minimum. These should probably be deleted outright, but
  // that is a call for the repo owner, not something to do silently.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

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
