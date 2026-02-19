// FILE: src/app/api/purchase-requests/[id]/route.ts
// GET single purchase request, PUT update, PATCH approval action, DELETE

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const { id } = params;
    const { data, error } = await supabaseAdmin.from('purchase_requests').select('*').eq('id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const supabase = supabaseAdmin;
    const { id } = params;
    const body = await request.json();

    console.log('📝 Updating purchase request:', id);

    const updateData: any = {
      requested_by: body.requested_by,
      department: body.department || null,
      item_name: body.item_name,
      item_name_ar: body.item_name_ar || null,
      item_description: body.item_description || null,
      category: body.category || null,
      quantity: body.quantity || 1,
      unit: body.unit || 'Unit',
      estimated_unit_price: body.estimated_unit_price || 0,
      estimated_total_price: body.estimated_total_price || 0,
      priority: body.priority || 'MEDIUM',
      required_by_date: body.required_by_date || null,
      preferred_supplier: body.preferred_supplier || null,
      justification: body.justification || null,
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('purchase_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating purchase request:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Purchase request updated:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('PUT purchase request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update purchase request' },
      { status: 500 }
    );
  }
}

// PATCH - Approval/Decline/Request Info Action
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const supabase = supabaseAdmin;
    const { id } = params;
    const body = await request.json();

    console.log('🔄 Processing approval action:', id, body);

    const updateData: any = {
      status: body.status,
      reviewed_by: body.reviewed_by,
      reviewed_by_id: body.reviewed_by_id || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Handle different approval actions
    if (body.status === 'APPROVED') {
      updateData.approval_comments = body.comments || 'Approved';
      updateData.decline_reason = null;
    } else if (body.status === 'DECLINED') {
      updateData.decline_reason = body.comments || 'Declined';
      updateData.approval_comments = null;
    } else if (body.status === 'MORE_INFO_NEEDED') {
      updateData.decline_reason = body.comments || 'More information needed';
      updateData.approval_comments = null;
    } else {
      updateData.approval_comments = body.comments || null;
    }

    const { data, error } = await supabase
      .from('purchase_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error processing approval action:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Approval action processed:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('PATCH purchase request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process approval action' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    console.log('🗑️ Deleting purchase request:', id);

    const { data, error } = await supabase
      .from('purchase_requests')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting purchase request:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Purchase request deleted:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('DELETE purchase request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete purchase request' },
      { status: 500 }
    );
  }
}
