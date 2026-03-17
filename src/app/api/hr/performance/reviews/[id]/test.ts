import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  console.log('🧪 Test route called with ID:', id);
  
  return NextResponse.json({
    success: true,
    message: 'Test route working',
    id: id,
    timestamp: new Date().toISOString()
  });
}
