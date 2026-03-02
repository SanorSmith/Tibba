/**
 * Payroll Calculation API
 * POST /api/hr/payroll/calculate - Trigger automated payroll calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { requireRoles, logAudit } from '@/lib/auth/middleware';
import { payrollCalculator } from '@/services/payroll-calculator';
import { z } from 'zod';

const calculatePayrollSchema = z.object({
  period_id: z.string().uuid('Invalid period ID'),
  employee_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require HR manager or admin role
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json(errorResponse(authResult.error), { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    // Validate input
    const validatedData = calculatePayrollSchema.parse(body);

    // If specific employees provided, calculate for them only
    if (validatedData.employee_ids && validatedData.employee_ids.length > 0) {
      const results = [];
      const errors = [];

      for (const employeeId of validatedData.employee_ids) {
        try {
          const payrollRecord = await payrollCalculator.calculateNetSalary(
            employeeId,
            validatedData.period_id
          );
          results.push(payrollRecord);
        } catch (error: any) {
          errors.push({
            employee_id: employeeId,
            error: error.message,
          });
        }
      }

      // Log audit trail
      await logAudit({
        user_id: user.id,
        action: 'CALCULATE_PAYROLL',
        entity_type: 'payroll',
        entity_id: validatedData.period_id,
        changes: {
          employee_count: validatedData.employee_ids.length,
          successful: results.length,
          failed: errors.length,
        },
      });

      return NextResponse.json(
        successResponse({
          period_id: validatedData.period_id,
          total_employees: validatedData.employee_ids.length,
          successful: results.length,
          failed: errors.length,
          records: results,
          errors,
        })
      );
    }

    // Otherwise, process entire period
    const result = await payrollCalculator.processPayrollForPeriod(validatedData.period_id);

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'PROCESS_PAYROLL_PERIOD',
      entity_type: 'payroll_period',
      entity_id: validatedData.period_id,
      changes: {
        total_employees: result.total_employees,
        successful: result.successful,
        failed: result.failed,
        total_gross: result.total_gross,
        total_net: result.total_net,
      },
    });

    return NextResponse.json(
      successResponse({
        ...result,
        message: `Payroll processed for ${result.successful} employees. ${result.failed} failed.`,
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/hr/payroll/calculate error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse(`Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`),
        { status: 400 }
      );
    }

    return NextResponse.json(errorResponse(error.message || 'Internal server error'), { status: 500 });
  }
}
