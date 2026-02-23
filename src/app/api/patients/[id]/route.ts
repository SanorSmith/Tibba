// FILE: src/app/api/patients/[id]/route.ts
// REDIRECTED: Now uses Neon database instead of Supabase
// This route forwards to the main Neon patient API

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Forward to the main Neon patient API
    const { id } = params;
    const forwardUrl = new URL('/api/tibbna-openehr-patients', request.url);
    forwardUrl.searchParams.set('id', id);

    const response = await fetch(forwardUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ GET patient redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient from Neon database' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Forward to the main Neon patient API
    const { id } = params;
    const body = await request.json();
    const forwardUrl = new URL('/api/tibbna-openehr-patients', request.url);
    forwardUrl.searchParams.set('id', id);

    const response = await fetch(forwardUrl.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, patient_id: id }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ PUT patient redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to update patient in Neon database' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Forward to the main Neon patient API
    const { id } = params;
    const forwardUrl = new URL('/api/tibbna-openehr-patients', request.url);
    forwardUrl.searchParams.set('id', id);

    const response = await fetch(forwardUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('❌ DELETE patient redirect error:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient from Neon database' },
      { status: 500 }
    );
  }
}
