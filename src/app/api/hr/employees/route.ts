/**
 * Employees API - List and Create
 * GET /api/hr/employees - List employees with pagination and filtering
 * POST /api/hr/employees - Create new employee
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse, paginationInfo } from '@/lib/api-response';
import { createEmployeeSchema, employeeFilterSchema } from '@/lib/validations/hr-schemas';
import { requireAuth, requireRoles, logAudit } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/hr/employees - List employees
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const filters = employeeFilterSchema.parse({
      department_id: searchParams.get('department_id') || undefined,
      employment_status: searchParams.get('employment_status') || undefined,
      employment_type: searchParams.get('employment_type') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('employees')
      .select('*, departments(id, name, code)', { count: 'exact' });

    // Apply filters
    if (filters.department_id) {
      query = query.eq('department_id', filters.department_id);
    }

    if (filters.employment_status) {
      query = query.eq('employment_status', filters.employment_status);
    }

    if (filters.employment_type) {
      query = query.eq('employment_type', filters.employment_type);
    }

    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    // Apply pagination
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);

    // Order by created date
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json(errorResponse('Failed to fetch employees'), { status: 500 });
    }

    return NextResponse.json(
      successResponse(data, paginationInfo(filters.page, filters.limit, count || 0))
    );
  } catch (error: any) {
    console.error('GET /api/hr/employees error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}

// POST /api/hr/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    // Require HR manager or admin role
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    // Validate input
    const validatedData = createEmployeeSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if employee number already exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_number', validatedData.employee_number)
      .single();

    if (existing) {
      return NextResponse.json(
        errorResponse('Employee number already exists'),
        { status: 400 }
      );
    }

    // Get organization ID
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (!org) {
      return NextResponse.json(errorResponse('Organization not found'), { status: 500 });
    }

    // Create employee
    const employeeData = {
      ...validatedData,
      organization_id: org.id,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newEmployee, error } = await supabase
      .from('employees')
      .insert(employeeData)
      .select('*, departments(id, name, code)')
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      return NextResponse.json(errorResponse('Failed to create employee'), { status: 500 });
    }

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'employee',
      entity_id: newEmployee.id,
      changes: employeeData,
    });

    return NextResponse.json(successResponse(newEmployee), { status: 201 });
  } catch (error: any) {
    console.error('POST /api/hr/employees error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
