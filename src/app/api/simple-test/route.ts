import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('SIMPLE TEST START');
    
    // Test environment variable
    const dbUrl = process.env.OPENEHR_DATABASE_URL;
    console.log('DB URL exists:', !!dbUrl);
    
    if (!dbUrl) {
      return NextResponse.json({ error: 'No DB URL' }, { status: 500 });
    }

    // Test dynamic import
    const pg = await import('pg');
    console.log('PG imported:', !!pg.Pool);
    
    // Test pool creation
    const pool = new pg.Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
    console.log('Pool created');

    // Test simple query
    const result = await pool.query('SELECT 1 as test');
    console.log('Query result:', result.rows[0]);

    await pool.end();
    console.log('Pool closed');

    return NextResponse.json({
      success: true,
      message: 'Simple test passed',
      result: result.rows[0]
    });

  } catch (error) {
    console.error('SIMPLE TEST ERROR:', error);
    
    return NextResponse.json(
      { 
        error: 'Simple test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      },
      { status: 500 }
    );
  }
}
