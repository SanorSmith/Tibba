import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createPayrollCalculationEngine } from '@/lib/services/payroll-calculation-engine';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/hr/payroll/calculate
 * Calculate payroll for a period
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_id, employee_ids } = body;

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

  } catch (error: any) {
    console.error('Error calculating payroll:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
