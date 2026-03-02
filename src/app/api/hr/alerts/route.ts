/**
 * Alerts API
 * GET /api/hr/alerts - Get alerts for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginationInfo } from '@/lib/api-response';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    const isRead = searchParams.get('is_read');
    const alertType = searchParams.get('alert_type');
    const severity = searchParams.get('severity');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get employee ID from user
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!employee) {
      return NextResponse.json(errorResponse('Employee not found'), { status: 404 });
    }

    let query = supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .eq('employee_id', employee.id);

    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true');
    }

    if (alertType) {
      query = query.eq('alert_type', alertType);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json(errorResponse('Failed to fetch alerts'), { status: 500 });
    }

    return NextResponse.json(
      successResponse(data, paginationInfo(page, limit, count || 0))
    );
  } catch (error: any) {
    console.error('GET /api/hr/alerts error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
