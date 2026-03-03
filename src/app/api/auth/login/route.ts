import { NextRequest, NextResponse } from 'next/server';

const ROLES = [
  {
    username: 'superadmin',
    password: 'super123',
    label: 'Super Admin',
    desc: 'All modules',
    route: '/dashboard',
  },
  {
    username: 'finance',
    password: 'finance123',
    label: 'Finance Admin',
    desc: 'Finance only',
    route: '/finance',
  },
  {
    username: 'hr',
    password: 'hr123',
    label: 'HR Admin',
    desc: 'HR only',
    route: '/hr',
  },
  {
    username: 'reception',
    password: 'reception123',
    label: 'Reception Admin',
    desc: 'Reception only',
    route: '/reception',
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Basic validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check credentials against predefined roles
    const role = ROLES.find(r => r.username === username.toLowerCase() && r.password === password);

    if (role) {
      // Create a simple mock user session
      const user = {
        id: `user-${role.username}`,
        username: role.username,
        name: role.label,
        role: role.username.toUpperCase(), // Match the role names in middleware
        route: role.route
      };

      // Create session data for cookie
      const sessionData = {
        username: role.username,
        role: role.username.toUpperCase(), // SUPER_ADMIN, HR_ADMIN, etc.
        timestamp: Date.now()
      };

      // Create session cookie
      const sessionCookie = Buffer.from(JSON.stringify(sessionData)).toString('base64');

      const response = NextResponse.json({
        success: true,
        user
      });

      // Set the session cookie that middleware expects
      response.cookies.set('tibbna_session', sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: '/'
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
