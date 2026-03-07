import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    console.log('Database URL configured:', !!databaseUrl);
    console.log('Database URL length:', databaseUrl?.length || 0);

    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    console.log('Testing database connection...');

    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    
    // Check if departments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'departments'
      ) as departments_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'specialties'
      ) as specialties_exists
    `);

    console.log('Database connection successful');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Table check:', tableCheck.rows[0]);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      currentTime: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0],
      tables: {
        departments: tableCheck.rows[0].departments_exists,
        specialties: tableCheck.rows[0].specialties_exists
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        databaseConfigured: !!process.env.OPENEHR_DATABASE_URL
      },
      { status: 500 }
    );
  }
}
