import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

function getSession() {
  try {
    const sessionCookie = cookies().get('tibbna-session');
    if (!sessionCookie) {
      console.log('❌ No session cookie found');
      return null;
    }
    const session = JSON.parse(sessionCookie.value);
    console.log('✅ Session found:', session.email);
    return session;
  } catch (error) {
    console.error('💥 Error parsing session:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 GET employee detail request');

    const session = getSession();
    if (!session) {
      console.log('❌ Unauthorized - no session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const orgId = session.organizationId || DEFAULT_ORG_ID;
    console.log('👤 Fetching employee ID:', id);
    console.log('🏢 Organization ID:', orgId);

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments(id, name, code),
        organization:organizations(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        { success: false, error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      console.log('❌ Employee not found');
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    console.log('✅ Employee loaded:', data.employee_number);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('💥 Unexpected error in GET employee:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('✏️ PUT employee update request');

    const session = getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const orgId = session.organizationId || DEFAULT_ORG_ID;

    console.log('Updating employee:', id);

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update employee', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Employee updated:', data.employee_number);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('💥 Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🗑️ DELETE employee request');

    const session = getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const orgId = session.organizationId || DEFAULT_ORG_ID;
    console.log('Soft-deleting employee:', id);

    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete employee' },
        { status: 500 }
      );
    }

    console.log('✅ Employee deleted:', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('💥 Error deleting employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
