// FILE: src/app/api/insurance-companies/route.ts
// GET all insurance companies, POST create new

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import insuranceJson from '@/data/finance/insurance.json';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    
    // Optional filters
    const activeOnly = searchParams.get('active') === 'true';
    const search = searchParams.get('search');

    let query = supabase
      .from('insurance_companies')
      .select('*')
      .order('company_name', { ascending: true });

    // Filter by active status
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Search by name or code
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,company_code.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn('Supabase insurance_companies error, falling back to JSON:', error?.message);
      const fallback = (insuranceJson as any).insurance_providers || [];
      return NextResponse.json(fallback);
    }

    console.log(`✅ Fetched ${data?.length || 0} insurance companies`);
    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('GET insurance companies error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insurance companies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();

    console.log('📝 Creating insurance company:', body.company_name);

    // Get organization ID
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    const orgId = orgs?.[0]?.id;

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Prepare data
    const insuranceData = {
      organization_id: orgId,
      company_code: body.company_code,
      company_name: body.company_name,
      company_name_ar: body.company_name_ar || null,
      contact_person: body.contact_person || null,
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      city: body.city || null,
      province: body.province || null,
      country: body.country || 'Iraq',
      postal_code: body.postal_code || null,
      default_discount_percentage: body.default_discount_percentage || 0,
      default_copay_percentage: body.default_copay_percentage || 0,
      claim_payment_terms_days: body.claim_payment_terms_days || 30,
      contract_start_date: body.contract_start_date || null,
      contract_end_date: body.contract_end_date || null,
      coverage_limit: body.coverage_limit || null,
      is_active: body.is_active !== false,
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from('insurance_companies')
      .insert(insuranceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating insurance company:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Insurance company created:', data.id);
    return NextResponse.json(data, { status: 201 });

  } catch (error: any) {
    console.error('POST insurance company error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create insurance company' },
      { status: 500 }
    );
  }
}
