import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - List all offers with filters
export async function GET(request: NextRequest) {
  try {
    // workspaceId was a query-string filter and optional, so omitting it
    // returned every facility's records.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const candidateId = searchParams.get('candidateId');

    let sql = `
      SELECT 
        o.*,
        c.first_name as candidate_first_name,
        c.last_name as candidate_last_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        v.position as vacancy_position,
        v.department as vacancy_department,
        a.application_number
      FROM job_offers o
      LEFT JOIN job_candidates c ON o.candidate_id = c.id
      LEFT JOIN job_vacancies v ON o.vacancy_id = v.id
      LEFT JOIN job_applications a ON o.application_id = a.application_id
      WHERE 1=1
    `;
    const params: any[] = [workspaceId];
    let idx = 2;
    sql += ' AND o.workspace_id = $1';

    if (status) { sql += ` AND o.status = $${idx++}`; params.push(status); }
    if (candidateId) { sql += ` AND o.candidate_id = $${idx++}`; params.push(candidateId); }

    sql += ' ORDER BY o.created_at DESC';

    const result = await query(sql, params);

    // Stats
    const statsParams: any[] = [];
    let statsWhere = 'WHERE 1=1';
    let sIdx = 1;
    statsWhere += ` AND workspace_id = $${sIdx++}`; statsParams.push(workspaceId);

    const statsResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'SENT') as sent,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted,
        COUNT(*) FILTER (WHERE status = 'DECLINED') as declined,
        COUNT(*) FILTER (WHERE status = 'NEGOTIATING') as negotiating,
        COUNT(*) FILTER (WHERE status = 'WITHDRAWN') as withdrawn
      FROM job_offers ${statsWhere}
    `, statsParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0],
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Get offers error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch offers' }, { status: 500 });
  }
}

// POST - Create new offer
export async function POST(request: NextRequest) {
  try {
    // Facility comes from the session, never the request body.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    const body = await request.json();
    const {
      applicationId, candidateId, vacancyId,
      positionTitle, department, offeredSalary, currency,
      salaryPeriod, probationMonths, startDate, contractType,
      contractDurationMonths, benefitsPackage, signingBonus,
      relocationPackage, relocationAmount, otherTerms, createdBy,
    } = body;

    if (!applicationId || !candidateId || !vacancyId || !positionTitle || !offeredSalary) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: applicationId, candidateId, vacancyId, positionTitle, offeredSalary' },
        { status: 400 }
      );
    }

    const offerNumber = `OFFER-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

    const result = await query(`
      INSERT INTO job_offers (
        offer_number, workspace_id, application_id, candidate_id, vacancy_id,
        position_title, department, offered_salary, currency, salary_period,
        probation_months, start_date, contract_type, contract_duration_months,
        benefits_package, signing_bonus, relocation_package, relocation_amount,
        other_terms, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, 'DRAFT', $20
      ) RETURNING *
    `, [
      offerNumber, workspaceId, applicationId, candidateId, vacancyId,
      positionTitle, department || null, offeredSalary, currency || 'IQD',
      salaryPeriod || 'MONTHLY', probationMonths || 3, startDate || null,
      contractType || 'FULL_TIME', contractDurationMonths || null,
      benefitsPackage || null, signingBonus || null,
      relocationPackage || false, relocationAmount || null,
      otherTerms || null, createdBy || null
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Offer created successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create offer error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create offer' }, { status: 500 });
  }
}
