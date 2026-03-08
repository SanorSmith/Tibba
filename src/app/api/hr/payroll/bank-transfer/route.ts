import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createBankFileGenerator } from '@/lib/services/bank-file-generator';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/hr/payroll/bank-transfer
 * Generate bank transfer file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_id, format, company_name, company_account, company_iban, value_date } = body;

    if (!period_id || !format) {
      return NextResponse.json(
        { success: false, error: 'period_id and format are required' },
        { status: 400 }
      );
    }

    if (!['WPS', 'SWIFT', 'LOCAL_CSV'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Must be WPS, SWIFT, or LOCAL_CSV' },
        { status: 400 }
      );
    }

    const generator = createBankFileGenerator(pool);

    const result = await generator.generateBankFile(period_id, {
      format,
      company_name,
      company_account,
      company_iban,
      value_date
    });

    return NextResponse.json({
      success: true,
      data: {
        batch_number: result.batch_number,
        filename: result.filename,
        content: result.content,
        format
      }
    });

  } catch (error: any) {
    console.error('Error generating bank file:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/hr/payroll/bank-transfer
 * Get bank transfer history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period_id = searchParams.get('period_id');

    let query = `
      SELECT 
        bt.*,
        pp.period_name,
        pp.start_date,
        pp.end_date
      FROM bank_transfers bt
      LEFT JOIN payroll_periods pp ON bt.period_id = pp.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (period_id) {
      params.push(period_id);
      query += ` AND bt.period_id = $${params.length}`;
    }

    query += ` ORDER BY bt.created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching bank transfers:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
