/**
 * GET /api/openehr/compositions?ehr_id=...&template=...
 *   or  /api/openehr/compositions?subject=<national-id>&template=...
 * Read-only: lists a patient's clinical compositions from OpenEHR.
 *
 * - Pass ehr_id directly, OR pass subject (national ID / patient subject id) to resolve it.
 * - Optional template filters by document type, e.g.
 *     template=laboratory_report_v1   (lab results)
 *     template=template_clinical_encounter_v1  (encounters)
 *     template=template_radiology_report_v1    (radiology)
 */
import { NextRequest, NextResponse } from 'next/server';
import { isOpenEHRConfigured, getCompositions, getEhrIdBySubject } from '@/lib/openehr/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isOpenEHRConfigured()) {
    return NextResponse.json({ error: 'OpenEHR not configured (EHRBASE_URL missing)' }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    let ehrId = searchParams.get('ehr_id') || '';
    const subject = searchParams.get('subject') || '';
    const template = searchParams.get('template') || undefined;

    if (!ehrId && subject) {
      const resolved = await getEhrIdBySubject(subject);
      if (!resolved) {
        return NextResponse.json({ error: `No EHR found for subject ${subject}` }, { status: 404 });
      }
      ehrId = resolved;
    }
    if (!ehrId) {
      return NextResponse.json({ error: 'Provide ehr_id or subject' }, { status: 400 });
    }

    const compositions = await getCompositions(ehrId, template);
    return NextResponse.json({ success: true, ehr_id: ehrId, count: compositions.length, compositions });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
