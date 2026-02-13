import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('👤 Fetching employee:', id);

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments!employees_department_id_fkey(id, name, code)
      `)
      .eq('id', id)
      .eq('organization_id', DEFAULT_ORG_ID)
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('✅ Employee loaded:', data.employee_number);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('💥 Error fetching employee:', error);
    return NextResponse.json(
      { success: false, error: 'Employee not found' },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    console.log('✏️ Updating employee:', id);

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        job_title: body.job_title,
        department_id: body.department_id || null,
        employment_type: body.employment_type,
        employment_status: body.employment_status,
        hire_date: body.hire_date,
        salary_grade: body.salary_grade || null,
        base_salary: body.base_salary || null,
        date_of_birth: body.date_of_birth || null,
        gender: body.gender || null,
        marital_status: body.marital_status || null,
        nationality: body.nationality || 'Iraqi',
        national_id: body.national_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', DEFAULT_ORG_ID)
      .select(`
        *,
        department:departments!employees_department_id_fkey(id, name, code)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('✅ Employee updated:', data.employee_number);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('💥 Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('🗑️ Soft-deleting employee:', id);

    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', DEFAULT_ORG_ID);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('✅ Employee deleted:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 Error deleting employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
