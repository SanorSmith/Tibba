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

    // Drop the problematic doctorid foreign key constraint
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'appointments_doctorid_users_userid_fk' 
          AND table_name = 'appointments'
        ) THEN
          ALTER TABLE appointments DROP CONSTRAINT appointments_doctorid_users_userid_fk;
          RAISE NOTICE 'Dropped appointments_doctorid_users_userid_fk constraint';
        END IF;
      END $$
    `);

    return NextResponse.json({
      success: true,
      message: 'Doctor ID foreign key constraint dropped successfully'
    });

  } catch (error) {
    console.error('Error dropping constraint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to drop constraint',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
