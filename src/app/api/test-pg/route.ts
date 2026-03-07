import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PG TEST START ===');
    
    // Test if we can import pg
    const { Pool } = await import('pg');
    console.log('PG imported successfully');
    
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    console.log('Database URL exists:', !!databaseUrl);
    
    if (!databaseUrl) {
      return NextResponse.json({ error: 'No database URL' }, { status: 500 });
    }

    console.log('Creating pool...');
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    
    console.log('Pool created, testing connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Query result:', result.rows[0]);
    
    await pool.end();
    console.log('Pool closed');
    
    return NextResponse.json({
      success: true,
      message: 'PG connection test successful',
      currentTime: result.rows[0].current_time
    });

  } catch (error) {
    console.error('PG TEST ERROR:', error);
    
    return NextResponse.json(
      { 
        error: 'PG test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      },
      { status: 500 }
    );
  }
}
