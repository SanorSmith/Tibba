// FILE: src/app/api/services/route.ts
// GET all services from service_catalog table

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const fallbackServices = [
  { id: 'svc-001', code: 'CONS-001', name: 'General Consultation', name_ar: 'استشارة عامة', category: 'CONSULTATION', price_self_pay: 25000, price_insurance: 20000, price_government: 15000, active: true },
  { id: 'svc-002', code: 'CONS-002', name: 'Specialist Consultation', name_ar: 'استشارة متخصصة', category: 'CONSULTATION', price_self_pay: 50000, price_insurance: 40000, price_government: 30000, active: true },
  { id: 'svc-003', code: 'LAB-001', name: 'Complete Blood Count', name_ar: 'تعداد الدم الكامل', category: 'LAB', price_self_pay: 15000, price_insurance: 12000, price_government: 10000, active: true },
  { id: 'svc-004', code: 'LAB-002', name: 'Blood Chemistry Panel', name_ar: 'لوحة الكيمياء الدموية', category: 'LAB', price_self_pay: 35000, price_insurance: 28000, price_government: 20000, active: true },
  { id: 'svc-005', code: 'IMG-001', name: 'Chest X-Ray', name_ar: 'أشعة الصدر', category: 'IMAGING', price_self_pay: 30000, price_insurance: 25000, price_government: 20000, active: true },
  { id: 'svc-006', code: 'IMG-002', name: 'Abdominal Ultrasound', name_ar: 'الموجات فوق الصوتية للبطن', category: 'IMAGING', price_self_pay: 45000, price_insurance: 36000, price_government: 25000, active: true },
  { id: 'svc-007', code: 'IMG-003', name: 'CT Scan', name_ar: 'التصوير المقطعي', category: 'IMAGING', price_self_pay: 150000, price_insurance: 120000, price_government: 90000, active: true },
  { id: 'svc-008', code: 'PROC-001', name: 'Minor Surgery', name_ar: 'جراحة بسيطة', category: 'PROCEDURE', price_self_pay: 200000, price_insurance: 160000, price_government: 120000, active: true },
  { id: 'svc-009', code: 'PROC-002', name: 'IV Infusion', name_ar: 'التسريب الوريدي', category: 'PROCEDURE', price_self_pay: 20000, price_insurance: 16000, price_government: 12000, active: true },
  { id: 'svc-010', code: 'DIAG-001', name: 'ECG', name_ar: 'تخطيط القلب', category: 'DIAGNOSTIC', price_self_pay: 25000, price_insurance: 20000, price_government: 15000, active: true },
  { id: 'svc-011', code: 'DIAG-002', name: 'Echocardiogram', name_ar: 'صدى القلب', category: 'DIAGNOSTIC', price_self_pay: 80000, price_insurance: 64000, price_government: 48000, active: true },
  { id: 'svc-012', code: 'LAB-003', name: 'Urinalysis', name_ar: 'تحليل البول', category: 'LAB', price_self_pay: 10000, price_insurance: 8000, price_government: 6000, active: true },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  if (!supabaseAdmin) {
    let data = fallbackServices;
    if (category) data = data.filter(s => s.category === category);
    if (search) data = data.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.name_ar.includes(search));
    return NextResponse.json(data);
  }

  try {
    let query = supabaseAdmin
      .from('service_catalog')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('name');

    if (category) query = query.eq('category', category);
    if (search) query = query.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,code.ilike.%${search}%`);

    const { data, error } = await query;

    if (error || !data) {
      console.warn('Supabase services error, falling back:', error?.message);
      return NextResponse.json(fallbackServices);
    }

    return NextResponse.json(data.length > 0 ? data : fallbackServices);

  } catch (err: any) {
    console.warn('GET services exception, falling back:', err?.message);
    return NextResponse.json(fallbackServices);
  }
}
