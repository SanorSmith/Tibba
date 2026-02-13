import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    console.log('📋 Fetching employees...');

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments(id, name, code)
      `)
      .eq('organization_id', DEFAULT_ORG_ID)
      .eq('active', true)
      .order('employee_number');

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('✅ Loaded employees:', data?.length || 0);

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('💥 Error fetching employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees', data: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('➕ Creating employee:', body.first_name, body.last_name);

    // Generate next employee number
    const { data: lastEmp } = await supabaseAdmin
      .from('employees')
      .select('employee_number')
      .eq('organization_id', DEFAULT_ORG_ID)
      .order('employee_number', { ascending: false })
      .limit(1)
      .single();

    let nextNum = 1;
    if (lastEmp?.employee_number) {
      const match = lastEmp.employee_number.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const employee_number = `EMP-${String(nextNum).padStart(4, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        organization_id: DEFAULT_ORG_ID,
        employee_number,
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        job_title: body.job_title,
        department_id: body.department_id || null,
        employment_type: body.employment_type || 'FULL_TIME',
        employment_status: 'ACTIVE',
        hire_date: body.hire_date || new Date().toISOString().split('T')[0],
        salary_grade: body.salary_grade || null,
        base_salary: body.base_salary || null,
        date_of_birth: body.date_of_birth || null,
        gender: body.gender || null,
        marital_status: body.marital_status || null,
        nationality: body.nationality || 'Iraqi',
        national_id: body.national_id || null,
        active: true,
      })
      .select(`
        *,
        department:departments(id, name, code)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('✅ Employee created:', data.employee_number);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('💥 Error creating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
