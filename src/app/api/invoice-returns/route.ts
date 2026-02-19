// FILE: src/app/api/invoice-returns/route.ts
// GET all returns, POST create new return

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import invoicesJson from '@/data/finance/invoices.json';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const invoiceId = searchParams.get('invoice_id');

    let query = supabase
      .from('invoice_returns')
      .select('*')
      .order('return_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn('Supabase invoice_returns error, falling back to JSON:', error?.message);
      const fallback = (invoicesJson as any).invoice_returns || [];
      return NextResponse.json(fallback);
    }

    console.log(`✅ Fetched ${data?.length || 0} returns`);
    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('GET returns error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();

    console.log('📝 Creating return for invoice:', body.invoice_number);

    // Get organization ID
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    const orgId = orgs?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    // Prepare return data
    const returnData: any = {
      organization_id: orgId,
      return_number: body.return_number || null, // Will be auto-generated
      return_date: body.return_date || new Date().toISOString().split('T')[0],
      invoice_id: body.invoice_id || null,
      invoice_number: body.invoice_number || null,
      patient_id: body.patient_id || null,
      patient_name: body.patient_name || null,
      patient_name_ar: body.patient_name_ar || null,
      reason_ar: body.reason_ar || null,
      reason_en: body.reason_en || null,
      return_amount: body.return_amount || 0,
      refund_method: body.refund_method || null,
      refund_date: body.refund_date || null,
      refund_reference: body.refund_reference || null,
      status: body.status || 'PENDING',
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from('invoice_returns')
      .insert(returnData)
      .select()
      .single();

    if (error) {
      console.error('Error creating return:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Return created:', data.id);
    return NextResponse.json(data, { status: 201 });

  } catch (error: any) {
    console.error('POST return error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create return' },
      { status: 500 }
    );
  }
}
