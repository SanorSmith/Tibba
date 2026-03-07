import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check if custom_staff_id column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND column_name = 'custom_staff_id'
    `);

    if (checkColumn.rows.length > 0) {
      await pool.end();
      return NextResponse.json({
        success: true,
        message: 'custom_staff_id column already exists',
        action: 'none'
      });
    }

    // Add custom_staff_id column
    await pool.query(`
      ALTER TABLE staff 
      ADD COLUMN custom_staff_id VARCHAR(20)
    `);

    console.log('✅ Added custom_staff_id column to staff table');

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'custom_staff_id column added successfully',
      action: 'added'
    });

  } catch (error) {
    console.error('Error adding custom_staff_id column:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to add custom_staff_id column',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
