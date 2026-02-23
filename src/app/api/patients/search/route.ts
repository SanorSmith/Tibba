// FILE: src/app/api/patients/search/route.ts
// REDIRECTED: Now uses Neon database instead of Supabase
// This route forwards to the main Neon patient API

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Forward to the main Neon patient API with search parameter
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = searchParams.get('limit') || '10';
    
    if (!q || q.length < 1) {
      return NextResponse.json([]);
    }

    const forwardUrl = new URL('/api/tibbna-openehr-patients', request.url);
    forwardUrl.searchParams.set('search', q);
    forwardUrl.searchParams.set('limit', limit);

    const response = await fetch(forwardUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ Search patients redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to search patients in Neon database' },
      { status: 500 }
    );
  }
}
