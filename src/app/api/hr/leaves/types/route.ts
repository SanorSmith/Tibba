import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let query = `
      SELECT 
        id,
        code,
        name,
        category,
        max_days,
        max_consecutive,
        carry_forward,
        max_carry_forward_days,
        accrual_method,
        accrual_rate,
        notice_days,
        requires_documentation,
        gender_specific,
        applicable_to_roles,
        color,
        is_active,
        created_at,
        updated_at
      FROM leave_types
      WHERE 1=1
    `;

    const params: any[] = [];

    if (activeOnly) {
      query += ` AND is_active = true`;
    }

    // If employeeId provided, filter by gender-specific types
    if (employeeId) {
      // Get employee gender
      const employeeResult = await pool.query(`
        SELECT gender FROM staff WHERE staffid = $1
      `, [employeeId]);

      if (employeeResult.rows.length > 0) {
        const gender = employeeResult.rows[0].gender;
        query += ` AND (gender_specific IS NULL OR gender_specific = $${params.length + 1})`;
        params.push(gender);
      }
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);

    await pool.end();

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching leave types:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch leave types',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const body = await request.json();
    const {
      code,
      name,
      category,
      max_days,
      max_consecutive,
      carry_forward,
      max_carry_forward_days,
      accrual_method,
      accrual_rate,
      notice_days,
      requires_documentation,
      gender_specific,
      applicable_to_roles,
      color
    } = body;

    if (!code || !name || !category || !max_days) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, category, max_days' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      INSERT INTO leave_types (
        code, name, category, max_days, max_consecutive, carry_forward,
        max_carry_forward_days, accrual_method, accrual_rate, notice_days,
        requires_documentation, gender_specific, applicable_to_roles, color, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      RETURNING *
    `, [
      code,
      name,
      category,
      max_days,
      max_consecutive || null,
      carry_forward || false,
      max_carry_forward_days || 0,
      accrual_method || null,
      accrual_rate || null,
      notice_days || 0,
      requires_documentation || false,
      gender_specific || null,
      applicable_to_roles ? JSON.stringify(applicable_to_roles) : null,
      color || '#3B82F6'
    ]);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Leave type created successfully',
      data: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating leave type:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to create leave type',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
