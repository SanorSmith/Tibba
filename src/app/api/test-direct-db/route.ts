/**
 * Test Direct PostgreSQL Connection
 * Simple endpoint to verify direct database connection works
 */

import { NextResponse } from 'next/server';
import postgres from 'postgres';

const databaseUrl = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL;

export async function GET() {
  try {
    if (!databaseUrl) {
      return NextResponse.json({
        error: 'Database URL not configured',
        env_vars: {
          TIBBNA_DATABASE_URL: !!process.env.TIBBNA_DATABASE_URL,
          DATABASE_URL: !!process.env.DATABASE_URL,
        }
      }, { status: 500 });
    }

    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Test basic connection
    const [version] = await sql`SELECT version()`;
    
    // Test table existence
    const [tables] = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    // Test employee table if it exists
    let employeeCount = 0;
    try {
      const [count] = await sql`SELECT COUNT(*) as count FROM employees`;
      employeeCount = parseInt(count.count);
    } catch (err) {
      // Table might not exist
    }

    await sql.end();

    return NextResponse.json({
      status: 'success',
      database: {
        connected: true,
        version: version.version,
        tables: tables.map((t: any) => t.table_name),
        employee_count: employeeCount,
      },
      connection: {
        url_configured: true,
        ssl_enabled: true,
        pooling_enabled: true,
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      database: {
        connected: false,
        url_configured: !!databaseUrl,
      }
    }, { status: 500 });
  }
}
