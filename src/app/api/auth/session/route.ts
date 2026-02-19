import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type UserRole = 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'HR_ADMIN' | 'INVENTORY_ADMIN';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  allowedModules: string[];
}

const USERS: Record<string, User> = {
  superadmin: { id: '1', name: 'Super Administrator', email: 'superadmin@tibbna.iq', role: 'SUPER_ADMIN', allowedModules: ['*'] },
  finance:    { id: '2', name: 'Finance Administrator', email: 'finance@tibbna.iq', role: 'FINANCE_ADMIN', allowedModules: ['/finance'] },
  hr:         { id: '3', name: 'HR Administrator', email: 'hr@tibbna.iq', role: 'HR_ADMIN', allowedModules: ['/hr'] },
  inventory:  { id: '4', name: 'Inventory Administrator', email: 'inventory@tibbna.iq', role: 'INVENTORY_ADMIN', allowedModules: ['/inventory'] },
};

export async function GET(request: NextRequest) {
  try {
    const sessionToken = cookies().get('tibbna_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    const { username, timestamp } = sessionData;

    // Check expiry (8 hours)
    if (Date.now() - timestamp > 8 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const user = USERS[username];
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
