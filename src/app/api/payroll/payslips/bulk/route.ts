/**
 * Bulk Payslip Generation API
 * POST /api/payroll/payslips/bulk - Generate payslips for all employees in a period
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRoles, logAudit } from '@/lib/auth/middleware';
import { PayslipGenerator } from '@/services/payslip-generator';
import { z } from 'zod';

const bulkPayslipSchema = z.object({
  period_id: z.string().uuid('Invalid period ID'),
  delivery_method: z.enum(['download', 'email']).optional().default('download'),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    const body = await request.json();

    // Validate input
    const validatedData = bulkPayslipSchema.parse(body);

    // Generate bulk payslips
    const generator = new PayslipGenerator();
    const payslips = await generator.generateBulkPayslips(validatedData.period_id);

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'GENERATE_BULK_PAYSLIPS',
      entity_type: 'payroll',
      entity_id: validatedData.period_id,
      changes: {
        period_id: validatedData.period_id,
        employee_count: payslips.length,
        delivery_method: validatedData.delivery_method,
      },
    });

    // If download, return ZIP file (future enhancement)
    // For now, return metadata
    return NextResponse.json({
      success: true,
      data: {
        period_id: validatedData.period_id,
        total_payslips: payslips.length,
        employees: payslips.map((p) => ({
          employee_id: p.employee_id,
          employee_number: p.employee_number,
          employee_name: p.employee_name,
          pdf_size: p.pdf_buffer.length,
        })),
        message: `Generated ${payslips.length} payslips successfully`,
      },
    });
  } catch (error: any) {
    console.error('POST /api/payroll/payslips/bulk error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: `Validation error: ${error.errors.map((e: any) => e.message).join(', ')}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate bulk payslips' },
      { status: 500 }
    );
  }
}
