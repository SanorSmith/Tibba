// FILE: src/app/api/invoice-returns/[id]/route.ts
// GET single return, PUT update, DELETE, PATCH status

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DB_ERROR = NextResponse.json({ error: 'Database not configured' }, { status: 503 });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return DB_ERROR;
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    const { data, error } = await supabase
      .from('invoice_returns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching return:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('GET return error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch return' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return DB_ERROR;
  try {
    const supabase = supabaseAdmin;
    const { id } = params;
    const body = await request.json();

    console.log('📝 Updating return:', id);

    const updateData: any = {
      return_date: body.return_date || null,
      invoice_id: body.invoice_id || null,
      invoice_number: body.invoice_number || null,
      patient_id: body.patient_id || null,
      patient_name_ar: body.patient_name_ar || null,
      reason_ar: body.reason_ar || null,
      reason_en: body.reason_en || null,
      return_amount: body.return_amount || 0,
      refund_method: body.refund_method || null,
      refund_date: body.refund_date || null,
      refund_reference: body.refund_reference || null,
      status: body.status || 'PENDING',
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('invoice_returns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating return:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Return updated:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('PUT return error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update return' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return DB_ERROR;
  try {
    const supabase = supabaseAdmin;
    const { id } = params;
    const body = await request.json();

    console.log('🔄 Updating return status:', id, body.status);

    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString(),
    };

    // If status is REFUNDED, set refund date
    if (body.status === 'REFUNDED' && !body.refund_date) {
      updateData.refund_date = new Date().toISOString().split('T')[0];
    }

    // If status is APPROVED, set approval info
    if (body.status === 'APPROVED') {
      updateData.approved_at = new Date().toISOString();
      if (body.approved_by) {
        updateData.approved_by = body.approved_by;
      }
    }

    const { data, error } = await supabase
      .from('invoice_returns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating return status:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Return status updated:', id, body.status);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('PATCH return error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update return status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return DB_ERROR;
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    console.log('🗑️ Deleting return:', id);

    const { data, error } = await supabase
      .from('invoice_returns')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting return:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Return deleted:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('DELETE return error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete return' },
      { status: 500 }
    );
  }
}
