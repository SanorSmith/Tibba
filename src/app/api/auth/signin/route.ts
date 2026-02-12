import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const demoUsers = [
      { email: 'admin@tibbna.com', password: 'demo123', role: 'Administrator' },
      { email: 'doctor@tibbna.com', password: 'doctor123', role: 'Doctor' },
      { email: 'nurse@tibbna.com', password: 'nurse123', role: 'Nurse' },
      { email: 'billing@tibbna.com', password: 'billing123', role: 'Billing' },
    ];

    const demoUser = demoUsers.find(u => u.email === email && u.password === password);

    if (!demoUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const { data: employee, error: dbError } = await supabaseAdmin
      .from('employees')
      .select('id, organization_id, first_name, last_name, email, job_title')
      .eq('email', email)
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
    }

    const user = {
      id: employee?.id || 'demo-user-id',
      email: email,
      role: demoUser.role,
      employeeId: employee?.id,
      organizationId: employee?.organization_id || '00000000-0000-0000-0000-000000000001'
    };

    cookies().set('tibbna-session', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
