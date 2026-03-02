/**
 * Simple Database Connection Test
 * Tests if we can connect to the database
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const tibbnaUrl = process.env.TIBBNA_DATABASE_URL;
    const databaseUrl = process.env.DATABASE_URL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    return NextResponse.json({
      status: 'environment_check',
      credentials: {
        tibbna_configured: !!tibbnaUrl,
        database_configured: !!databaseUrl,
        supabase_configured: !!supabaseUrl,
        tibbna_url_preview: tibbnaUrl ? tibbnaUrl.substring(0, 50) + '...' : 'not set',
        database_url_preview: databaseUrl ? databaseUrl.substring(0, 50) + '...' : 'not set',
      },
      message: 'Environment variables checked successfully'
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
}
