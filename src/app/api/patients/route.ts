// FILE: src/app/api/patients/route.ts
// REDIRECTED: Now uses Neon database instead of Supabase
// This route forwards to the main Neon patient API

import { NextRequest, NextResponse } from 'next/server';

// Forward all requests to the main Neon patient API
export async function GET(request: NextRequest) {
  try {
    // Forward to the main Neon patient API
    const { searchParams } = new URL(request.url);
    const forwardUrl = new URL('/api/tibbna-openehr-patients', request.url);
    
    // Copy all search parameters
    searchParams.forEach((value, key) => {
      forwardUrl.searchParams.set(key, value);
    });

    const response = await fetch(forwardUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ GET patients redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients from Neon database' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Forward to the main Neon patient API
    const body = await request.json();
    const forwardUrl = new URL('/api/tibbna-openehr-patients', request.url);

    const response = await fetch(forwardUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ POST patients redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to create patient in Neon database' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Forward to the main Neon patient API
    const body = await request.json();
    const forwardUrl = new URL('/api/tibbna-openehr-patients', request.url);

    const response = await fetch(forwardUrl.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ PUT patients redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to update patient in Neon database' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Forward to the main Neon patient API
    const { searchParams } = new URL(request.url);
    const forwardUrl = new URL('/api/tibbna-openehr-patients', request.url);
    
    // Copy all search parameters
    searchParams.forEach((value, key) => {
      forwardUrl.searchParams.set(key, value);
    });

    const response = await fetch(forwardUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ DELETE patients redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient from Neon database' },
      { status: 500 }
    );
  }
}
