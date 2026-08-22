import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


/**
 * GET /api/stakeholders
 * Query params: role, is_active, search
 */
export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const role     = searchParams.get('role');
    const active   = searchParams.get('is_active');
    const search   = searchParams.get('search');

    let query = `
      SELECT
        id AS stakeholder_id, stakeholder_code, name_ar, name_en, role,
        specialty_ar, specialty_en, phone, mobile, email,
        license_number, license_expiry_date,
        bank_name_ar, account_number, iban,
        service_type, default_share_type,
        default_share_percentage, default_share_amount,
        is_active, notes, createdat AS created_at, updatedat AS updated_at
      FROM stakeholders
      WHERE workspaceid = $1
    `;
    const params: any[] = [workspaceId];
    let idx = 2;

    if (role && role !== 'ALL') { query += ` AND role = $${idx++}`; params.push(role); }
    if (active !== null) { query += ` AND is_active = $${idx++}`; params.push(active === 'true'); }
    if (search) {
      query += ` AND (name_ar ILIKE $${idx} OR name_en ILIKE $${idx} OR stakeholder_code ILIKE $${idx} OR mobile ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY name_ar`;

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('[stakeholders GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stakeholders', detail: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stakeholders
 */
export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const body = await request.json();
    const {
      stakeholder_code, name_ar, name_en, role = 'DOCTOR',
      specialty_ar, specialty_en, phone, mobile, email,
      license_number, license_expiry_date,
      bank_name_ar, account_number, iban,
      service_type, default_share_type = 'PERCENTAGE',
      default_share_percentage, default_share_amount,
      is_active = true, notes,
    } = body;

    if (!name_ar || !mobile) {
      return NextResponse.json({ error: 'name_ar and mobile are required' }, { status: 400 });
    }

    // Auto-generate code if not provided
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const code = stakeholder_code || `SH-${year}-${rand}`;

    const result = await pool.query(
      `INSERT INTO stakeholders (
         stakeholder_code, name_ar, name_en, role,
         specialty_ar, specialty_en, phone, mobile, email,
         license_number, license_expiry_date,
         bank_name_ar, account_number, iban,
         service_type, default_share_type,
         default_share_percentage, default_share_amount,
         is_active, notes, workspaceid
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
       ) RETURNING
         id AS stakeholder_id, stakeholder_code, name_ar, name_en, role,
         specialty_ar, mobile, email, is_active, createdat AS created_at`,
      [
        code, name_ar, name_en || null, role,
        specialty_ar || null, specialty_en || null, phone || null, mobile, email || null,
        license_number || null, license_expiry_date || null,
        bank_name_ar || null, account_number || null, iban || null,
        service_type || null, default_share_type,
        default_share_percentage != null ? default_share_percentage : null,
        default_share_amount != null ? default_share_amount : null,
        is_active, notes || null, workspaceId,
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[stakeholders POST] error:', error);
    const detail = (error as any).code === '23505'
      ? 'Stakeholder code already exists'
      : (error as Error).message;
    return NextResponse.json({ error: 'Failed to create stakeholder', detail }, { status: 500 });
  }
}
