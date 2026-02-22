import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Get all paid invoice items with provider info
    const { data: paidItems, error: paidError } = await supabaseAdmin
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
          patient_name_ar,
          status
        )
      `)
      .eq('payment_status', 'PAID')
      .order('payment_date', { ascending: false });

    if (paidError) {
      console.error('Error fetching paid items:', paidError);
      return NextResponse.json({ error: paidError.message }, { status: 500 });
    }

    // Get all invoice items (for pending calculations)
    const { data: allItems, error: allError } = await supabaseAdmin
      .from('invoice_items')
      .select(`
        provider_id,
        provider_name,
        service_fee,
        payment_status,
        invoices!inner (
          status
        )
      `)
      .eq('invoices.status', 'PAID'); // Only from paid customer invoices

    if (allError) {
      console.error('Error fetching all items:', allError);
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Process provider summaries
    const providerMap = new Map();

    // Process all items for provider summaries
    (allItems || []).forEach((item: any) => {
      const providerId = item.provider_id || 'UNKNOWN';
      const providerName = item.provider_name || 'Unknown Provider';
      const serviceFee = item.service_fee || 0;
      const isPaid = item.payment_status === 'PAID';

      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          provider_id: providerId,
          provider_name: providerName,
          total_invoices: 0,
          total_amount: 0,
          paid_amount: 0,
          pending_amount: 0,
          last_payment_date: null
        });
      }

      const provider = providerMap.get(providerId);
      provider.total_invoices += 1;
      provider.total_amount += serviceFee;
      
      if (isPaid) {
        provider.paid_amount += serviceFee;
      } else {
        provider.pending_amount += serviceFee;
      }
    });

    // Update last payment date for providers
    (paidItems || []).forEach((item: any) => {
      const providerId = item.provider_id || 'UNKNOWN';
      if (providerMap.has(providerId) && item.payment_date) {
        const provider = providerMap.get(providerId);
        if (!provider.last_payment_date || new Date(item.payment_date) > new Date(provider.last_payment_date)) {
          provider.last_payment_date = item.payment_date;
        }
      }
    });

    const providers = Array.from(providerMap.values());

    // Process payment records
    const payments = (paidItems || []).map((item: any) => ({
      id: item.id,
      invoice_number: item.invoices?.invoice_number || 'Unknown',
      invoice_date: item.invoices?.invoice_date || '',
      patient_name: item.invoices?.patient_name_ar || item.invoices?.patient_name || 'Unknown',
      service_name: item.item_name,
      quantity: item.quantity || 1,
      service_fee: item.service_fee || 0,
      total_fee: (item.service_fee || 0) * (item.quantity || 1),
      payment_batch_id: item.payment_batch_id || 'Unknown',
      payment_date: item.payment_date || '',
      provider_name: item.provider_name || 'Unknown',
      provider_id: item.provider_id || 'UNKNOWN'
    }));

    return NextResponse.json({
      providers,
      payments,
      summary: {
        total_providers: providers.length,
        total_paid_amount: providers.reduce((sum, p) => sum + p.paid_amount, 0),
        total_pending_amount: providers.reduce((sum, p) => sum + p.pending_amount, 0),
        total_invoices: providers.reduce((sum, p) => sum + p.total_invoices, 0)
      }
    });

  } catch (err: any) {
    console.error('Service provider reports exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
