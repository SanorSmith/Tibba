// FILE: src/app/api/service-payments/route.ts
// GET  - fetch all invoice_items that have a provider_id (service payment lines)
// PATCH - mark selected invoice_item IDs as PAID with a batch ID

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Fetch invoice_items that have a provider, joined with their parent invoice for patient info
    const { data, error } = await supabaseAdmin
      .from('invoice_items')
      .select(`
        id,
        invoice_id,
        item_code,
        item_name,
        quantity,
        unit_price,
        subtotal,
        provider_id,
        provider_name,
        service_fee,
        payment_status,
        payment_batch_id,
        payment_date,
        created_at,
        invoices (
          invoice_number,
          invoice_date,
          patient_name,
          patient_name_ar
        )
      `)
      .not('provider_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('service-payments GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the joined data into a flat list
    const lines = (data || []).map((row: any) => ({
      id: row.id,
      invoice_id: row.invoice_id,
      invoice_number: row.invoices?.invoice_number || row.invoice_id,
      invoice_date: row.invoices?.invoice_date || '',
      patient_name: row.invoices?.patient_name_ar || row.invoices?.patient_name || 'Unknown',
      item_code: row.item_code,
      service_name: row.item_name,
      quantity: row.quantity || 1,
      unit_price: row.unit_price || 0,
      subtotal: row.subtotal || 0,
      provider_id: row.provider_id,
      provider_name: row.provider_name,
      service_fee: row.service_fee || 0,
      total_fee: (row.service_fee || 0) * (row.quantity || 1),
      payment_status: row.payment_status || 'PENDING',
      payment_batch_id: row.payment_batch_id || null,
      payment_date: row.payment_date || null,
    }));

    return NextResponse.json(lines);
  } catch (err: any) {
    console.error('service-payments GET exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { ids, payment_batch_id } = body as { ids: string[]; payment_batch_id: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (!payment_batch_id) {
      return NextResponse.json({ error: 'payment_batch_id is required' }, { status: 400 });
    }

    const payment_date = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('invoice_items')
      .update({
        payment_status: 'PAID',
        payment_batch_id,
        payment_date,
      })
      .in('id', ids)
      .select('id, payment_status, payment_batch_id, payment_date');

    if (error) {
      console.error('service-payments PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      updated: data?.length || 0,
      payment_batch_id,
      payment_date,
    });
  } catch (err: any) {
    console.error('service-payments PATCH exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
