import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type UserRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'HR_ADMIN' | 'INVENTORY_ADMIN' | 'RECEPTION_ADMIN' | 'DOCTOR' | 'PHARMACY' | 'LABORATORY';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  allowedModules: string[];
}

const USERS: Record<string, { password: string; user: User }> = {
  superadmin: {
    password: 'super123',
    user: { id: '1', name: 'Super Administrator', email: 'superadmin@tibbna.iq', role: 'SUPER_ADMIN', allowedModules: ['*'] },
  },
  reception: {
    password: 'reception123',
    user: { id: '2', name: 'Reception Administrator', email: 'reception@tibbna.iq', role: 'RECEPTION_ADMIN', allowedModules: ['/reception', '/appointments', '/billing'] },
  },
  finance: {
    password: 'finance123',
    user: { id: '3', name: 'Finance Administrator', email: 'finance@tibbna.iq', role: 'FINANCE_ADMIN', allowedModules: ['/finance', '/billing', '/insurance'] },
  },
  hr: {
    password: 'hr123',
    user: { id: '4', name: 'HR Administrator', email: 'hr@tibbna.iq', role: 'HR_ADMIN', allowedModules: ['/hr'] },
  },
  inventory: {
    password: 'inventory123',
    user: { id: '5', name: 'Inventory Administrator', email: 'inventory@tibbna.iq', role: 'INVENTORY_ADMIN', allowedModules: ['/inventory'] },
  },
  doctor: {
    password: 'doctor123',
    user: { id: '6', name: 'Doctor', email: 'doctor@tibbna.iq', role: 'DOCTOR', allowedModules: ['/dashboard', '/patients', '/appointments', '/pharmacies', '/laboratories'] },
  },
  pharmacy: {
    password: 'pharmacy123',
    user: { id: '7', name: 'Pharmacy Administrator', email: 'pharmacy@tibbna.iq', role: 'PHARMACY', allowedModules: ['/pharmacies', '/inventory'] },
  },
  lab: {
    password: 'lab123',
    user: { id: '8', name: 'Laboratory Administrator', email: 'lab@tibbna.iq', role: 'LABORATORY', allowedModules: ['/laboratories'] },
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const record = USERS[username.toLowerCase().trim()];
    if (!record || record.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionToken = Buffer.from(
      JSON.stringify({ userId: record.user.id, username: username.toLowerCase().trim(), role: record.user.role, timestamp: Date.now() })
    ).toString('base64');

    cookies().set('tibbna_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return NextResponse.json({ success: true, user: record.user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
