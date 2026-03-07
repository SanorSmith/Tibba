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
    // Check if dateofbirth column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND column_name = 'dateofbirth'
    `);

    if (checkColumn.rows.length > 0) {
      await pool.end();
      return NextResponse.json({
        success: true,
        message: 'dateofbirth column already exists',
        action: 'none'
      });
    }

    // Add dateofbirth column
    await pool.query(`
      ALTER TABLE staff 
      ADD COLUMN dateofbirth DATE
    `);

    console.log('✅ Added dateofbirth column to staff table');

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'dateofbirth column added successfully',
      action: 'added'
    });

  } catch (error) {
    console.error('Error adding dateofbirth column:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to add dateofbirth column',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
