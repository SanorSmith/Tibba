import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { ServiceInvoiceItem } from '@/types/finance';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const isPaid = searchParams.get('isPaid');

    let query = supabase
      .from('service_invoice_items')
      .select(`
        *,
        stakeholders!service_provider_id (
          stakeholder_id,
          name_ar,
          name_en,
          role,
          service_type
        ),
        invoices!invoice_id (
          invoice_number,
          invoice_date,
          total_amount
        )
      `)
      .order('invoice_date', { ascending: false });

    if (providerId) {
      query = query.eq('service_provider_id', providerId);
    }
    if (isPaid !== null) {
      query = query.eq('is_paid', isPaid === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching service invoice items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service invoice items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body: Omit<ServiceInvoiceItem, 'id' | 'created_at'> = await request.json();

    const { data, error } = await supabase
      .from('service_invoice_items')
      .insert({
        ...body,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating service invoice item:', error);
    return NextResponse.json(
      { error: 'Failed to create service invoice item' },
      { status: 500 }
    );
  }
}
