/**
 * Payslip Generation API
 * GET /api/payroll/payslips/:payrollId - Generate single payslip PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/middleware';
import { payslipGenerator } from '@/services/payslip-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { payrollId: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { payrollId } = params;

    // Generate payslip PDF
    const pdfBuffer = await payslipGenerator.generatePayslip(payrollId);

    // Return PDF file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslip-${payrollId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('GET /api/payroll/payslips/:payrollId error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate payslip' },
      { status: 500 }
    );
  }
}
