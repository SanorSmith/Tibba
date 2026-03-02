/**
 * Report Generation API
 * GET /api/reports/:reportType?format=json|excel|pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { reportGenerator, ReportType, ReportParameters } from '@/services/report-generator';
import { reportExporter } from '@/services/report-exporter';

const VALID_REPORT_TYPES: ReportType[] = [
  'daily-attendance',
  'monthly-payroll',
  'leave-balance',
  'overtime-analysis',
  'department-headcount',
  'absence-report',
  'late-arrivals',
  'employee-directory',
  'license-expiry',
  'payroll-cost',
];

export async function GET(
  request: NextRequest,
  { params }: { params: { reportType: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { reportType } = params;

    // Validate report type
    if (!VALID_REPORT_TYPES.includes(reportType as ReportType)) {
      return NextResponse.json(
        { error: `Invalid report type. Valid types: ${VALID_REPORT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    // Extract report parameters
    const parameters: ReportParameters = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      department_id: searchParams.get('department_id') || undefined,
      employee_id: searchParams.get('employee_id') || undefined,
      month: searchParams.get('month') || undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
    };

    // Set default dates if not provided
    if (!parameters.start_date) {
      const today = new Date();
      parameters.start_date = today.toISOString().split('T')[0];
    }
    if (!parameters.end_date) {
      parameters.end_date = parameters.start_date;
    }

    // Generate report
    const reportData = await reportGenerator.generateReport(reportType as ReportType, parameters);

    // Return based on format
    switch (format.toLowerCase()) {
      case 'json':
        return NextResponse.json({
          success: true,
          data: reportData,
        });

      case 'excel':
        const excelBuffer = await reportExporter.exportToExcel(reportData, reportType as ReportType);
        const excelFilename = `${reportType}-${Date.now()}.xlsx`;
        
        return new NextResponse(new Uint8Array(excelBuffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${excelFilename}"`,
          },
        });

      case 'pdf':
        const pdfBuffer = await reportExporter.exportToPDF(reportData, reportType as ReportType);
        const pdfFilename = `${reportType}-${Date.now()}.pdf`;
        
        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${pdfFilename}"`,
          },
        });

      default:
        return NextResponse.json(
          { error: 'Invalid format. Use: json, excel, or pdf' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error(`GET /api/reports/${params.reportType} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
