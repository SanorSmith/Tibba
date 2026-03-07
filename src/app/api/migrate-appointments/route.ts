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

    console.log('Migration action:', action);

    if (action === 'check_constraints') {
      // Check existing constraints
      const constraints = await pool.query(`
        SELECT 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'appointments'
      `);

      return NextResponse.json({
        success: true,
        constraints: constraints.rows
      });
    }

    if (action === 'drop_constraint') {
      // Drop the doctorid foreign key constraint
      await pool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'appointments_doctorid_fkey' 
            AND table_name = 'appointments'
          ) THEN
            ALTER TABLE appointments DROP CONSTRAINT appointments_doctorid_fkey;
            RAISE NOTICE 'Dropped appointments_doctorid_fkey constraint';
          END IF;
        END $$
      `);

      return NextResponse.json({
        success: true,
        message: 'Foreign key constraint dropped successfully'
      });
    }

    if (action === 'check_staff') {
      // Check staff table structure
      const staffColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'staff' 
        ORDER BY ordinal_position
      `);

      const staffSample = await pool.query(`
        SELECT id, firstname, lastname, role 
        FROM staff 
        LIMIT 5
      `);

      return NextResponse.json({
        success: true,
        staffColumns: staffColumns.rows,
        staffSample: staffSample.rows
      });
    }

    if (action === 'add_staff_constraint') {
      // Add foreign key to staff table
      await pool.query(`
        DO $$
        BEGIN
          -- Check if staff table exists and has id column
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'staff' 
            AND column_name = 'id'
          ) THEN
            ALTER TABLE appointments 
            ADD CONSTRAINT appointments_doctorid_staff_fkey 
            FOREIGN KEY (doctorid) REFERENCES staff(id) 
            ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint to staff table';
          ELSE
            RAISE NOTICE 'Staff table or id column not found - skipping foreign key constraint';
          END IF;
        END $$
      `);

      return NextResponse.json({
        success: true,
        message: 'Foreign key constraint to staff table added successfully'
      });
    }

    if (action === 'test_appointment') {
      // Test creating an appointment with a real staff ID
      const staffSample = await pool.query(`
        SELECT id FROM staff LIMIT 1
      `);

      if (staffSample.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No staff found to test with'
        });
      }

      const staffId = staffSample.rows[0].id;
      const patientId = 'b910c35c-5ae9-46a7-9a56-6dbc3e20fd74'; // Known patient ID
      const workspaceId = 'fa9fb036-a7eb-49af-890c-54406dad139d';

      try {
        const testAppointment = await pool.query(`
          INSERT INTO appointments (
            appointmentid,
            workspaceid,
            patientid,
            doctorid,
            starttime,
            endtime,
            appointmentname,
            appointmenttype,
            status,
            createdat,
            updatedat
          ) VALUES (
            gen_random_uuid(),
            $1, $2, $3, NOW(), NOW() + INTERVAL '1 hour',
            'test_appointment', 'visiting', 'scheduled', NOW(), NOW()
          )
          RETURNING *
        `, [workspaceId, patientId, staffId]);

        return NextResponse.json({
          success: true,
          message: 'Test appointment created successfully',
          appointment: testAppointment.rows[0]
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Test appointment failed',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'Unknown action',
      availableActions: ['check_constraints', 'drop_constraint', 'check_staff', 'add_staff_constraint', 'test_appointment']
    });

  } catch (error) {
    console.error('Migration Error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
