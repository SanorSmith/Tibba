import { NextRequest, NextResponse } from 'next/server';

// Mock reception users database (in production, this would be in a database)
const RECEPTION_USERS = [
  {
    id: 'rec001',
    username: 'reception1',
    password: 'reception123', // In production, use hashed passwords
    full_name: 'سارة أحمد',
    role: 'RECEPTIONIST' as const,
    permissions: ['patients:read', 'patients:write', 'invoices:read', 'invoices:write', 'bookings:read', 'bookings:write', 'payments:read', 'payments:write'],
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: undefined as string | undefined
  },
  {
    id: 'rec002',
    username: 'reception_manager',
    password: 'manager123', // In production, use hashed passwords
    full_name: 'محمد علي',
    role: 'RECEPTION_MANAGER' as const,
    permissions: ['patients:read', 'patients:write', 'patients:delete', 'invoices:read', 'invoices:write', 'invoices:delete', 'bookings:read', 'bookings:write', 'bookings:delete', 'payments:read', 'payments:write', 'payments:delete', 'reports:read'],
    is_active: true,
    created_at: new Date().toISOString(),
    last_login: undefined as string | undefined
  }
];

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    console.log('Login attempt:', { username, password: '***' });

    // Find user by username
    const user = RECEPTION_USERS.find(u => u.username === username && u.is_active);
    console.log('User found:', !!user);
    
    if (!user) {
      console.log('User not found or inactive');
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check password (in production, use bcrypt.compare)
    if (user.password !== password) {
      console.log('Password mismatch');
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    console.log('Password correct, creating session');
    // Update last login
    user.last_login = new Date().toISOString();

    // Create session token (in production, use JWT)
    const sessionToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    // Create response
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        permissions: user.permissions
      },
      token: sessionToken
    });

    console.log('Session created successfully');

    // Set session cookie
    response.cookies.set('reception_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8 // 8 hours
    });

    return response;

  } catch (error) {
    console.error('Reception auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clear session
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    response.cookies.set('reception_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });

    return response;

  } catch (error) {
    console.error('Reception logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
