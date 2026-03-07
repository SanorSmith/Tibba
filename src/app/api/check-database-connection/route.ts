import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json(
        { 
          success: false,
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

    // Test connection
    const result = await pool.query('SELECT NOW()');
    
    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      timestamp: result.rows[0].now
    });

  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
