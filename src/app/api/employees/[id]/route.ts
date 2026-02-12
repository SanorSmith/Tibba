import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = cookies().get('tibbna-session');
    if (!sessionCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);

    const { error } = await supabaseAdmin
      .from('employees')
      .update({ active: false })
      .eq('id', params.id)
      .eq('organization_id', session.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete employee' });
  }
}
