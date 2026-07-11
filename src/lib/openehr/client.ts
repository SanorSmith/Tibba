/**
 * OpenEHR (EHRbase) client for the Tibbna Hospital app.
 *
 * OpenEHR clinical data is NOT a direct Postgres connection — it lives inside an
 * EHRbase server and is accessed over its REST API using AQL (Archetype Query
 * Language). This client is a thin wrapper around the EHRbase REST endpoints.
 *
 * Required env vars (.env.local + Vercel):
 *   EHRBASE_URL       e.g. https://base.tibbna.com
 *   EHRBASE_USER      BASIC-auth username
 *   EHRBASE_PASSWORD  BASIC-auth password
 *   EHRBASE_API_KEY   (optional) X-API-Key header
 *
 * Uses the global fetch (Node 18+/Next 16) — no extra dependency.
 */

const BASE = process.env.EHRBASE_URL?.replace(/\/$/, '') || '';
const USER = process.env.EHRBASE_USER?.trim() || '';
const PASS = process.env.EHRBASE_PASSWORD?.trim() || '';
const API_KEY = process.env.EHRBASE_API_KEY?.trim() || '';

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (USER || PASS) {
    h.Authorization = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
  }
  if (API_KEY) h['X-API-Key'] = API_KEY;
  return h;
}

export function isOpenEHRConfigured(): boolean {
  return Boolean(BASE);
}

interface AqlResponse {
  columns?: { name?: string; path?: string }[];
  rows?: unknown[][];
}

/**
 * Run an AQL query and return rows mapped to objects keyed by column name.
 * Example:
 *   queryOpenEHR("SELECT e/ehr_id/value AS ehr_id FROM EHR e")
 */
export async function queryOpenEHR<T = Record<string, unknown>>(aql: string): Promise<T[]> {
  if (!BASE) throw new Error('EHRBASE_URL is not configured');
  const res = await fetch(`${BASE}/ehrbase/rest/openehr/v1/query/aql`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ q: aql }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AQL query failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as AqlResponse;
  const columns = data.columns ?? [];
  const rows = data.rows ?? [];
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col.name || col.path || `col${i}`] = row[i];
    });
    return obj as T;
  });
}

/** Health/connectivity check — lists uploaded templates (read-only). */
export async function listTemplates(): Promise<{ template_id: string }[]> {
  if (!BASE) throw new Error('EHRBASE_URL is not configured');
  const res = await fetch(`${BASE}/ehrbase/rest/openehr/v1/definition/template/adl1.4`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listTemplates failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Resolve a patient's EHR id by their subject (national ID / patient id). Read-only. */
export async function getEhrIdBySubject(subjectId: string): Promise<string | null> {
  const rows = await queryOpenEHR<{ ehr_id: string }>(
    `SELECT e/ehr_id/value AS ehr_id FROM EHR e
     WHERE e/ehr_status/subject/external_ref/id/value = '${subjectId.replace(/'/g, "''")}'`
  );
  return rows[0]?.ehr_id ?? null;
}

/** List compositions (clinical documents) for a patient's EHR, optionally filtered by template and date range. */
export async function getCompositions(
  ehrId: string,
  templateId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ composition_uid: string; composition_name: string; start_time: string }[]> {
  const tplFilter = templateId
    ? ` AND c/archetype_details/template_id/value = '${templateId.replace(/'/g, "''")}'`
    : '';
  const dateFilter =
    (dateFrom ? ` AND c/context/start_time/value >= '${dateFrom.replace(/'/g, "''")}'` : '') +
    (dateTo ? ` AND c/context/start_time/value <= '${dateTo.replace(/'/g, "''")}T23:59:59'` : '');
  return queryOpenEHR(
    `SELECT c/uid/value AS composition_uid, c/name/value AS composition_name,
            c/context/start_time/value AS start_time
     FROM EHR e CONTAINS COMPOSITION c
     WHERE e/ehr_id/value = '${ehrId.replace(/'/g, "''")}'${tplFilter}${dateFilter}
     ORDER BY c/context/start_time/value DESC`
  );
}

/** Fetch a full composition (canonical JSON) by its uid. */
export async function getCompositionRaw(ehrId: string, uid: string): Promise<any | null> {
  if (!BASE) throw new Error('EHRBASE_URL is not configured');
  const res = await fetch(
    `${BASE}/ehrbase/rest/openehr/v1/ehr/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(uid)}`,
    { headers: authHeaders(), cache: 'no-store' }
  );
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch a composition in EHRbase's FLAT format (flat "path": value pairs).
 * Vaccination records are stored as an EVALUATION.problem_diagnosis (not an
 * INSTRUCTION), so they're easiest to read back via FLAT rather than walking
 * the canonical structured JSON.
 */
export async function getCompositionFlat(ehrId: string, uid: string): Promise<Record<string, any> | null> {
  if (!BASE) throw new Error('EHRBASE_URL is not configured');
  const res = await fetch(
    `${BASE}/ehrbase/rest/openehr/v1/ehr/${encodeURIComponent(ehrId)}/composition/${encodeURIComponent(uid)}?format=FLAT`,
    { headers: authHeaders(), cache: 'no-store' }
  );
  if (!res.ok) return null;
  return res.json();
}

export type OrderType = 'LAB' | 'MEDICATION' | 'PROCEDURE' | 'VACCINATION' | 'ER' | 'OTHER';
export interface PatientOrder {
  source_uid: string;
  order_id?: string;            // e.g. OrderId-1781811936726 (Request ID)
  order_type: OrderType;
  name: string;                 // group/order name (e.g. "Hematology", "Venlafaxine")
  tests?: string[];             // for LAB: the individual tests in this order
  description?: string;         // detail line (tests, dose, etc.)
  narrative?: string;
  requested_date?: string;
  requesting_provider?: string;
  raw_price?: number;          // price embedded in the composition (procedures), if any
}

// Collect every ELEMENT (name → value) inside an INSTRUCTION into a flat map.
function instructionFields(instruction: any): Record<string, string> {
  const fields: Record<string, string> = {};
  (function walk(n: any) {
    if (!n || typeof n !== 'object') return;
    const v = n.value;
    if (n.name?.value && v && (v.value !== undefined || v.magnitude !== undefined)) {
      fields[n.name.value] = String(v.value ?? v.magnitude);
    }
    for (const k of Object.keys(n)) if (n[k] && typeof n[k] === 'object') walk(n[k]);
  })(instruction);
  return fields;
}

function firstPriceIn(text?: string): number | undefined {
  if (!text) return undefined;
  // "Price: 50000", "Price 50,000 IQD", or "... | Price: 50000 | ..."
  const m = text.match(/price[:\s]*([\d,]+(?:\.\d+)?)/i);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  return undefined;
}

/**
 * Extract the billable clinical orders (lab requests, procedures, medications)
 * from a patient's clinical-encounter compositions in OpenEHR.
 * NOTE: lab orders carry no price in OpenEHR — the caller resolves price from the
 * hospital services catalog. Procedures may carry a price in their narrative.
 */
export async function getPatientOrders(
  ehrId: string,
  limit = 40,
  dateFrom?: string,
  dateTo?: string
): Promise<PatientOrder[]> {
  const comps = await getCompositions(ehrId, 'template_clinical_encounter_v1', dateFrom, dateTo);
  const orders: PatientOrder[] = [];

  for (const c of comps.slice(0, limit)) {
    const comp = await getCompositionRaw(ehrId, c.composition_uid);
    if (!comp) continue;

    const instructions: any[] = [];
    (function find(n: any) {
      if (!n || typeof n !== 'object') return;
      if (n._type === 'INSTRUCTION') instructions.push(n);
      for (const k of Object.keys(n)) if (n[k] && typeof n[k] === 'object') find(n[k]);
    })(comp);

    for (const ins of instructions) {
      const insName = ins.name?.value || '';
      const narrative = ins.narrative?.value;
      const f = instructionFields(ins);
      const lname = insName.toLowerCase();
      const desc = f['Description'];
      // Both lab orders and surgeries use the "Service Request" instruction; the
      // PROCEDURE_REQUEST marker in the Description distinguishes a surgery.
      const isProcedure =
        desc === 'PROCEDURE_REQUEST' || /procedure|operation|surg/i.test(lname);

      if (isProcedure) {
        orders.push({
          source_uid: c.composition_uid,
          order_type: 'PROCEDURE',
          name: f['Service Name'] || f['Procedure'] || insName || 'Surgical procedure',
          description: narrative || undefined, // PROCEDURE_REQUEST marker is not useful as detail
          narrative,
          requested_date: f['Requested Date'] || c.start_time,
          requesting_provider: f['Requesting Provider'],
          raw_price: firstPriceIn(narrative) ?? firstPriceIn(desc),
        });
      } else if (lname.includes('service request') || lname.includes('lab')) {
        // Parse the individual tests from "Selected Tests (N): a, b, c"
        const tm = (desc || '').match(/Selected Tests \(\d+\):\s*([^|]+)/i);
        const tests = tm ? tm[1].split(',').map(t => t.trim()).filter(Boolean) : [];
        orders.push({
          source_uid: c.composition_uid,
          order_id: f['Request ID'],
          order_type: 'LAB',
          name: f['Service Name'] || f['Service name'] || 'Laboratory order',
          tests,
          description: desc || narrative,
          narrative,
          requested_date: f['Requested Date'] || c.start_time,
          requesting_provider: f['Requesting Provider'],
          raw_price: firstPriceIn(desc) ?? firstPriceIn(narrative),
        });
      } else if (lname.includes('medication')) {
        orders.push({
          source_uid: c.composition_uid,
          order_type: 'MEDICATION',
          name: f['Medication item'] || 'Medication',
          description: f['Overall directions description'] || narrative,
          narrative,
          requested_date: c.start_time,
          raw_price: firstPriceIn(narrative),
        });
      }
    }

    // Vaccination records are stored as an EVALUATION.problem_diagnosis (not an
    // INSTRUCTION), with a "VACCINATION: <name>" marker prefix — read back via
    // EHRbase's FLAT format since the flat path keys are already known.
    const flat = await getCompositionFlat(ehrId, c.composition_uid);
    const problemName: string = flat?.['template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name'] || '';
    if (problemName.startsWith('VACCINATION:')) {
      const vaccineName = problemName.replace(/^VACCINATION:\s*/, '');
      const clinicalDescription: string = flat?.['template_clinical_encounter_v1/problem_diagnosis/clinical_description'] || '';
      const [, targetedDisease] = clinicalDescription.split(' | ');
      const comment: string = flat?.['template_clinical_encounter_v1/problem_diagnosis/comment'] || '';
      const [nextVaccineDue, additionalDetails] = comment.split(' | ');
      const lastVaccineDate = flat?.['template_clinical_encounter_v1/problem_diagnosis/body_site:0'];
      const totalAdministrations = flat?.['template_clinical_encounter_v1/problem_diagnosis/variant:0'];
      orders.push({
        source_uid: c.composition_uid,
        order_type: 'VACCINATION',
        name: vaccineName || 'Vaccination',
        description: [
          targetedDisease ? `Targets: ${targetedDisease}` : '',
          totalAdministrations ? `Dose ${totalAdministrations}` : '',
          nextVaccineDue ? `Next due: ${nextVaccineDue}` : '',
          additionalDetails || '',
        ].filter(Boolean).join(' | '),
        requested_date: lastVaccineDate || c.start_time,
      });
    }
  }

  // ER/triage assessments are written by the separate ER module as a
  // template_triage_v1 composition (EVALUATION.problem_diagnosis, same slot
  // pattern as vaccinations above) — a different template than
  // template_clinical_encounter_v1, so they need their own fetch+parse pass.
  // No price is embedded; the caller resolves it from the "Emergency Room Fee"
  // catalog service by matching on the order name.
  const triageComps = await getCompositions(ehrId, 'template_triage_v1', dateFrom, dateTo);
  for (const c of triageComps.slice(0, limit)) {
    const flat = await getCompositionFlat(ehrId, c.composition_uid);
    if (!flat) continue;
    const chiefComplaint: string = flat['template_triage_v1/problem_diagnosis/problem_diagnosis_name'] || '';
    const composer: string = flat['template_triage_v1/composer|name'] || '';
    orders.push({
      source_uid: c.composition_uid,
      order_type: 'ER',
      name: chiefComplaint ? `Emergency Room Fee — ${chiefComplaint}` : 'Emergency Room Fee',
      description: flat['template_triage_v1/problem_diagnosis/clinical_description'] || undefined,
      requested_date: c.start_time,
      requesting_provider: composer || undefined,
    });
  }

  // Orders are collected in separate passes (encounter instructions, then
  // vaccinations, then ER/triage) so without re-sorting they'd come back
  // bucketed by pass rather than chronologically — most-recent-first across
  // every order type, so same-date orders naturally end up grouped together.
  orders.sort((a, b) => {
    const ta = a.requested_date ? new Date(a.requested_date).getTime() : 0;
    const tb = b.requested_date ? new Date(b.requested_date).getTime() : 0;
    return tb - ta;
  });

  return orders;
}

export interface PatientDiagnosis {
  source_uid: string;
  name: string;          // e.g. "Atherosclerotic heart disease"
  description?: string;  // clinical_description free text
  recorded_date?: string;
}

/**
 * Extract a patient's recorded diagnoses (EVALUATION.problem_diagnosis entries)
 * from their clinical-encounter compositions, excluding vaccination records
 * (which reuse the same slot with a "VACCINATION:" prefix — see getPatientOrders).
 * Used to auto-fill "Diagnosis Description" on the insurance pre-approval report.
 */
export async function getPatientDiagnoses(ehrId: string, limit = 40): Promise<PatientDiagnosis[]> {
  const comps = await getCompositions(ehrId, 'template_clinical_encounter_v1');
  const diagnoses: PatientDiagnosis[] = [];

  for (const c of comps.slice(0, limit)) {
    const flat = await getCompositionFlat(ehrId, c.composition_uid);
    const problemName: string = flat?.['template_clinical_encounter_v1/problem_diagnosis/problem_diagnosis_name'] || '';
    if (!problemName || problemName.startsWith('VACCINATION:')) continue;
    const clinicalDescription: string = flat?.['template_clinical_encounter_v1/problem_diagnosis/clinical_description'] || '';
    diagnoses.push({
      source_uid: c.composition_uid,
      name: problemName,
      description: clinicalDescription || undefined,
      recorded_date: c.start_time,
    });
  }
  return diagnoses;
}
