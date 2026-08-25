import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { createPayrollCalculationEngine } from '@/lib/services/payroll-calculation-engine';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


/**
 * POST /api/hr/payroll/calculate
 * Calculate payroll for a period
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_id, employee_ids } = body;

    // This handler passes a client-supplied id to a service that reads
    // facility data keyed by that id alone, so the check belongs here.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {
    const owns = await pool.query(
      'SELECT 1 FROM payroll_periods WHERE id = $1 AND workspaceid = $2',
      [period_id, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    if (!period_id) {
      return NextResponse.json(
        { success: false, error: 'Period ID is required' },
        { status: 400 }
      );
    }

    // Create calculation engine
    const engine = createPayrollCalculationEngine(pool);

    // Process payroll
    const result = await engine.processPayrollForPeriod(period_id, employee_ids);

    // Save transactions to database
    await engine.savePayrollTransactions(period_id, result.records);

    return NextResponse.json({
      success: true,
      data: {
        period_id: result.period_id,
        total_employees: result.total_employees,
        successful: result.successful,
        failed: result.failed,
        total_gross: result.total_gross,
        total_deductions: result.total_deductions,
        total_net: result.total_net,
        errors: result.errors,
        warnings: result.records.flatMap(r => 
          r.warnings.map(w => ({ employee_id: r.employee_id, warning: w }))
        )
      }
    });

    });
  } catch (error: any) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
