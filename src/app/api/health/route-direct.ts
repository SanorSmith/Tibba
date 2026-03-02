/**
 * System Health Check Endpoint - Direct PostgreSQL Version
 * Monitors database connection, critical tables, and system status
 */

import { NextResponse } from 'next/server';
import postgres from 'postgres';

const databaseUrl = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL is not configured');
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  responseTime?: number;
  details?: any;
}

export async function GET() {
  const checks: HealthCheck[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

  try {
    // Check 1: Database Connection
    const dbCheckStart = Date.now();
    try {
      const [version] = await sql`SELECT version()`;
      const dbCheckTime = Date.now() - dbCheckStart;

      checks.push({
        name: 'Database Connection',
        status: 'healthy',
        message: 'Database is accessible',
        responseTime: dbCheckTime,
        details: { version: version.version },
      });
    } catch (error: any) {
      checks.push({
        name: 'Database Connection',
        status: 'down',
        message: 'Failed to connect to database',
        details: error.message,
      });
      overallStatus = 'down';
    }

    // Check 2: Critical Tables Have Data
    const criticalTables = [
      { name: 'employees', table: 'employees' },
      { name: 'departments', table: 'departments' },
      { name: 'attendance_records', table: 'attendance_records' },
      { name: 'payroll_transactions', table: 'payroll_transactions' },
    ];
    
    for (const table of criticalTables) {
      try {
        const [result] = await sql.unsafe(`
          SELECT COUNT(*) as count FROM ${table.table}
        `);

        checks.push({
          name: `Table: ${table.name}`,
          status: result.count > 0 ? 'healthy' : 'degraded',
          message: result.count > 0 ? `${result.count} records` : 'No data',
          details: { recordCount: result.count },
        });

        if (result.count === 0 && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error: any) {
        checks.push({
          name: `Table: ${table.name}`,
          status: 'down',
          message: `Failed to query ${table.name}`,
          details: error.message,
        });
        if (overallStatus !== 'down') overallStatus = 'degraded';
      }
    }

    // Check 3: Recent Activity
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const [recentAttendance] = await sql`
        SELECT COUNT(*) as count 
        FROM attendance_records 
        WHERE created_at >= ${oneDayAgo.toISOString()}
      `;

      checks.push({
        name: 'Recent Activity',
        status: recentAttendance.count > 0 ? 'healthy' : 'degraded',
        message: recentAttendance.count > 0 
          ? `${recentAttendance.count} attendance records in last 24h` 
          : 'No recent activity',
        details: { recentRecords: recentAttendance.count },
      });
    } catch (error: any) {
      checks.push({
        name: 'Recent Activity',
        status: 'degraded',
        message: 'Could not check recent activity',
        details: error.message,
      });
    }

    // Check 4: System Resources
    const memoryUsage = process.memoryUsage();
    const memoryHealthy = memoryUsage.heapUsed / memoryUsage.heapTotal < 0.9;

    checks.push({
      name: 'System Resources',
      status: memoryHealthy ? 'healthy' : 'degraded',
      message: memoryHealthy ? 'Memory usage normal' : 'High memory usage',
      details: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        usage: `${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
      },
    });

    if (!memoryHealthy && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }

    // Check 5: Environment Variables
    const requiredEnvVars = [
      'TIBBNA_DATABASE_URL',
      'DATABASE_URL',
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    checks.push({
      name: 'Environment Configuration',
      status: missingEnvVars.length === 0 ? 'healthy' : 'down',
      message: missingEnvVars.length === 0 
        ? 'All required environment variables present' 
        : `Missing: ${missingEnvVars.join(', ')}`,
      details: { missing: missingEnvVars },
    });

    if (missingEnvVars.length > 0) {
      overallStatus = 'down';
    }

    // Response
    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        degraded: checks.filter(c => c.status === 'degraded').length,
        down: checks.filter(c => c.status === 'down').length,
      },
    }, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 503 : 500,
    });

  } catch (error: any) {
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'down',
      timestamp: new Date().toISOString(),
      checks: [{
        name: 'System',
        status: 'down',
        message: 'Health check failed',
        details: error.message,
      }],
      summary: {
        total: 1,
        healthy: 0,
        degraded: 0,
        down: 1,
      },
    }, { status: 500 });
  }
}
