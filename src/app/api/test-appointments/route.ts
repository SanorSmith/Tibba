import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the same database as patients API
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export async function GET(request: NextRequest) {
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

    console.log('Testing basic appointments query...');
    
    // Simple test - just check if table exists and get basic info
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
      )
    `);

    console.log('Table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({
        data: [],
        message: 'Appointments table does not exist'
      });
    }

    // Get column info
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'appointments'
      ORDER BY ordinal_position
    `);

    console.log('Columns:', columns.rows.map(row => `${row.column_name} (${row.data_type})`));

    // Try a simple SELECT *
    try {
      const result = await pool.query('SELECT * FROM appointments LIMIT 5');
      console.log('Simple query result:', result.rows);
      
      return NextResponse.json({
        data: result.rows,
        columns: columns.rows,
        message: 'Basic query successful'
      });
    } catch (queryError) {
      console.log('Query failed:', queryError);
      return NextResponse.json({
        data: [],
        columns: columns.rows,
        message: `Query failed: ${queryError.message}`
      });
    }

  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
