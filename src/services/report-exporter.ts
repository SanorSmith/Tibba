/**
 * Report Export Service
 * Handles Excel and PDF export with professional formatting
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ReportData, ReportType } from './report-generator';
import { Readable } from 'stream';

export class ReportExporter {
  /**
   * Export report to Excel with professional styling
   */
  async exportToExcel(reportData: ReportData, reportType: ReportType): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tibbna Hospital HR System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Report');

    // Add title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = reportData.title;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Add generation date
    worksheet.mergeCells('A2:F2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Generated: ${new Date(reportData.generated_at).toLocaleString()}`;
    dateCell.font = { size: 10, italic: true };
    dateCell.alignment = { horizontal: 'center' };

    // Add data based on report type
    let startRow = 4;

    switch (reportType) {
      case 'daily-attendance':
        startRow = this.addDailyAttendanceData(worksheet, reportData, startRow);
        break;
      case 'monthly-payroll':
        startRow = this.addMonthlyPayrollData(worksheet, reportData, startRow);
        break;
      case 'leave-balance':
        startRow = this.addLeaveBalanceData(worksheet, reportData, startRow);
        break;
      case 'overtime-analysis':
        startRow = this.addOvertimeAnalysisData(worksheet, reportData, startRow);
        break;
      case 'department-headcount':
        startRow = this.addDepartmentHeadcountData(worksheet, reportData, startRow);
        break;
      case 'absence-report':
        startRow = this.addAbsenceReportData(worksheet, reportData, startRow);
        break;
      case 'late-arrivals':
        startRow = this.addLateArrivalsData(worksheet, reportData, startRow);
        break;
      case 'employee-directory':
        startRow = this.addEmployeeDirectoryData(worksheet, reportData, startRow);
        break;
      case 'license-expiry':
        startRow = this.addLicenseExpiryData(worksheet, reportData, startRow);
        break;
      case 'payroll-cost':
        startRow = this.addPayrollCostData(worksheet, reportData, startRow);
        break;
    }

    // Add summary if available
    if (reportData.summary) {
      this.addSummarySection(worksheet, reportData.summary, startRow + 2);
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Add Daily Attendance data to worksheet
   */
  private addDailyAttendanceData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Employee #', 'Name', 'Department', 'Check In', 'Check Out', 'Hours', 'OT Hours', 'Status', 'Shift'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.employee_number,
        row.employee_name,
        row.department,
        row.check_in ? new Date(row.check_in).toLocaleTimeString() : '-',
        row.check_out ? new Date(row.check_out).toLocaleTimeString() : '-',
        row.total_hours || 0,
        row.overtime_hours || 0,
        row.status,
        row.shift_type || '-',
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add Monthly Payroll data to worksheet
   */
  private addMonthlyPayrollData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Employee #', 'Name', 'Department', 'Basic', 'Allowances', 'OT Pay', 'Bonus', 'Gross', 'Deductions', 'Net', 'Status'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.employee_number,
        row.employee_name,
        row.department,
        row.basic_salary || 0,
        row.allowances || 0,
        row.overtime_pay || 0,
        row.bonus || 0,
        row.gross_salary || 0,
        row.deductions || 0,
        row.net_salary || 0,
        row.payment_status,
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
      
      // Format currency columns
      [4, 5, 6, 7, 8, 9, 10].forEach(col => {
        excelRow.getCell(col).numFmt = '#,##0.00';
      });
    });

    // Add totals row
    const totalRow = startRow + reportData.data.length + 1;
    const totalsData = [
      '', 'TOTAL', '',
      { formula: `SUM(D${startRow + 1}:D${startRow + reportData.data.length})` },
      { formula: `SUM(E${startRow + 1}:E${startRow + reportData.data.length})` },
      { formula: `SUM(F${startRow + 1}:F${startRow + reportData.data.length})` },
      { formula: `SUM(G${startRow + 1}:G${startRow + reportData.data.length})` },
      { formula: `SUM(H${startRow + 1}:H${startRow + reportData.data.length})` },
      { formula: `SUM(I${startRow + 1}:I${startRow + reportData.data.length})` },
      { formula: `SUM(J${startRow + 1}:J${startRow + reportData.data.length})` },
      '',
    ];
    const totalExcelRow = worksheet.getRow(totalRow);
    totalExcelRow.values = totalsData;
    totalExcelRow.font = { bold: true };
    totalExcelRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return totalRow;
  }

  /**
   * Add Leave Balance data to worksheet
   */
  private addLeaveBalanceData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Employee #', 'Name', 'Department', 'Annual Ent.', 'Annual Used', 'Annual Bal.', 'Sick Ent.', 'Sick Used', 'Sick Bal.', 'Emergency', 'Unpaid'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.employee_number,
        row.employee_name,
        row.department,
        row.annual_entitlement,
        row.annual_used,
        row.annual_balance,
        row.sick_entitlement,
        row.sick_used,
        row.sick_balance,
        row.emergency_used,
        row.unpaid_used,
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add Overtime Analysis data to worksheet
   */
  private addOvertimeAnalysisData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Employee #', 'Name', 'Department', 'Total OT Hours', 'Days with OT'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.employee_number,
        row.employee_name,
        row.department,
        row.total_overtime,
        row.days_with_overtime,
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add Department Headcount data to worksheet
   */
  private addDepartmentHeadcountData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Dept Code', 'Department', 'Total', 'Active', 'On Leave', 'Terminated', 'Suspended'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.department_code,
        row.department_name,
        row.total_employees,
        row.active,
        row.on_leave,
        row.terminated,
        row.suspended,
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add Absence Report data to worksheet
   */
  private addAbsenceReportData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Employee #', 'Name', 'Department', 'Absence Count', 'Absence Dates'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.employee_number,
        row.employee_name,
        row.department,
        row.absence_count,
        row.absence_dates.join(', '),
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add Late Arrivals data to worksheet
   */
  private addLateArrivalsData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Employee #', 'Name', 'Department', 'Date', 'Check In Time', 'Late Minutes'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.employee_number,
        row.employee_name,
        row.department,
        row.date,
        row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : '-',
        row.late_minutes,
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add Employee Directory data to worksheet
   */
  private addEmployeeDirectoryData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Employee #', 'Full Name', 'Email', 'Phone', 'Position', 'Department', 'Hire Date', 'Status'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.employee_number,
        row.full_name,
        row.email,
        row.phone,
        row.position,
        row.department,
        row.hire_date,
        row.status,
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add License Expiry data to worksheet
   */
  private addLicenseExpiryData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Employee #', 'Name', 'Department', 'License Type', 'License #', 'Expiry Date', 'Days Until Expiry', 'Status'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.employee_number,
        row.employee_name,
        row.department,
        row.license_type,
        row.license_number,
        row.expiry_date,
        row.days_until_expiry,
        row.status,
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
      
      // Color code based on status
      if (row.status === 'Critical') {
        excelRow.getCell(8).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' },
        };
        excelRow.getCell(8).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      } else {
        excelRow.getCell(8).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA500' },
        };
      }
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add Payroll Cost data to worksheet
   */
  private addPayrollCostData(worksheet: ExcelJS.Worksheet, reportData: ReportData, startRow: number): number {
    const headers = ['Department', 'Employees', 'Basic', 'Allowances', 'Overtime', 'Bonus', 'Gross', 'Deductions', 'Net'];
    this.addHeaderRow(worksheet, startRow, headers);

    reportData.data.forEach((row: any, index: number) => {
      const rowData = [
        row.department,
        row.employee_count,
        row.total_basic,
        row.total_allowances,
        row.total_overtime,
        row.total_bonus,
        row.total_gross,
        row.total_deductions,
        row.total_net,
      ];
      const excelRow = worksheet.getRow(startRow + 1 + index);
      excelRow.values = rowData;
      this.styleDataRow(excelRow, index);
      
      // Format currency columns
      [3, 4, 5, 6, 7, 8, 9].forEach(col => {
        excelRow.getCell(col).numFmt = '#,##0.00';
      });
    });

    return startRow + reportData.data.length + 1;
  }

  /**
   * Add header row with styling
   */
  private addHeaderRow(worksheet: ExcelJS.Worksheet, rowNumber: number, headers: string[]): void {
    const headerRow = worksheet.getRow(rowNumber);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;
    
    // Add borders
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  /**
   * Style data row with alternating colors
   */
  private styleDataRow(row: ExcelJS.Row, index: number): void {
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' },
      };
    }
    
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });
  }

  /**
   * Add summary section to worksheet
   */
  private addSummarySection(worksheet: ExcelJS.Worksheet, summary: any, startRow: number): void {
    worksheet.mergeCells(`A${startRow}:C${startRow}`);
    const summaryTitle = worksheet.getCell(`A${startRow}`);
    summaryTitle.value = 'SUMMARY';
    summaryTitle.font = { bold: true, size: 12 };
    summaryTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    let currentRow = startRow + 1;
    Object.entries(summary).forEach(([key, value]) => {
      if (typeof value !== 'object') {
        const labelCell = worksheet.getCell(`A${currentRow}`);
        const valueCell = worksheet.getCell(`B${currentRow}`);
        
        labelCell.value = key.replace(/_/g, ' ').toUpperCase();
        labelCell.font = { bold: true };
        
        valueCell.value = value as ExcelJS.CellValue;
        if (typeof value === 'number') {
          valueCell.numFmt = '#,##0.00';
        }
        
        currentRow++;
      }
    });
  }

  /**
   * Export report to PDF with hospital branding
   */
  async exportToPDF(reportData: ReportData, reportType: ReportType): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Tibbna Hospital', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('HR Management System', { align: 'center' });
      doc.moveDown();

      // Report title
      doc.fontSize(16).font('Helvetica-Bold').text(reportData.title, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(
        `Generated: ${new Date(reportData.generated_at).toLocaleString()}`,
        { align: 'center' }
      );
      doc.moveDown(2);

      // Add data table based on report type
      this.addPDFTable(doc, reportData, reportType);

      // Add summary if available
      if (reportData.summary) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
        doc.moveDown();
        doc.fontSize(10).font('Helvetica');
        
        Object.entries(reportData.summary).forEach(([key, value]) => {
          if (typeof value !== 'object') {
            doc.text(`${key.replace(/_/g, ' ').toUpperCase()}: ${value}`);
          }
        });
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pageCount} | Generated by Tibbna Hospital HR System`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
      }

      doc.end();
    });
  }

  /**
   * Add table to PDF document
   */
  private addPDFTable(doc: PDFKit.PDFDocument, reportData: ReportData, reportType: ReportType): void {
    doc.fontSize(10).font('Helvetica');

    // Limit to first 50 rows for PDF (to avoid huge files)
    const dataToShow = reportData.data.slice(0, 50);
    
    if (reportData.data.length > 50) {
      doc.text(`Showing first 50 of ${reportData.data.length} records`, { align: 'center' });
      doc.moveDown();
    }

    // Simple table rendering (basic implementation)
    dataToShow.forEach((row: any, index: number) => {
      if (index > 0 && index % 20 === 0) {
        doc.addPage();
      }

      const rowText = Object.values(row).join(' | ');
      doc.text(rowText.substring(0, 100)); // Limit line length
    });

    if (reportData.data.length > 50) {
      doc.moveDown();
      doc.fontSize(8).text('For complete data, please use Excel export', { align: 'center' });
    }
  }
}

export const reportExporter = new ReportExporter();
