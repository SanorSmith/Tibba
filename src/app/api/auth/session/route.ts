import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Get session request');

    // Mock session data - replace with actual session verification
    // For now, return a valid session to allow access
    const mockSession = {
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@hospital.com',
        username: 'superadmin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'superadmin',
        workspaceId: '550e8400-e29b-41d4-a716-446655440000'
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    };

    return NextResponse.json({
      success: true,
      session: mockSession
    });

  } catch (error) {
    console.error('Error getting session:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
