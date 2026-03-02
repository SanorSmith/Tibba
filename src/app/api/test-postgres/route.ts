/**
 * Test PostgreSQL Connection Directly
 */

import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL not configured'
      });
    }

    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
    });

    // Test basic connection
    const result = await sql`SELECT 1 as test`;
    
    await sql.end();

    return NextResponse.json({
      success: true,
      message: 'PostgreSQL connection successful',
      test_result: result,
      database_url_configured: true
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      database_url_configured: !!process.env.DATABASE_URL
    }, { status: 500 });
  }
}
