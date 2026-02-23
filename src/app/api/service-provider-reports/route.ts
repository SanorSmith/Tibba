import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Get all invoice items with provider info (all statuses)
    const { data: allInvoiceItems, error: allInvoiceError } = await supabaseAdmin
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
      .order('created_at', { ascending: false });

    if (allInvoiceError) {
      console.error('Error fetching invoice items:', allInvoiceError);
      return NextResponse.json({ error: allInvoiceError.message }, { status: 500 });
    }

    console.log(`Fetched ${allInvoiceItems?.length || 0} total invoice items from database`);

    // Debug: Show all PRV001 items to debug the missing invoice
    const prv001Items = allInvoiceItems?.filter((item: any) => item.provider_id === 'PRV001');
    console.log('PRV001 items found:', prv001Items?.length || 0);
    prv001Items?.forEach((item: any) => {
      console.log(`PRV001 Item: ${item.invoices?.invoice_number} | Service Fee: ${item.service_fee} | Status: ${item.invoices?.status}`);
    });

    // Process provider summaries
    const providerMap = new Map();
    const processedInvoices = new Map(); // Track processed invoices to avoid double-counting

    // Process all items for provider summaries - sum service fees per provider
    (allInvoiceItems || []).forEach((item: any) => {
      const providerId = item.provider_id || 'UNKNOWN';
      const providerName = item.provider_name || 'Unknown Provider';
      const serviceFee = item.service_fee || 0;
      const invoiceStatus = item.invoices?.status || 'UNKNOWN';
      const isInvoicePaid = invoiceStatus === 'PAID';
      const invoiceNumber = item.invoices?.invoice_number;

      
      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          provider_id: providerId,
          provider_name: providerName,
          total_invoices: 0,
          total_amount: 0,
          paid_amount: 0,
          pending_amount: 0,
          last_payment_date: null,
          invoice_numbers: []
        });
      }

      const provider = providerMap.get(providerId);
      
      // Add service fee to totals (each service item counted separately)
      provider.total_amount += serviceFee;
      
      // Track unique invoices for invoice count (count ALL invoices, even those with 0 service fees)
      if (invoiceNumber && !provider.invoice_numbers.includes(invoiceNumber)) {
        provider.invoice_numbers.push(invoiceNumber);
        provider.total_invoices += 1;
      }
      
      // Calculate based on invoice status using service fee
      if (isInvoicePaid) {
        provider.paid_amount += serviceFee;
      } else {
        provider.pending_amount += serviceFee;
      }
    });

    // Update last payment date for providers
    (allInvoiceItems || []).forEach((item: any) => {
      const providerId = item.provider_id || 'UNKNOWN';
      const invoiceStatus = item.invoices?.status || 'UNKNOWN';
      if (providerMap.has(providerId) && item.payment_date && invoiceStatus === 'PAID') {
        const provider = providerMap.get(providerId);
        if (!provider.last_payment_date || new Date(item.payment_date) > new Date(provider.last_payment_date)) {
          provider.last_payment_date = item.payment_date;
        }
      }
    });

    const providers = Array.from(providerMap.values());

    
    // Process payment records - include ALL items for display
    const payments = (allInvoiceItems || []).map((item: any) => ({
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
      provider_id: item.provider_id || 'UNKNOWN',
      invoice_status: item.invoices?.status || 'UNKNOWN'
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
