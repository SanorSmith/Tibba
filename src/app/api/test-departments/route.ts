/**
 * Test Departments Database Connection
 * GET /api/test-departments - Test database connection and table existence
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const dbUrl = process.env.OPENEHR_DATABASE_URL;
    
    return NextResponse.json({
      success: true,
      environment_check: {
        database_url_configured: !!dbUrl,
        database_url_length: dbUrl?.length || 0,
        database_url_prefix: dbUrl ? dbUrl.substring(0, 50) + '...' : 'not configured',
        node_env: process.env.NODE_ENV,
        all_env_vars: Object.keys(process.env).filter(key => 
          key.includes('DATABASE') || key.includes('DB') || key.includes('NEON')
        )
      },
      instructions: {
        missing_env: !dbUrl ? "OPENEHR_DATABASE_URL is not configured in .env.local" : null,
        setup_needed: !dbUrl ? [
          "1. Create .env.local file in project root",
          "2. Add: OPENEHR_DATABASE_URL=postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb",
          "3. Restart the development server"
        ] : null
      }
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
