import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const sessionCookie = cookies().get('tibbna-session');
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments!employees_department_id_fkey(id, name, code)
      `)
      .eq('organization_id', session.organizationId)
      .eq('active', true)
      .order('employee_number');

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch employees', data: [] });
  }
}
