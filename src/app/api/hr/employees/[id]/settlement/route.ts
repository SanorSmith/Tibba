import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;

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
      pension_eligible,
      pension_scheme,
      pension_contribution_rate,
      employer_pension_rate,
      pension_start_date,
      social_security_number,
      social_security_rate,
      tax_id_number,
      tax_exemption_amount,
      settlement_eligible,
      settlement_calculation_method,
      gratuity_eligible,
      notice_period_days,
    } = body;

    // Update employee settlement rules
    await pool.query(`
      UPDATE staff 
      SET 
        pension_eligible = $1,
        pension_scheme = $2,
        pension_contribution_rate = $3,
        employer_pension_rate = $4,
        pension_start_date = $5,
        social_security_number = $6,
        social_security_rate = $7,
        tax_id_number = $8,
        tax_exemption_amount = $9,
        settlement_eligible = $10,
        settlement_calculation_method = $11,
        gratuity_eligible = $12,
        notice_period_days = $13,
        updated_at = NOW()
      WHERE staffid = $14
    `, [
      pension_eligible ?? true,
      pension_scheme || 'STANDARD',
      pension_contribution_rate ?? 5.0,
      employer_pension_rate ?? 5.0,
      pension_start_date || null,
      social_security_number || null,
      social_security_rate ?? 5.0,
      tax_id_number || null,
      tax_exemption_amount ?? 0,
      settlement_eligible ?? true,
      settlement_calculation_method || 'IRAQI_LABOR_LAW',
      gratuity_eligible ?? true,
      notice_period_days ?? 30,
      id
    ]);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Settlement rules updated successfully'
    });

  } catch (error) {
    console.error('Error updating settlement rules:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to update settlement rules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;

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
    const result = await pool.query(`
      SELECT 
        pension_eligible,
        pension_scheme,
        pension_contribution_rate,
        employer_pension_rate,
        pension_start_date,
        social_security_number,
        social_security_rate,
        tax_id_number,
        tax_exemption_amount,
        settlement_eligible,
        settlement_calculation_method,
        gratuity_eligible,
        notice_period_days,
        last_settlement_date,
        last_settlement_amount
      FROM staff 
      WHERE staffid = $1
    `, [id]);

    await pool.end();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching settlement rules:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch settlement rules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
