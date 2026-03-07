import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Hello API called');
    
    return NextResponse.json({
      success: true,
      message: 'Hello from the API!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Hello API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Hello API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
