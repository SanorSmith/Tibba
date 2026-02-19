// FILE: src/app/api/shareholders/route.ts
// GET all shareholders, POST create shareholder

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import stakeholdersJson from '@/data/finance/stakeholders.json';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let query = supabase
      .from('shareholders')
      .select('*')
      .order('share_percentage', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('shareholder_type', type);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,full_name_ar.ilike.%${search}%,shareholder_id.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn('Supabase shareholders error, falling back to JSON:', error?.message);
      const fallback = (stakeholdersJson as any).stakeholders || [];
      return NextResponse.json(fallback);
    }

    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('GET shareholders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shareholders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();

    console.log('📝 Creating shareholder:', body);

    const shareholderData: any = {
      shareholder_id: body.shareholder_id,
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
    };

    const { data, error } = await supabase
      .from('shareholders')
      .insert(shareholderData)
      .select()
      .single();

    if (error) {
      console.error('Error creating shareholder:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Shareholder created:', data.id);
    return NextResponse.json(data, { status: 201 });

  } catch (error: any) {
    console.error('POST shareholder error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create shareholder' },
      { status: 500 }
    );
  }
}
