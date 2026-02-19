// FILE: src/app/api/insurance-companies/[id]/route.ts
// GET single, PUT update, DELETE deactivate

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DB_ERROR = () => NextResponse.json({ error: 'Database not configured' }, { status: 503 });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return DB_ERROR();
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    const { data, error } = await supabase
      .from('insurance_companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching insurance company:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('GET insurance company error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insurance company' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return DB_ERROR();
  try {
    const supabase = supabaseAdmin;
    const { id } = params;
    const body = await request.json();

    console.log('📝 Updating insurance company:', id);

    // Prepare update data
    const updateData: any = {
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
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('insurance_companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating insurance company:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Insurance company updated:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('PUT insurance company error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update insurance company' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return DB_ERROR();
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    console.log('🗑️ Deactivating insurance company:', id);

    // Soft delete - set is_active to false
    const { data, error } = await supabase
      .from('insurance_companies')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating insurance company:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Insurance company deactivated:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('DELETE insurance company error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate insurance company' },
      { status: 500 }
    );
  }
}
