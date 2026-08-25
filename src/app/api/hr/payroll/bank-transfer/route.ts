import { NextRequest, NextResponse } from 'next/server';
import { createBankFileGenerator } from '@/lib/services/bank-file-generator';
import { postPayrollPayment } from '@/lib/gl-posting';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


/**
 * POST /api/hr/payroll/bank-transfer
 * Generate bank transfer file
 */
export async function POST(request: NextRequest) {
  // GL entries post to the caller’s facility ledger.
  const ws = await getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(ws, async () => {

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

    // The generator is keyed only by period_id, and produces a file listing
    // employee names, salaries and bank account numbers. Without this check
    // any facility could generate another's payment file by passing its id.
    const ownsPeriod = await pool.query(
      'SELECT 1 FROM payroll_periods WHERE id = $1 AND workspaceid = $2',
      [period_id, ws]
    );
    if (ownsPeriod.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
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

    // ── Post the salary disbursement to the GL (DR Employee Payable / CR Cash) ──
    // Fires once the bank file is generated. Non-fatal + idempotent (clears prior).
    try {
      const sums = await pool.query(
        `SELECT COALESCE(SUM(net_salary),0) AS net FROM payroll_transactions WHERE period_id = $1`,
        [period_id]
      );
      const periodRow = await pool.query(
        `SELECT period_name, end_date FROM payroll_periods WHERE id = $1`, [period_id]
      );
      const net = parseFloat(sums.rows[0].net) || 0;
      if (net > 0 && periodRow.rows.length > 0) {
        const periodName = periodRow.rows[0].period_name || 'Period';
        const entryDate  = value_date || (periodRow.rows[0].end_date
          ? new Date(periodRow.rows[0].end_date).toISOString().split('T')[0]
          : undefined);
        const glClient = await pool.connect();
        try {
          await glClient.query('BEGIN');
          await glClient.query(
            `DELETE FROM fin_journal_lines WHERE journalid IN (
               SELECT journalid FROM fin_journal_entries
               WHERE sourcetype='PAYROLL_PAYMENT' AND sourceid=$1)`, [period_id]);
          await glClient.query(
            `DELETE FROM fin_journal_entries WHERE sourcetype='PAYROLL_PAYMENT' AND sourceid=$1`, [period_id]);
          await postPayrollPayment(glClient, ws, period_id, periodName, net, entryDate);
          await glClient.query('COMMIT');
        } catch (glErr) {
          await glClient.query('ROLLBACK');
          console.error('[bank-transfer] GL posting failed (non-fatal):', glErr);
        } finally {
          glClient.release();
        }
      }
    } catch (glOuter) {
      console.error('[bank-transfer] GL setup failed (non-fatal):', glOuter);
    }

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
  });
}

/**
 * GET /api/hr/payroll/bank-transfer
 * Get bank transfer history
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

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
      WHERE pp.workspaceid = $1
    `;
    const params: any[] = [workspaceId];

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

    });
  } catch (error: any) {
    console.error('Error fetching bank transfers:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
