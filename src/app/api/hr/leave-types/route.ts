import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// GET - Fetch all leave types
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const organizationId = searchParams.get('organizationId') || '00000000-0000-0000-0000-000000000001';

    let query = `
      SELECT 
        id,
        organization_id,
        name,
        name_ar,
        code,
        description,
        description_ar,
        max_days_per_year,
        is_paid,
        requires_approval,
        min_notice_days,
        max_consecutive_days,
        accrual_frequency,
        accrual_rate,
        carry_forward_allowed,
        carry_forward_limit,
        color,
        icon,
        sort_order,
        is_active,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM leave_types
      WHERE organization_id = $1
    `;

    const params: any[] = [organizationId];

    if (isActive !== null) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(isActive === 'true');
    }

    query += ' ORDER BY sort_order ASC, name ASC';

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching leave types:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch leave types',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create new leave type
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name || !body.code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and code are required',
        },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const checkResult = await pool.query(
      'SELECT id FROM leave_types WHERE code = $1 AND organization_id = $2',
      [body.code, body.organizationId || '00000000-0000-0000-0000-000000000001']
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Leave type code already exists',
        },
        { status: 409 }
      );
    }

    const query = `
      INSERT INTO leave_types (
        organization_id,
        name,
        name_ar,
        code,
        description,
        description_ar,
        max_days_per_year,
        is_paid,
        requires_approval,
        min_notice_days,
        max_consecutive_days,
        accrual_frequency,
        accrual_rate,
        carry_forward_allowed,
        carry_forward_limit,
        color,
        icon,
        sort_order,
        is_active,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      RETURNING *
    `;

    const values = [
      body.organizationId || '00000000-0000-0000-0000-000000000001',
      body.name,
      body.nameAr || null,
      body.code,
      body.description || null,
      body.descriptionAr || null,
      body.maxDaysPerYear || 0,
      body.isPaid !== undefined ? body.isPaid : true,
      body.requiresApproval !== undefined ? body.requiresApproval : true,
      body.minNoticeDays || 1,
      body.maxConsecutiveDays || 365,
      body.accrualFrequency || 'YEARLY',
      body.accrualRate || 1.0,
      body.carryForwardAllowed !== undefined ? body.carryForwardAllowed : false,
      body.carryForwardLimit || 0,
      body.color || '#3B82F6',
      body.icon || null,
      body.sortOrder || 0,
      body.isActive !== undefined ? body.isActive : true,
      body.createdBy || 'system',
    ];

    const result = await pool.query(query, values);

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Leave type created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating leave type:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create leave type',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
