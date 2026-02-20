// FILE: src/app/api/invoices/[id]/route.ts
// GET single invoice, PUT update, DELETE soft delete

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import invoicesJson from '@/data/finance/invoices.json';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id || id === 'undefined' || id === 'null') {
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
  }

  const allInvoices: any[] = (invoicesJson as any).invoices || [];
  const jsonFallback = allInvoices.find((inv: any) => inv.id === id || inv.invoice_number === id) || null;

  if (!supabaseAdmin) {
    return jsonFallback
      ? NextResponse.json({ ...jsonFallback, items: jsonFallback.items || [] })
      : NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  try {
    const { data: invoice, error: invError } = await supabaseAdmin
      .from('invoices')
      .select(`*, insurance_companies(company_code,company_name,company_name_ar)`)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (invError || !invoice) {
      if (jsonFallback) return NextResponse.json({ ...jsonFallback, items: jsonFallback.items || [] });
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { data: items } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ ...invoice, items: items || [] });

  } catch (err: any) {
    console.warn('GET invoice exception, falling back to JSON:', err?.message);
    return jsonFallback
      ? NextResponse.json({ ...jsonFallback, items: jsonFallback.items || [] })
      : NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;
    const body = await request.json();

    console.log('📝 Updating invoice:', id);

    // Prepare update data
    const updateData: any = {
      invoice_number: body.invoice_number,
      invoice_date: body.invoice_date,
      patient_id: body.patient_id || null,
      patient_name: body.patient_name || null,
      patient_name_ar: body.patient_name_ar || null,
      subtotal: body.subtotal || 0,
      discount_percentage: body.discount_percentage || 0,
      discount_amount: body.discount_amount || 0,
      tax_percentage: body.tax_percentage || 0,
      tax_amount: body.tax_amount || 0,
      total_amount: body.total_amount || 0,
      insurance_company_id: body.insurance_company_id || null,
      insurance_coverage_amount: body.insurance_coverage_amount || 0,
      insurance_coverage_percentage: body.insurance_coverage_percentage || 0,
      patient_responsibility: body.patient_responsibility || 0,
      amount_paid: body.amount_paid || 0,
      balance_due: body.balance_due || 0,
      status: body.status || 'PENDING',
      payment_method: body.payment_method || null,
      payment_date: body.payment_date || null,
      payment_reference: body.payment_reference || null,
      responsible_entity_type: body.responsible_entity_type || null,
      responsible_entity_id: body.responsible_entity_id || null,
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Update invoice items if provided
    if (body.items && Array.isArray(body.items)) {
      // Delete existing items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      // Insert new items
      if (body.items.length > 0) {
        const items = body.items.map((item: any) => ({
          invoice_id: id,
          item_type: item.item_type,
          item_code: item.item_code || null,
          item_name: item.item_name,
          item_name_ar: item.item_name_ar || null,
          description: item.description || null,
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          discount_amount: item.discount_amount || 0,
          subtotal: item.subtotal,
          insurance_covered: item.insurance_covered || false,
          insurance_coverage_percentage: item.insurance_coverage_percentage || 0,
          insurance_amount: item.insurance_amount || 0,
          patient_amount: item.patient_amount || 0,
          provider_id: item.provider_id || null,
          provider_name: item.provider_name || null,
          service_fee: item.service_fee || 0,
          payment_status: item.payment_status || 'PENDING',
        }));

        await supabase
          .from('invoice_items')
          .insert(items);
      }
    }

    console.log('✅ Invoice updated:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('PUT invoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    console.log('🗑️ Soft deleting invoice:', id);

    // Soft delete - set is_deleted to true
    const { data, error } = await supabase
      .from('invoices')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting invoice:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Invoice deleted:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('DELETE invoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
