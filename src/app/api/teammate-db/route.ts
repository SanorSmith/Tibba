import { NextRequest, NextResponse } from 'next/server';
import { teammateDb } from '@/lib/supabase/teammate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') || 'patients';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!teammateDb) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    console.log(`Querying table: ${table}, limit: ${limit}`);

    const result = await teammateDb.execute(`SELECT * FROM ${table} LIMIT ${limit}`);
    
    return NextResponse.json({
      success: true,
      data: result,
      count: Array.isArray(result) ? result.length : 0
    });

  } catch (error: any) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { 
        error: 'Database query failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!teammateDb) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    console.log('Executing custom query:', query);

    const result = await teammateDb.execute(query);
    
    return NextResponse.json({
      success: true,
      data: result,
      count: Array.isArray(result) ? result.length : 0
    });

  } catch (error: any) {
    console.error('Custom query error:', error);
    return NextResponse.json(
      { 
        error: 'Custom query failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
