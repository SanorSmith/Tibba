import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    console.log('=== DEBUG DEPARTMENTS ===');
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

    console.log('Pool created successfully');

    // Test basic connection first
    const timeResult = await pool.query('SELECT NOW() as current_time');
    console.log('Basic connection test passed:', timeResult.rows[0].current_time);

    // Check table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'departments' 
      ORDER BY ordinal_position
    `);
    
    console.log('Table structure:', tableInfo.rows);

    // Try the actual query
    const result = await pool.query(`
      SELECT 
        departmentid as id,
        name,
        description,
        createdat as created_at,
        updatedat as updated_at
      FROM departments
      ORDER BY name ASC
    `);

    console.log('Query executed successfully');
    console.log('Rows returned:', result.rows.length);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Debug completed successfully',
      currentTime: timeResult.rows[0].current_time,
      tableStructure: tableInfo.rows,
      departments: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('DEBUG ERROR:', error);
    
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack available'
      },
      { status: 500 }
    );
  }
}
