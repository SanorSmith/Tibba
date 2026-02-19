// FILE: src/app/api/shareholders/[id]/route.ts
// GET single shareholder, PUT update, DELETE

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    const { data, error } = await supabase
      .from('shareholders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching shareholder:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('GET shareholder error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shareholder' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;
    const body = await request.json();

    console.log('📝 Updating shareholder:', id);

    const updateData: any = {
      full_name: body.full_name,
      full_name_ar: body.full_name_ar || null,
      email: body.email || null,
      phone: body.phone || null,
      mobile: body.mobile || null,
      address: body.address || null,
      address_ar: body.address_ar || null,
      city: body.city || null,
      country: body.country || 'Iraq',
      national_id: body.national_id || null,
      passport_number: body.passport_number || null,
      date_of_birth: body.date_of_birth || null,
      nationality: body.nationality || null,
      share_percentage: body.share_percentage || 0,
      number_of_shares: body.number_of_shares || 0,
      share_value: body.share_value || 0,
      investment_amount: body.investment_amount || 0,
      investment_date: body.investment_date || null,
      shareholder_type: body.shareholder_type || 'INDIVIDUAL',
      company_name: body.company_name || null,
      company_registration: body.company_registration || null,
      status: body.status || 'ACTIVE',
      is_board_member: body.is_board_member || false,
      board_position: body.board_position || null,
      total_dividends_received: body.total_dividends_received || 0,
      last_dividend_date: body.last_dividend_date || null,
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('shareholders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating shareholder:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Shareholder updated:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('PUT shareholder error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update shareholder' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    console.log('🗑️ Deleting shareholder:', id);

    const { data, error } = await supabase
      .from('shareholders')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting shareholder:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Shareholder deleted:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('DELETE shareholder error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete shareholder' },
      { status: 500 }
    );
  }
}
