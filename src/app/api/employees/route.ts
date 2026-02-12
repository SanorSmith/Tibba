import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments!employees_department_id_fkey(id, name, code)
      `)
      .eq('organization_id', DEFAULT_ORG_ID)
      .eq('active', true)
      .order('employee_number');

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch employees', data: [] });
  }
}
