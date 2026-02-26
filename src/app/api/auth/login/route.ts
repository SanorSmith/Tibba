import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type UserRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'HR_ADMIN' | 'INVENTORY_ADMIN' | 'RECEPTION_ADMIN';

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
  finance: {
    password: 'finance123',
    user: { id: '2', name: 'Finance Administrator', email: 'finance@tibbna.iq', role: 'FINANCE_ADMIN', allowedModules: ['/finance'] },
  },
  hr: {
    password: 'hr123',
    user: { id: '3', name: 'HR Administrator', email: 'hr@tibbna.iq', role: 'HR_ADMIN', allowedModules: ['/hr'] },
  },
  inventory: {
    password: 'inventory123',
    user: { id: '4', name: 'Inventory Administrator', email: 'inventory@tibbna.iq', role: 'INVENTORY_ADMIN', allowedModules: ['/inventory'] },
  },
  reception: {
    password: 'reception123',
    user: { id: '5', name: 'Reception Administrator', email: 'reception@tibbna.iq', role: 'RECEPTION_ADMIN', allowedModules: ['/reception'] },
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
