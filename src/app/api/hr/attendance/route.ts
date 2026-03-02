/**
 * Attendance API - List and Query
 * GET /api/hr/attendance - Get attendance records with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, paginationInfo } from '@/lib/api-response';
import { attendanceFilterSchema } from '@/lib/validations/hr-schemas';
import { requireAuth } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const filters = attendanceFilterSchema.parse({
      employee_id: searchParams.get('employee_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('attendance_records')
      .select('*, employees(id, employee_number, first_name, last_name, departments(name))', { count: 'exact' });

    // Apply filters
    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }

    if (filters.start_date) {
      query = query.gte('attendance_date', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('attendance_date', filters.end_date);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply pagination
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);

    // Order by date descending
    query = query.order('attendance_date', { ascending: false });
    query = query.order('check_in', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching attendance:', error);
      return NextResponse.json(errorResponse('Failed to fetch attendance records'), { status: 500 });
    }

    return NextResponse.json(
      successResponse(data, paginationInfo(filters.page, filters.limit, count || 0))
    );
  } catch (error: any) {
    console.error('GET /api/hr/attendance error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
