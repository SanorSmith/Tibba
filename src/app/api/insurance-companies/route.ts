// FILE: src/app/api/insurance-companies/route.ts
// GET all insurance companies, POST create new - PURE DATABASE CONNECTION

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
    const activeOnly = searchParams.get('active') === 'true';
    const search = searchParams.get('search');

    let query = supabaseAdmin
      .from('insurance_providers')
      .select('*')
      .order('name', { ascending: true });

    if (activeOnly) query = query.eq('active', true);
    if (search) query = query.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,code.ilike.%${search}%`);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase insurance_companies error:', error?.message);
      return NextResponse.json(
        { error: 'Failed to fetch insurance companies', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);

  } catch (err: any) {
    console.error('GET insurance-companies exception:', err?.message);
    return NextResponse.json(
      { error: 'Failed to fetch insurance companies', details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    console.log('📝 Creating insurance provider:', body.name);

    // Prepare data for insurance_providers table
    const insuranceData = {
      code: body.code,
      name: body.name,
      name_ar: body.name_ar || null,
      type: body.type || 'PRIVATE',
      contact: {
        contact_person: body.contact_person || null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null
      },
      address: {
        address_line1: body.address_line1 || null,
        address_line2: body.address_line2 || null,
        city: body.city || null,
        province: body.province || null,
        country: body.country || 'Iraq',
        postal_code: body.postal_code || null
      },
      payment_terms: body.payment_terms || 30,
      credit_limit: body.credit_limit || 0,
      annual_budget: body.annual_budget || 0,
      active: body.active !== false,
      metadata: {
        default_discount_percentage: body.default_discount_percentage || 0,
        default_copay_percentage: body.default_copay_percentage || 0,
        claim_payment_terms_days: body.claim_payment_terms_days || 30,
        contract_start_date: body.contract_start_date || null,
        contract_end_date: body.contract_end_date || null,
        coverage_limit: body.coverage_limit || null,
        notes: body.notes || null
      }
    };

    const { data, error } = await supabaseAdmin
      .from('insurance_providers')
      .insert(insuranceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating insurance provider:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Insurance provider created:', data.id);
    return NextResponse.json(data, { status: 201 });

  } catch (error: any) {
    console.error('POST insurance provider error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create insurance provider' },
      { status: 500 }
    );
  }
}
