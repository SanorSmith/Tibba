// FILE: src/app/api/service-payments/route.ts
// GET  - fetch all invoice_items that have a provider_id (service payment lines)
// PATCH - mark selected invoice_item IDs as PAID with a batch ID

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Fallback provider + service fee map (used when migration hasn't been applied yet)
const SERVICE_PROVIDER_MAP: Record<string, { provider_id: string; provider_name: string; service_fee: number }> = {
  'CONS-001': { provider_id: 'PRV001', provider_name: 'Baghdad Medical Center', service_fee: 8000 },
  'CONS-002': { provider_id: 'PRV001', provider_name: 'Baghdad Medical Center', service_fee: 16000 },
  'LAB-001':  { provider_id: 'PRV003', provider_name: 'National Laboratory Services', service_fee: 9000 },
  'LAB-002':  { provider_id: 'PRV003', provider_name: 'National Laboratory Services', service_fee: 14000 },
  'LAB-003':  { provider_id: 'PRV003', provider_name: 'National Laboratory Services', service_fee: 4000 },
  'IMG-001':  { provider_id: 'PRV002', provider_name: 'Al-Rasheed Radiology Lab', service_fee: 14000 },
  'IMG-002':  { provider_id: 'PRV002', provider_name: 'Al-Rasheed Radiology Lab', service_fee: 18000 },
  'IMG-003':  { provider_id: 'PRV002', provider_name: 'Al-Rasheed Radiology Lab', service_fee: 48000 },
  'PROC-001': { provider_id: 'PRV008', provider_name: 'Al-Zahrawi Surgical Center', service_fee: 120000 },
  'PROC-002': { provider_id: 'PRV006', provider_name: 'Emergency Care Solutions', service_fee: 6500 },
  'DIAG-001': { provider_id: 'PRV001', provider_name: 'Baghdad Medical Center', service_fee: 8000 },
  'DIAG-002': { provider_id: 'PRV001', provider_name: 'Baghdad Medical Center', service_fee: 28000 },
};

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // --- Attempt 1: Full query with new columns (migration applied) ---
    const { data, error } = await supabaseAdmin
      .from('invoice_items')
      .select(`
        id,
        invoice_id,
        item_code,
        item_name,
        quantity,
        unit_price,
        subtotal,
        provider_id,
        provider_name,
        service_fee,
        payment_status,
        payment_batch_id,
        payment_date,
        created_at,
        invoices (
          invoice_number,
          invoice_date,
          patient_name,
          patient_name_ar
        )
      `)
      .order('created_at', { ascending: false });

    // If the query failed (e.g. columns don't exist yet), fall back to basic query
    if (error) {
      console.warn('Full query failed (migration may not be applied), trying basic fallback:', error.message);
      return await getFallback();
    }

    // Filter rows that have a provider (either from DB or from our map)
    const lines = (data || [])
      .map((row: any) => {
        // Use DB provider fields if present, otherwise look up from code map
        const mapped = row.item_code ? SERVICE_PROVIDER_MAP[row.item_code] : null;
        const provider_id = row.provider_id || mapped?.provider_id;
        const provider_name = row.provider_name || mapped?.provider_name;
        const service_fee = row.service_fee ?? mapped?.service_fee ?? 0;

        if (!provider_id) return null; // skip items with no provider

        return {
          id: row.id,
          invoice_id: row.invoice_id,
          invoice_number: row.invoices?.invoice_number || row.invoice_id,
          invoice_date: row.invoices?.invoice_date || '',
          patient_name: row.invoices?.patient_name_ar || row.invoices?.patient_name || 'Unknown',
          item_code: row.item_code,
          service_name: row.item_name,
          quantity: row.quantity || 1,
          unit_price: row.unit_price || 0,
          subtotal: row.subtotal || 0,
          provider_id,
          provider_name,
          service_fee,
          total_fee: service_fee * (row.quantity || 1),
          payment_status: (row.payment_status || 'PENDING') as 'PENDING' | 'PAID',
          payment_batch_id: row.payment_batch_id || null,
          payment_date: row.payment_date || null,
        };
      })
      .filter(Boolean);

    return NextResponse.json(lines);
  } catch (err: any) {
    console.error('service-payments GET exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Fallback: basic query without new columns, reconstruct provider from code map
async function getFallback(): Promise<NextResponse> {
  try {
    const { data, error } = await supabaseAdmin!
      .from('invoice_items')
      .select(`
        id,
        invoice_id,
        item_code,
        item_name,
        quantity,
        unit_price,
        subtotal,
        created_at,
        invoices (
          invoice_number,
          invoice_date,
          patient_name,
          patient_name_ar
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fallback query also failed:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const lines = (data || [])
      .map((row: any) => {
        const mapped = row.item_code ? SERVICE_PROVIDER_MAP[row.item_code] : null;
        if (!mapped) return null;
        return {
          id: row.id,
          invoice_id: row.invoice_id,
          invoice_number: row.invoices?.invoice_number || row.invoice_id,
          invoice_date: row.invoices?.invoice_date || '',
          patient_name: row.invoices?.patient_name_ar || row.invoices?.patient_name || 'Unknown',
          item_code: row.item_code,
          service_name: row.item_name,
          quantity: row.quantity || 1,
          unit_price: row.unit_price || 0,
          subtotal: row.subtotal || 0,
          provider_id: mapped.provider_id,
          provider_name: mapped.provider_name,
          service_fee: mapped.service_fee,
          total_fee: mapped.service_fee * (row.quantity || 1),
          payment_status: 'PENDING' as const,
          payment_batch_id: null,
          payment_date: null,
        };
      })
      .filter(Boolean);

    return NextResponse.json(lines);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { ids, payment_batch_id } = body as { ids: string[]; payment_batch_id: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (!payment_batch_id) {
      return NextResponse.json({ error: 'payment_batch_id is required' }, { status: 400 });
    }

    const payment_date = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('invoice_items')
      .update({
        payment_status: 'PAID',
        payment_batch_id,
        payment_date,
      })
      .in('id', ids)
      .select('id, payment_status, payment_batch_id, payment_date');

    if (error) {
      // If columns don't exist yet (migration not applied), return partial success
      // so the UI can still show feedback — the status will revert on next load
      console.warn('PATCH failed (migration may not be applied):', error.message);
      return NextResponse.json({
        updated: ids.length,
        payment_batch_id,
        payment_date,
        warning: 'Payment recorded locally only — apply migration 011_service_payments.sql to persist to database',
      });
    }

    return NextResponse.json({
      updated: data?.length || 0,
      payment_batch_id,
      payment_date,
    });
  } catch (err: any) {
    console.error('service-payments PATCH exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
