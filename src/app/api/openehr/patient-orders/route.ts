/**
 * GET /api/openehr/patient-orders?subject=<national-id>   (or ?ehr_id=...)
 *
 * Returns a patient's billable clinical orders pulled from OpenEHR (lab requests,
 * procedures, medications), each with a resolved PRICE:
 *   - price embedded in the OpenEHR composition (procedures), OR
 *   - matched against the hospital `services` catalog by name, OR
 *   - 0 (unmatched — biller can set it manually)
 *
 * Intended to pre-fill the Create Invoice form line items.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { isOpenEHRConfigured, getEhrIdBySubject, getPatientOrders } from '@/lib/openehr/client';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

export async function GET(request: NextRequest) {
  if (!isOpenEHRConfigured()) {
    return NextResponse.json({ error: 'OpenEHR not configured (EHRBASE_URL missing)' }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    let ehrId = searchParams.get('ehr_id') || '';
    const subject = searchParams.get('subject') || '';
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;
    const orderIdSearch = (searchParams.get('order_id') || '').trim().toLowerCase();
    const skipPaid = searchParams.get('skip_paid') !== 'false'; // default true

    if (!ehrId && subject) {
      const resolved = await getEhrIdBySubject(subject);
      if (!resolved) {
        return NextResponse.json({ success: true, ehr_id: null, count: 0, items: [], note: `No OpenEHR record for subject ${subject}` });
      }
      ehrId = resolved;
    }
    if (!ehrId) {
      return NextResponse.json({ error: 'Provide ehr_id or subject (national ID)' }, { status: 400 });
    }

    let orders = await getPatientOrders(ehrId, 40, dateFrom, dateTo);

    if (orderIdSearch) {
      orders = orders.filter(o =>
        (o.order_id || '').toLowerCase().includes(orderIdSearch) ||
        (o.name || '').toLowerCase().includes(orderIdSearch)
      );
    }

    if (skipPaid && pool && orders.length > 0) {
      const sourceUids = orders.map(o => o.source_uid).filter(Boolean);
      const orderIds = orders.map(o => o.order_id).filter(Boolean) as string[];
      if (sourceUids.length || orderIds.length) {
        const paidRows = await pool.query(
          `SELECT DISTINCT ii.openehr_source_uid, ii.openehr_order_id
           FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
           WHERE i.status = 'PAID'
             AND (ii.openehr_source_uid = ANY($1::text[]) OR ii.openehr_order_id = ANY($2::text[]))`,
          [sourceUids, orderIds]
        ).catch(() => ({ rows: [] as any[] }));
        const paidSourceUids = new Set(paidRows.rows.map(r => r.openehr_source_uid).filter(Boolean));
        const paidOrderIds = new Set(paidRows.rows.map(r => r.openehr_order_id).filter(Boolean));
        orders = orders.filter(o =>
          !paidSourceUids.has(o.source_uid) && !(o.order_id && paidOrderIds.has(o.order_id))
        );
      }
    }

    // Build a price lookup from the hospital services catalog (active services).
    const catalog: { id: string; code: string; name: string; price: number }[] = [];
    // Build a price lookup from the LIMS test reference ranges (the real per-test lab price list).
    const labCatalog: { code: string; name: string; price: number }[] = [];
    if (pool) {
      const r = await pool.query(
        `SELECT id, code, name, COALESCE(price_self_pay, 0) AS price
         FROM services WHERE active IS NOT FALSE`
      ).catch(() => ({ rows: [] as any[] }));
      for (const s of r.rows) {
        catalog.push({ id: s.id, code: s.code, name: (s.name || '').toLowerCase(), price: parseFloat(s.price) || 0 });
      }

      const lr = await pool.query(
        `SELECT testcode, testname, price FROM test_reference_ranges
         WHERE price IS NOT NULL AND isactive = 'Y'`
      ).catch(() => ({ rows: [] as any[] }));
      for (const t of lr.rows) {
        labCatalog.push({ code: t.testcode, name: (t.testname || '').toLowerCase(), price: parseFloat(t.price) || 0 });
      }
    }
    const matchPrice = (name: string) => {
      const n = (name || '').toLowerCase().trim();
      if (!n) return null;
      // exact, then contains either direction
      return (
        catalog.find(c => c.name === n) ||
        catalog.find(c => c.name.includes(n) || n.includes(c.name)) ||
        null
      );
    };
    const matchLabPrice = (name: string) => {
      const n = (name || '').toLowerCase().trim();
      if (!n) return null;
      return (
        labCatalog.find(t => t.name === n) ||
        labCatalog.find(t => t.name.includes(n) || n.includes(t.name)) ||
        null
      );
    };

    const items = orders.map(o => {
      const match = matchPrice(o.name);
      const price = o.raw_price ?? match?.price ?? 0;
      // For lab orders, break out each test with its own price: lab test-reference price first, then services catalog
      const tests = (o.tests || []).map(t => {
        const lm = matchLabPrice(t);
        const tm = lm ? null : matchPrice(t);
        return {
          name: t,
          price: lm?.price ?? tm?.price ?? 0,
          price_source: lm ? 'lab_catalog' : tm ? 'catalog' : 'unmatched',
          service_id: tm?.id ?? null,
          service_code: lm?.code ?? tm?.code ?? null,
        };
      });
      return {
        order_id: o.order_id || null,
        order_type: o.order_type,
        name: o.name,
        tests,
        description: o.description,
        requested_date: o.requested_date,
        requesting_provider: o.requesting_provider,
        price,
        price_source: o.raw_price != null ? 'openehr' : match ? 'catalog' : 'unmatched',
        service_id: match?.id ?? null,
        service_code: match?.code ?? null,
        source_uid: o.source_uid,
      };
    });

    return NextResponse.json({ success: true, ehr_id: ehrId, count: items.length, items });
  } catch (error) {
    console.error('[openehr/patient-orders]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
