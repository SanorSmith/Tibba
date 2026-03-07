import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Get current user request');

    // Mock user data - replace with actual session/token verification
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'admin@hospital.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'Admin',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000'
    };

    return NextResponse.json({
      success: true,
      user: mockUser
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
