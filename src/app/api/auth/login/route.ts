import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const databaseUrl = process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

export async function POST(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password, username } = body;

    // Accept either email or username
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['email or username', 'password']
        },
        { status: 400 }
      );
    }

    console.log('Login attempt for:', loginIdentifier);

    // Look up real user in DB
    const lookupEmail = loginIdentifier.includes('@')
      ? loginIdentifier
      : `${loginIdentifier}@hospital.com`;

    let dbUser: any = null;
    try {
      const r = await pool.query(
        'SELECT userid, name, email FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($2) LIMIT 1',
        [lookupEmail, loginIdentifier]
      );
      if (r.rows.length > 0) dbUser = r.rows[0];
    } catch (e) {
      console.warn('User DB lookup failed, falling back to mock:', e);
    }

    // Default workspace = Hospital 1
    const DEFAULT_WORKSPACE_ID = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';

    const resolvedUser = {
      id: dbUser?.userid ?? '123e4567-e89b-12d3-a456-426614174000',
      email: dbUser?.email ?? lookupEmail,
      username: loginIdentifier,
      name: dbUser?.name ?? 'Admin User',
      firstName: dbUser?.name?.split(' ')[0] ?? 'Admin',
      lastName: dbUser?.name?.split(' ').slice(1).join(' ') ?? 'User',
      role: 'Admin',
      workspaceId: DEFAULT_WORKSPACE_ID,
    };

    // Map username to role for middleware
    const roleMap: Record<string, string> = {
      'superadmin': 'SUPER_ADMIN',
      'finance': 'FINANCE_ADMIN',
      'hr': 'HR_ADMIN',
      'inventory': 'INVENTORY_ADMIN',
      'reception': 'RECEPTION_ADMIN',
    };

    const userRole = roleMap[loginIdentifier.toLowerCase()] || 'SUPER_ADMIN';

    // Create session object for cookie — now includes userId, workspaceId, email
    const session = {
      username: loginIdentifier,
      role: userRole,
      timestamp: Date.now(),
      userId: resolvedUser.id,
      workspaceId: resolvedUser.workspaceId,
      email: resolvedUser.email,
    };

    const mockUser = resolvedUser;

    // Encode session as base64 cookie
    const sessionCookie = Buffer.from(JSON.stringify(session)).toString('base64');

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: mockUser,
      token: 'mock-jwt-token'
    });

    // Set the session cookie that middleware expects
    response.cookies.set('tibbna_session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Error during login:', error);
    
    return NextResponse.json(
      { 
        error: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
