// FILE: src/app/api/patients/[id]/route.ts
// GET single patient, PUT update, DELETE

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin;
    const { id } = params;

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching patient:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('GET patient error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patient' },
      { status: 500 }
    );
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

    console.log('📝 Updating patient:', id);

    const updateData: any = {
      first_name: body.first_name_en || body.first_name || null,
      last_name: body.last_name_en || body.last_name || null,
      first_name_ar: body.first_name_ar || null,
      last_name_ar: body.last_name_ar || null,
      date_of_birth: body.date_of_birth || null,
      gender: body.gender || 'MALE',
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      city: body.governorate || body.city || null,
      province: body.governorate || body.province || null,
      country: body.country || 'Iraq',
      postal_code: body.postal_code || null,
      insurance_provider_id: body.insurance_provider_id || null,
      insurance_policy_number: body.insurance_policy_number || null,
      insurance_status: body.insurance_status || 'ACTIVE',
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      emergency_contact_relationship: body.emergency_contact_relationship || null,
      blood_type: body.blood_type || null,
      allergies: body.allergies || null,
      chronic_conditions: body.chronic_conditions || null,
      is_active: body.is_active !== false,
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Patient updated:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('PUT patient error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update patient' },
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

    console.log('🗑️ Deleting patient:', id);

    const { data, error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting patient:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Patient deleted:', id);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('DELETE patient error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
