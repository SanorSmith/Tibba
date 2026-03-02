/**
 * System Health Check Endpoint
 * Monitors database connection, critical tables, and system status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check 1: Database Connection
    const dbCheckStart = Date.now();
    try {
      const { error } = await supabase.from('employees').select('count').limit(1).single();
      const dbCheckTime = Date.now() - dbCheckStart;

      if (error && error.code !== 'PGRST116') {
        checks.push({
          name: 'Database Connection',
          status: 'down',
          message: 'Failed to connect to database',
          responseTime: dbCheckTime,
          details: error.message,
        });
        overallStatus = 'down';
      } else {
        checks.push({
          name: 'Database Connection',
          status: 'healthy',
          message: 'Database is accessible',
          responseTime: dbCheckTime,
        });
      }
    } catch (error: any) {
      checks.push({
        name: 'Database Connection',
        status: 'down',
        message: 'Database connection failed',
        details: error.message,
      });
      overallStatus = 'down';
    }

    // Check 2: Critical Tables Have Data
    const criticalTables = ['employees', 'departments', 'attendance_records', 'payroll_transactions'];
    
    for (const table of criticalTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          checks.push({
            name: `Table: ${table}`,
            status: 'down',
            message: `Failed to query ${table}`,
            details: error.message,
          });
          if (overallStatus !== 'down') overallStatus = 'degraded';
        } else {
          checks.push({
            name: `Table: ${table}`,
            status: count && count > 0 ? 'healthy' : 'degraded',
            message: count && count > 0 ? `${count} records` : 'No data',
            details: { recordCount: count },
          });
          if (count === 0 && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        }
      } catch (error: any) {
        checks.push({
          name: `Table: ${table}`,
          status: 'down',
          message: `Error checking ${table}`,
          details: error.message,
        });
        if (overallStatus !== 'down') overallStatus = 'degraded';
      }
    }

    // Check 3: Recent Activity
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { count: recentAttendance } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString());

      checks.push({
        name: 'Recent Activity',
        status: recentAttendance && recentAttendance > 0 ? 'healthy' : 'degraded',
        message: recentAttendance && recentAttendance > 0 
          ? `${recentAttendance} attendance records in last 24h` 
          : 'No recent activity',
        details: { recentRecords: recentAttendance },
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
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
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
