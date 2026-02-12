'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    employeeId?: string;
    organizationId: string;
  };
  error?: string;
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const demoUsers = [
      { email: 'admin@tibbna.com', password: 'demo123', role: 'Administrator' },
      { email: 'doctor@tibbna.com', password: 'doctor123', role: 'Doctor' },
      { email: 'nurse@tibbna.com', password: 'nurse123', role: 'Nurse' },
      { email: 'billing@tibbna.com', password: 'billing123', role: 'Billing' },
    ];

    const demoUser = demoUsers.find(u => u.email === email && u.password === password);

    if (demoUser) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('id, organization_id, first_name, last_name, email, job_title')
        .eq('email', email)
        .single();

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

      return { success: true, user };
    }

    return { success: false, error: 'Invalid credentials' };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export async function signOut() {
  cookies().delete('tibbna-session');
}

export async function getSession() {
  const sessionCookie = cookies().get('tibbna-session');
  
  if (!sessionCookie) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}
