// FILE: src/app/api/patients/route.ts
// GET all patients, POST create new patient

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching patients:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Fetched ${data?.length || 0} patients`);
    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('GET patients error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();

    console.log('📝 Creating patient:', body.first_name_ar, body.last_name_ar);

    // Get organization ID
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    const orgId = orgs?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    // Generate patient_id if not provided
    const patientId = body.patient_id || `P-${Date.now()}`;

    // Prepare patient data
    const patientData: any = {
      organization_id: orgId,
      patient_id: patientId,
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
    };

    const { data, error } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Patient created:', data.id);
    return NextResponse.json(data, { status: 201 });

  } catch (error: any) {
    console.error('POST patient error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create patient' },
      { status: 500 }
    );
  }
}
