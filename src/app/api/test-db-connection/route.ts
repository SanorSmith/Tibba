import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test environment variables
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
    };

    // Test database connection
    const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    
    console.log('Testing database connection with URL:', databaseUrl.substring(0, 50) + '...');
    
    const postgres = (await import('postgres')).default;
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Test basic query
    const result = await sql`SELECT NOW() as current_time, 'Database connection successful!' as message`;
    
    await sql.end();

    return NextResponse.json({
      success: true,
      environment: envVars,
      database: {
        connected: true,
        testResult: result[0],
        urlPreview: databaseUrl.substring(0, 50) + '...'
      }
    });

  } catch (error) {
    console.error('Database connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      environment: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_REGION: process.env.VERCEL_REGION,
      },
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      }
    }, { status: 500 });
  }
}
