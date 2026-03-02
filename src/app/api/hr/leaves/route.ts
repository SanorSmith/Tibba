/**
 * Leave Management API - List and Create
 * GET /api/hr/leaves - List leave requests with filters
 * POST /api/hr/leaves - Submit leave request with balance validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, paginationInfo } from '@/lib/api-response';
import { createLeaveRequestSchema, leaveFilterSchema } from '@/lib/validations/hr-schemas';
import { requireAuth, logAudit } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/hr/leaves
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const filters = leaveFilterSchema.parse({
      employee_id: searchParams.get('employee_id') || undefined,
      status: searchParams.get('status') as any || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      leave_type_id: searchParams.get('leave_type_id') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employees(id, employee_number, first_name, last_name, departments(name))
      `, { count: 'exact' });

    // Apply filters
    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.start_date) {
      query = query.gte('start_date', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('end_date', filters.end_date);
    }

    if (filters.leave_type_id) {
      query = query.eq('leave_type_id', filters.leave_type_id);
    }

    // Apply pagination
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);

    // Order by created date descending
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching leave requests:', error);
      return NextResponse.json(errorResponse('Failed to fetch leave requests'), { status: 500 });
    }

    return NextResponse.json(
      successResponse(data, paginationInfo(filters.page, filters.limit, count || 0))
    );
  } catch (error: any) {
    console.error('GET /api/hr/leaves error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}

// POST /api/hr/leaves - Submit leave request
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    // Validate input
    const validatedData = createLeaveRequestSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, organization_id')
      .eq('id', validatedData.employee_id)
      .single();

    if (empError || !employee) {
      return NextResponse.json(errorResponse('Employee not found'), { status: 404 });
    }

    // Validate dates
    const startDate = new Date(validatedData.start_date);
    const endDate = new Date(validatedData.end_date);

    if (endDate < startDate) {
      return NextResponse.json(
        errorResponse('End date must be after start date'),
        { status: 400 }
      );
    }

    // Check for overlapping leave requests
    const { data: overlapping } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('employee_id', validatedData.employee_id)
      .in('status', ['PENDING', 'APPROVED'])
      .or(`start_date.lte.${validatedData.end_date},end_date.gte.${validatedData.start_date}`)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        errorResponse('Leave request overlaps with existing leave'),
        { status: 400 }
      );
    }

    // TODO: Check leave balance if leave_type_id is provided
    // This would require a leave_balances table

    // Generate request number
    const requestNumber = `LR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create leave request
    const leaveData = {
      ...validatedData,
      organization_id: employee.organization_id,
      request_number: requestNumber,
      status: 'PENDING',
      metadata: {
        requested_by: user.id,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert(leaveData)
      .select(`
        *,
        employees(id, employee_number, first_name, last_name, departments(name))
      `)
      .single();

    if (error) {
      console.error('Error creating leave request:', error);
      return NextResponse.json(errorResponse('Failed to create leave request'), { status: 500 });
    }

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'leave_request',
      entity_id: leaveRequest.id,
      changes: leaveData,
    });

    return NextResponse.json(
      successResponse({
        ...leaveRequest,
        message: 'Leave request submitted successfully',
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/hr/leaves error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
