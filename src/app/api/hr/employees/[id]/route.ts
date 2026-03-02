/**
 * Single Employee API
 * GET /api/hr/employees/:id - Get single employee
 * PUT /api/hr/employees/:id - Update employee
 * DELETE /api/hr/employees/:id - Soft delete employee
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '@/lib/api-response';
import { updateEmployeeSchema } from '@/lib/validations/hr-schemas';
import { requireAuth, requireRoles, canAccessEmployee, logAudit } from '@/lib/auth/middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/hr/employees/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { id } = params;

    // Check access permissions
    if (!canAccessEmployee(user, id)) {
      return NextResponse.json(
        errorResponse('Forbidden - You cannot access this employee data'),
        { status: 403 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        departments(id, name, code, type),
        organization:organizations(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(errorResponse('Employee not found'), { status: 404 });
    }

    return NextResponse.json(successResponse(data));
  } catch (error: any) {
    console.error('GET /api/hr/employees/:id error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}

// PUT /api/hr/employees/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { id } = params;
    const body = await request.json();

    // Validate input
    const validatedData = updateEmployeeSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if employee exists
    const { data: existing } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(errorResponse('Employee not found'), { status: 404 });
    }

    // If employee number is being changed, check for duplicates
    if (validatedData.employee_number && validatedData.employee_number !== existing.employee_number) {
      const { data: duplicate } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', validatedData.employee_number)
        .neq('id', id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          errorResponse('Employee number already exists'),
          { status: 400 }
        );
      }
    }

    // Update employee
    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select('*, departments(id, name, code)')
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return NextResponse.json(errorResponse('Failed to update employee'), { status: 500 });
    }

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'employee',
      entity_id: id,
      changes: {
        before: existing,
        after: updated,
      },
    });

    return NextResponse.json(successResponse(updated));
  } catch (error: any) {
    console.error('PUT /api/hr/employees/:id error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}

// DELETE /api/hr/employees/:id - Soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const { id } = params;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if employee exists
    const { data: existing } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json(errorResponse('Employee not found'), { status: 404 });
    }

    // Soft delete by setting status to TERMINATED
    const { data: deleted, error } = await supabase
      .from('employees')
      .update({
        employment_status: 'TERMINATED',
        termination_date: new Date().toISOString().split('T')[0],
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting employee:', error);
      return NextResponse.json(errorResponse('Failed to delete employee'), { status: 500 });
    }

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'DELETE',
      entity_type: 'employee',
      entity_id: id,
      changes: {
        before: existing,
        after: deleted,
      },
    });

    return NextResponse.json(successResponse({ message: 'Employee terminated successfully', data: deleted }));
  } catch (error: any) {
    console.error('DELETE /api/hr/employees/:id error:', error);
    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
