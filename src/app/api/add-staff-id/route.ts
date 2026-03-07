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

    console.log('Adding staff_id column to appointments table...');

    // Add staff_id column
    await pool.query(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS staff_id UUID
    `);

    console.log('staff_id column added successfully');

    // Check if column was added
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
        AND column_name = 'staff_id'
    `);

    // Add foreign key constraint to staff table
    try {
      await pool.query(`
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_staff_id_fkey 
        FOREIGN KEY (staff_id) REFERENCES staff(id) 
        ON DELETE SET NULL
      `);
      console.log('Foreign key constraint added successfully');
    } catch (constraintError) {
      console.log('Foreign key constraint failed (staff table may not exist):', constraintError.message);
    }

    // Show final table structure
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
        AND column_name IN ('doctorid', 'staff_id', 'patientid')
      ORDER BY column_name
    `);

    return NextResponse.json({
      success: true,
      message: 'staff_id column added successfully',
      columnAdded: columnCheck.rows.length > 0,
      tableStructure: tableStructure.rows
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
