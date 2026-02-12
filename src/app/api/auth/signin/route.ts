import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('🔐 Login attempt:', email);

    const demoUsers = [
      { email: 'admin@tibbna.com', password: 'demo123', role: 'Administrator' },
      { email: 'doctor@tibbna.com', password: 'doctor123', role: 'Doctor' },
      { email: 'nurse@tibbna.com', password: 'nurse123', role: 'Nurse' },
      { email: 'billing@tibbna.com', password: 'billing123', role: 'Billing' },
    ];

    const demoUser = demoUsers.find(u => u.email === email && u.password === password);

    if (!demoUser) {
      console.log('❌ Invalid credentials for:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const { data: employee, error: dbError } = await supabaseAdmin
      .from('employees')
      .select('id, organization_id, first_name, last_name, email, job_title')
      .eq('email', email)
      .single();

    if (dbError) {
      console.error('⚠️ Database error:', dbError);
    }

    const user = {
      id: employee?.id || 'demo-user-id',
      email: email,
      role: demoUser.role,
      employeeId: employee?.id,
      organizationId: employee?.organization_id || '00000000-0000-0000-0000-000000000001',
      name: employee ? `${employee.first_name} ${employee.last_name}` : 'Demo User'
    };

    cookies().set('tibbna-session', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax'
    });

    console.log('✅ Login successful:', user.email);

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('💥 Sign in error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
