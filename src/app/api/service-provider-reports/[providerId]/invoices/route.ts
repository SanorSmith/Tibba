import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { providerId: string } }
) {
  console.log(`=== Provider Invoices API Called for providerId: ${params.providerId} ===`);
  
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { providerId } = params;

  try {
    // Get provider info
    console.log(`Fetching provider info for providerId: ${providerId}`);
    const { data: providerInfo, error: providerError } = await supabaseAdmin
      .from('invoice_items')
      .select('provider_id, provider_name')
      .eq('provider_id', providerId)
      .limit(1)
      .single();

    console.log('Provider info result:', { providerInfo, providerError });

    if (providerError && providerError.code !== 'PGRST116') {
      console.error('Error fetching provider info:', providerError);
      return NextResponse.json({ error: providerError.message }, { status: 500 });
    }

    // Get all invoices for this provider
    const { data: invoiceItems, error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .select(`
        id,
        invoice_id,
        item_name,
        item_name_ar,
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
          id,
          invoice_number,
          invoice_date,
          patient_name,
          patient_name_ar,
          status,
          total_amount,
          amount_paid,
          balance_due,
          subtotal,
          discount_amount,
          tax_amount
        )
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    console.log('Invoice items query result:', { 
      itemCount: invoiceItems?.length || 0, 
      itemsError,
      firstItem: invoiceItems?.[0] 
    });

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Group items by invoice
    const invoiceMap = new Map();

    (invoiceItems || []).forEach((item: any) => {
      const invoice = item.invoices;
      if (!invoice) return;

      if (!invoiceMap.has(invoice.id)) {
        invoiceMap.set(invoice.id, {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          patient_name: invoice.patient_name_ar || invoice.patient_name || 'Unknown',
          status: invoice.status,
          total_amount: invoice.total_amount || 0,
          amount_paid: invoice.amount_paid || 0,
          balance_due: invoice.balance_due || 0,
          items: []
        });
      }

      const invoiceData = invoiceMap.get(invoice.id);
      invoiceData.items.push({
        id: item.id,
        item_name: item.item_name,
        item_name_ar: item.item_name_ar,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        subtotal: item.subtotal || 0,
        provider_id: item.provider_id,
        provider_name: item.provider_name,
        service_fee: item.service_fee || 0,
        payment_status: item.payment_status || 'PENDING',
        payment_batch_id: item.payment_batch_id,
        payment_date: item.payment_date
      });
    });

    const invoices = Array.from(invoiceMap.values());
    const provider = providerInfo ? {
      id: providerInfo.provider_id,
      name: providerInfo.provider_name
    } : null;

    return NextResponse.json({
      provider,
      invoices,
      summary: {
        total_invoices: invoices.length,
        total_amount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
        total_service_fees: invoices.reduce((sum: number, inv: any) => 
          sum + inv.items.reduce((itemSum: number, item: any) => itemSum + (item.service_fee || 0), 0), 0
        ),
        total_balance_due: invoices.reduce((sum, inv) => sum + inv.balance_due, 0)
      }
    });

  } catch (error: any) {
    console.error('Error in provider invoices API:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      providerId
    });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
