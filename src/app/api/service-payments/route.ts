import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ServicePayment, ServiceInvoiceItem, ServiceBalanceSheet } from '@/types/finance';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const status = searchParams.get('status');

    let query = supabase
      .from('service_payments')
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
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching service payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body: Omit<ServicePayment, 'id' | 'created_at' | 'updated_at'> = await request.json();

    // Generate payment number
    const paymentNumber = `SP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;

    const { data, error } = await supabase
      .from('service_payments')
      .insert({
        ...body,
        payment_number: paymentNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating service payment:', error);
    return NextResponse.json(
      { error: 'Failed to create service payment' },
      { status: 500 }
    );
  }
}
