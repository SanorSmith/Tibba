import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceNumber = searchParams.get('invoice_number');

    if (!invoiceNumber) {
      return NextResponse.json({ error: 'Invoice number required' }, { status: 400 });
    }

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .single();

    if (invoiceError) {
      return NextResponse.json({ 
        error: 'Invoice not found', 
        details: invoiceError 
      }, { status: 404 });
    }

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
    }

    return NextResponse.json({
      success: true,
      invoice,
      items: items || [],
      itemsCount: items?.length || 0,
      analysis: {
        hasInvoice: !!invoice,
        hasItems: items && items.length > 0,
        itemsCount: items?.length || 0,
        patientId: invoice.patient_id,
        totalAmount: invoice.total_amount,
        status: invoice.status
      }
    });

  } catch (error: any) {
    console.error('Error checking invoice:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
