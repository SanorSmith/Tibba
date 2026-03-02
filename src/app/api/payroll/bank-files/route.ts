/**
 * Bank File Generation API
 * POST /api/payroll/bank-files - Generate bank transfer file
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRoles, logAudit } from '@/lib/auth/middleware';
import { bankFileGenerator, BankFileFormat } from '@/services/bank-file-generator';
import { z } from 'zod';

const bankFileSchema = z.object({
  period_id: z.string().uuid('Invalid period ID'),
  format: z.enum(['csv', 'xml', 'fixed-width']).default('csv'),
  validate_only: z.boolean().optional().default(false),
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
    const validatedData = bankFileSchema.parse(body);

    // If validate_only, return validation results
    if (validatedData.validate_only) {
      const validation = await bankFileGenerator.validateBankFile(validatedData.period_id);
      return NextResponse.json({
        success: validation.valid,
        data: validation,
      });
    }

    // Validate before generating
    const validation = await bankFileGenerator.validateBankFile(validatedData.period_id);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Bank file validation failed',
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Generate bank file
    const { content, filename, metadata } = await bankFileGenerator.generateBankTransferFile(
      validatedData.period_id,
      validatedData.format as BankFileFormat
    );

    // Log audit trail
    await logAudit({
      user_id: user.id,
      action: 'GENERATE_BANK_FILE',
      entity_type: 'payroll',
      entity_id: validatedData.period_id,
      changes: {
        period_id: validatedData.period_id,
        format: validatedData.format,
        total_records: metadata.total_records,
        total_amount: metadata.total_amount,
      },
    });

    // Determine content type based on format
    let contentType = 'text/plain';
    if (validatedData.format === 'csv') {
      contentType = 'text/csv';
    } else if (validatedData.format === 'xml') {
      contentType = 'application/xml';
    }

    // Return file
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('POST /api/payroll/bank-files error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: `Validation error: ${error.errors.map((e: any) => e.message).join(', ')}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate bank file' },
      { status: 500 }
    );
  }
}

// GET endpoint for bank file summary
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, ['hr_manager', 'admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('period_id');

    if (!periodId) {
      return NextResponse.json({ error: 'period_id is required' }, { status: 400 });
    }

    // Generate summary report
    const summary = await bankFileGenerator.generateSummaryReport(periodId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('GET /api/payroll/bank-files error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
