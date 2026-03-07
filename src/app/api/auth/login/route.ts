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

    // For now, return a simple mock authentication
    // TODO: Implement proper user authentication with password hashing
    console.log('Login attempt for:', loginIdentifier);

    // Mock user data - replace with actual database query
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: loginIdentifier.includes('@') ? loginIdentifier : `${loginIdentifier}@hospital.com`,
      username: loginIdentifier,
      firstName: 'Admin',
      lastName: 'User',
      role: 'Admin',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000'
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

    // Create session object for cookie
    const session = {
      username: loginIdentifier,
      role: userRole,
      timestamp: Date.now(),
    };

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
