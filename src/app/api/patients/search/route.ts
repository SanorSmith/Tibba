// FILE: src/app/api/patients/search/route.ts
// Search patients by name or ID

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search in patients table
    let searchQuery = supabase
      .from('patients')
      .select('*')
      .limit(limit);

    // Search by name (English or Arabic) or patient ID
    searchQuery = searchQuery.or(
      `first_name.ilike.%${query}%,` +
      `last_name.ilike.%${query}%,` +
      `first_name_ar.ilike.%${query}%,` +
      `last_name_ar.ilike.%${query}%,` +
      `patient_id.ilike.%${query}%`
    );

    const { data, error } = await searchQuery;

    if (error) {
      console.error('Error searching patients:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Format results for autocomplete
    const results = (data || []).map((patient: any) => ({
      id: patient.id,
      patient_id: patient.patient_id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      first_name_ar: patient.first_name_ar,
      last_name_ar: patient.last_name_ar,
      full_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
      full_name_ar: `${patient.first_name_ar || ''} ${patient.last_name_ar || ''}`.trim(),
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      city: patient.city,
      insurance_provider_id: patient.insurance_provider_id,
      insurance_policy_number: patient.insurance_policy_number,
    }));

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Patient search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search patients' },
      { status: 500 }
    );
  }
}
