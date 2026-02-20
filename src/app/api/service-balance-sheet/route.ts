import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ServiceBalanceSheet } from '@/types/finance';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    let query = supabase
      .from('service_balance_sheet')
      .select(`
        *,
        stakeholders!service_provider_id (
          stakeholder_id,
          name_ar,
          name_en,
          role,
          service_type
        )
      `)
      .order('created_at', { ascending: false });

    if (providerId) {
      query = query.eq('service_provider_id', providerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching service balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service balance sheet' },
      { status: 500 }
    );
  }
}
