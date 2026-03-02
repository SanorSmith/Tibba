// FILE: src/app/api/services/route.ts
// GET all services from service_catalog table - PURE DATABASE CONNECTION

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = supabaseAdmin
      .from('service_catalog')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('name');

    if (category) query = query.eq('category', category);
    if (search) query = query.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,code.ilike.%${search}%`);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase services error:', error?.message);
      return NextResponse.json(
        { error: 'Failed to fetch services', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);

  } catch (err: any) {
    console.error('GET services exception:', err?.message);
    return NextResponse.json(
      { error: 'Failed to fetch services', details: err.message },
      { status: 500 }
    );
  }
}
