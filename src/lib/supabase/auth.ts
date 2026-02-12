'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    // For demo: Check against hardcoded users first
    const demoUsers = [
      { email: 'admin@tibbna.com', password: 'demo123', role: 'Administrator' },
      { email: 'doctor@tibbna.com', password: 'doctor123', role: 'Doctor' },
      { email: 'nurse@tibbna.com', password: 'nurse123', role: 'Nurse' },
      { email: 'billing@tibbna.com', password: 'billing123', role: 'Billing' },
    ];

    const demoUser = demoUsers.find(u => u.email === email && u.password === password);

    if (demoUser) {
      // Find employee in database
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('email', email)
        .single();

      const user = {
        id: employee?.id || 'demo-user-id',
        email: email,
        role: demoUser.role,
        employeeId: employee?.id || undefined,
        organizationId: employee?.organization_id || '00000000-0000-0000-0000-000000000001'
      };

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set('tibbna-session', JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 days
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

/**
 * Sign out
 */
export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete('tibbna-session');
}

/**
 * Get current session
 */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('tibbna-session');

  if (!sessionCookie) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}
