import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// GET - Get offer details with negotiation history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const { offerId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_offers WHERE offer_id = $1 AND workspace_id = $2',
      [offerId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const offerResult = await query(`
      SELECT 
        o.*,
        c.first_name as candidate_first_name, c.last_name as candidate_last_name,
        c.email as candidate_email, c.phone as candidate_phone,
        v.position as vacancy_position, v.department as vacancy_department,
        a.application_number, a.status as application_status
      FROM job_offers o
      LEFT JOIN job_candidates c ON o.candidate_id = c.id
      LEFT JOIN job_vacancies v ON o.vacancy_id = v.id
      LEFT JOIN job_applications a ON o.application_id = a.application_id
      WHERE o.offer_id = $1
    `, [offerId]);

    if (offerResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
    }

    const negotiationResult = await query(`
      SELECT * FROM offer_negotiation_history
      WHERE offer_id = $1
      ORDER BY round_number ASC, created_at ASC
    `, [offerId]);

    return NextResponse.json({
      success: true,
      data: offerResult.rows[0],
      negotiationHistory: negotiationResult.rows
    });
    });
  } catch (error: any) {
    console.error('Get offer detail error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch offer' }, { status: 500 });
  }
}

// PUT - Update offer (only DRAFT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  try {
    const { offerId } = await params;
    
    // The record must belong to the caller’s facility; every statement
    // below is keyed off this id.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {
    const owns = await query(
      'SELECT 1 FROM job_offers WHERE offer_id = $1 AND workspace_id = $2',
      [offerId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();

    const existing = await query('SELECT status FROM job_offers WHERE offer_id = $1', [offerId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });
    }
    if (!['DRAFT'].includes(existing.rows[0].status)) {
      return NextResponse.json({ success: false, error: 'Only DRAFT offers can be edited' }, { status: 400 });
    }

    const allowedFields = [
      'position_title', 'department', 'offered_salary', 'currency',
      'salary_period', 'probation_months', 'start_date', 'contract_type',
      'contract_duration_months', 'benefits_package', 'signing_bonus',
      'relocation_package', 'relocation_amount', 'other_terms'
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (body[camelField] !== undefined || body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(body[camelField] !== undefined ? body[camelField] : body[field]);
      }
    }
    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }
    updates.push('updated_at = NOW()');
    values.push(offerId);

    const result = await query(`UPDATE job_offers SET ${updates.join(', ')} WHERE offer_id = $${idx} RETURNING *`, values);

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Offer updated' });
    });
  } catch (error: any) {
    console.error('Update offer error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update offer' }, { status: 500 });
  }
}
