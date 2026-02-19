// FILE: src/app/api/purchase-requests/route.ts
// GET all purchase requests, POST create purchase request

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    let query = supabase
      .from('purchase_requests')
      .select('*')
      .order('request_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (department) {
      query = query.eq('department', department);
    }

    if (search) {
      query = query.or(`request_number.ilike.%${search}%,item_name.ilike.%${search}%,requested_by.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching purchase requests:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('GET purchase requests error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch purchase requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();

    console.log('📝 Creating purchase request:', body);

    const requestData: any = {
      request_date: body.request_date || new Date().toISOString().split('T')[0],
      requested_by: body.requested_by,
      requested_by_id: body.requested_by_id || null,
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
      status: body.status || 'PENDING',
      preferred_supplier: body.preferred_supplier || null,
      supplier_id: body.supplier_id || null,
      justification: body.justification || null,
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from('purchase_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) {
      console.error('Error creating purchase request:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Purchase request created:', data);
    return NextResponse.json(data, { status: 201 });

  } catch (error: any) {
    console.error('POST purchase request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase request' },
      { status: 500 }
    );
  }
}
