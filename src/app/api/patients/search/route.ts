// FILE: src/app/api/patients/search/route.ts
// Search patients by name or ID

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import patientsJson from '@/data/finance/patients.json';

function formatPatient(patient: any) {
  return {
    id: patient.id || patient.patient_id,
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
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const allPatients: any[] = (patientsJson as any).patients || [];
  const jsonFallback = allPatients
    .filter((p: any) => {
      const search = q.toLowerCase();
      return (
        (p.first_name || '').toLowerCase().includes(search) ||
        (p.last_name || '').toLowerCase().includes(search) ||
        (p.first_name_ar || '').includes(q) ||
        (p.last_name_ar || '').includes(q) ||
        (p.patient_id || '').toLowerCase().includes(search) ||
        (p.patient_number || '').toLowerCase().includes(search)
      );
    })
    .slice(0, limit)
    .map(formatPatient);

  if (!supabaseAdmin) {
    return NextResponse.json(jsonFallback);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .or(
        `first_name.ilike.%${q}%,` +
        `last_name.ilike.%${q}%,` +
        `first_name_ar.ilike.%${q}%,` +
        `last_name_ar.ilike.%${q}%,` +
        `patient_id.ilike.%${q}%`
      )
      .limit(limit);

    if (error || !data) {
      console.warn('Supabase patient search error, falling back to JSON:', error?.message);
      return NextResponse.json(jsonFallback);
    }

    return NextResponse.json(data.length > 0 ? data.map(formatPatient) : jsonFallback);

  } catch (err: any) {
    console.warn('Patient search exception, falling back to JSON:', err?.message);
    return NextResponse.json(jsonFallback);
  }
}
