/**
 * GET /api/openehr/health
 * Read-only connectivity check to the EHRbase server.
 * Returns whether OpenEHR is configured, the template count, and EHR count.
 */
import { NextResponse } from 'next/server';
import { isOpenEHRConfigured, listTemplates, queryOpenEHR } from '@/lib/openehr/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isOpenEHRConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: 'EHRBASE_URL not set' }, { status: 503 });
  }
  try {
    const templates = await listTemplates();
    const ehrCount = await queryOpenEHR<{ n: number }>('SELECT COUNT(e/ehr_id/value) AS n FROM EHR e');
    return NextResponse.json({
      ok: true,
      configured: true,
      url: process.env.EHRBASE_URL,
      template_count: templates.length,
      templates: templates.map((t) => t.template_id),
      ehr_count: (ehrCount[0] as any)?.n ?? null,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, configured: true, error: (error as Error).message }, { status: 502 });
  }
}
