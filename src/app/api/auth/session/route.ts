import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Get session request');

    // Mock session data - replace with actual session verification
    // For now, return a valid session to allow access
    const user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Super Admin',
      email: 'admin@hospital.com',
      role: 'Administrator'
    };

    return NextResponse.json({
      success: true,
      user: user
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
