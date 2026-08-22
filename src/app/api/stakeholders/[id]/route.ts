import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const result = await pool.query(
      `SELECT id AS stakeholder_id, stakeholder_code, name_ar, name_en, role,
              specialty_ar, specialty_en, phone, mobile, email,
              license_number, license_expiry_date,
              bank_name_ar, account_number, iban,
              service_type, default_share_type,
              default_share_percentage, default_share_amount,
              is_active, notes, createdat AS created_at, updatedat AS updated_at
       FROM stakeholders WHERE id = $1 AND workspaceid = $2`,
      [id, workspaceId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stakeholder', detail: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      name_ar, name_en, role, specialty_ar, specialty_en,
      phone, mobile, email, license_number, license_expiry_date,
      bank_name_ar, account_number, iban, service_type,
      default_share_type, default_share_percentage, default_share_amount,
      is_active, notes,
    } = body;

    const result = await pool.query(
      `UPDATE stakeholders SET
         name_ar = COALESCE($1, name_ar),
         name_en = COALESCE($2, name_en),
         role = COALESCE($3, role),
         specialty_ar = COALESCE($4, specialty_ar),
         specialty_en = COALESCE($5, specialty_en),
         phone = COALESCE($6, phone),
         mobile = COALESCE($7, mobile),
         email = COALESCE($8, email),
         license_number = COALESCE($9, license_number),
         license_expiry_date = COALESCE($10, license_expiry_date),
         bank_name_ar = COALESCE($11, bank_name_ar),
         account_number = COALESCE($12, account_number),
         iban = COALESCE($13, iban),
         service_type = COALESCE($14, service_type),
         default_share_type = COALESCE($15, default_share_type),
         default_share_percentage = COALESCE($16, default_share_percentage),
         default_share_amount = COALESCE($17, default_share_amount),
         is_active = COALESCE($18, is_active),
         notes = COALESCE($19, notes),
         updatedat = NOW()
       WHERE id = $20 AND workspaceid = $21
       RETURNING id AS stakeholder_id, stakeholder_code, name_ar, name_en, role, mobile, is_active`,
      [
        name_ar || null, name_en || null, role || null, specialty_ar || null, specialty_en || null,
        phone || null, mobile || null, email || null, license_number || null,
        license_expiry_date || null, bank_name_ar || null, account_number || null, iban || null,
        service_type || null, default_share_type || null,
        default_share_percentage != null ? default_share_percentage : null,
        default_share_amount != null ? default_share_amount : null,
        is_active != null ? is_active : null,
        notes || null, id, workspaceId,
      ]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update stakeholder', detail: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    // Soft delete — set is_active = false
    const result = await pool.query(
      'UPDATE stakeholders SET is_active = false, updatedat = NOW() WHERE id = $1 AND workspaceid = $2 RETURNING id',
      [id, workspaceId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Stakeholder deactivated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete stakeholder', detail: (error as Error).message }, { status: 500 });
  }
}
