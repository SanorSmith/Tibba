/**
 * Payslip Generator Service
 * Generates PDF payslips for employees with detailed earnings and deductions
 */

import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface PayslipData {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  position: string;
  pay_period: string;
  payment_date: string;
  basic_salary: number;
  allowances: number;
  overtime_pay: number;
  bonus: number;
  gross_salary: number;
  social_security: number;
  health_insurance: number;
  loan_deduction: number;
  advance_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  bank_name?: string;
  account_number?: string;
}

export class PayslipGenerator {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate single payslip PDF
   */
  async generatePayslip(payrollId: string): Promise<Buffer> {
    // Fetch payroll data with employee details
    const payslipData = await this.fetchPayrollData(payrollId);

    // Generate PDF
    return this.createPayslipPDF(payslipData);
  }

  /**
   * Generate bulk payslips for a period
   */
  async generateBulkPayslips(periodId: string): Promise<Array<{
    employee_id: string;
    employee_name: string;
    employee_number: string;
    pdf_buffer: Buffer;
  }>> {
    // Fetch all payroll records for the period
    const { data: payrollRecords, error } = await this.supabase
      .from('payroll_transactions')
      .select(`
        id,
        employee_id,
        employees(
          employee_number,
          first_name,
          last_name,
          position,
          departments(name),
          metadata
        )
      `)
      .eq('period_id', periodId)
      .eq('status', 'approved');

    if (error) {
      throw new Error(`Failed to fetch payroll records: ${error.message}`);
    }

    if (!payrollRecords || payrollRecords.length === 0) {
      throw new Error('No approved payroll records found for this period');
    }

    // Generate payslip for each employee
    const payslips = await Promise.all(
      payrollRecords.map(async (record: any) => {
        const payslipData = await this.fetchPayrollData(record.id);
        const pdfBuffer = await this.createPayslipPDF(payslipData);

        return {
          employee_id: record.employee_id,
          employee_name: `${record.employees.first_name} ${record.employees.last_name}`,
          employee_number: record.employees.employee_number,
          pdf_buffer: pdfBuffer,
        };
      })
    );

    return payslips;
  }

  /**
   * Fetch payroll data from database
   */
  private async fetchPayrollData(payrollId: string): Promise<PayslipData> {
    const { data: payroll, error } = await this.supabase
      .from('payroll_transactions')
      .select(`
        *,
        employees(
          employee_number,
          first_name,
          last_name,
          position,
          departments(name),
          metadata
        )
      `)
      .eq('id', payrollId)
      .single();

    if (error || !payroll) {
      throw new Error(`Payroll record not found: ${payrollId}`);
    }

    const employee = payroll.employees;
    const metadata = payroll.metadata || {};

    // Extract deductions from metadata
    const deductionsBreakdown = metadata.deductions_breakdown || {};

    return {
      employee_id: payroll.employee_id,
      employee_number: employee.employee_number,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      department: employee.departments?.name || 'N/A',
      position: employee.position || 'N/A',
      pay_period: this.formatPayPeriod(payroll.created_at),
      payment_date: new Date(payroll.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      basic_salary: payroll.basic_salary || 0,
      allowances: payroll.allowances || 0,
      overtime_pay: payroll.overtime_pay || 0,
      bonus: payroll.bonus || 0,
      gross_salary: payroll.gross_salary || 0,
      social_security: deductionsBreakdown.social_security || 0,
      health_insurance: deductionsBreakdown.health_insurance || 0,
      loan_deduction: deductionsBreakdown.loan_deduction || 0,
      advance_deduction: deductionsBreakdown.advance_deduction || 0,
      other_deductions: deductionsBreakdown.other_deductions || 0,
      total_deductions: payroll.deductions || 0,
      net_salary: payroll.net_salary || 0,
      bank_name: employee.metadata?.bank_name,
      account_number: employee.metadata?.account_number,
    };
  }

  /**
   * Create PDF document for payslip
   */
  private async createPayslipPDF(data: PayslipData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Hospital Header
      this.addHeader(doc);

      // Payslip Title
      doc.moveDown(2);
      doc.fontSize(18).font('Helvetica-Bold').text('SALARY SLIP', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(data.pay_period, { align: 'center' });
      doc.moveDown(2);

      // Employee Information
      this.addEmployeeInfo(doc, data);

      // Earnings Table
      doc.moveDown(1);
      this.addEarningsTable(doc, data);

      // Deductions Table
      doc.moveDown(1);
      this.addDeductionsTable(doc, data);

      // Net Salary
      doc.moveDown(1);
      this.addNetSalary(doc, data);

      // Bank Details (if available)
      if (data.bank_name && data.account_number) {
        doc.moveDown(1);
        this.addBankDetails(doc, data);
      }

      // Footer
      doc.moveDown(2);
      this.addFooter(doc);

      doc.end();
    });
  }

  /**
   * Add hospital header to PDF
   */
  private addHeader(doc: PDFKit.PDFDocument): void {
    doc.fontSize(20).font('Helvetica-Bold').text('Tibbna Hospital', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('HR Management System', { align: 'center' });
    doc.fontSize(9).text('Riyadh, Saudi Arabia', { align: 'center' });
    doc.fontSize(9).text('Tel: +966 11 234 5678 | Email: hr@tibbna.sa', { align: 'center' });
    
    // Draw line
    doc.moveDown(0.5);
    doc.strokeColor('#0066CC')
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(doc.page.width - 50, doc.y)
       .stroke();
  }

  /**
   * Add employee information section
   */
  private addEmployeeInfo(doc: PDFKit.PDFDocument, data: PayslipData): void {
    const startY = doc.y;
    const leftX = 50;
    const rightX = 300;

    doc.fontSize(10).font('Helvetica-Bold');

    // Left column
    doc.text('Employee Number:', leftX, startY);
    doc.font('Helvetica').text(data.employee_number, leftX + 120, startY);

    doc.font('Helvetica-Bold').text('Employee Name:', leftX, startY + 20);
    doc.font('Helvetica').text(data.employee_name, leftX + 120, startY + 20);

    // Right column
    doc.font('Helvetica-Bold').text('Department:', rightX, startY);
    doc.font('Helvetica').text(data.department, rightX + 80, startY);

    doc.font('Helvetica-Bold').text('Position:', rightX, startY + 20);
    doc.font('Helvetica').text(data.position, rightX + 80, startY + 20);

    doc.font('Helvetica-Bold').text('Payment Date:', rightX, startY + 40);
    doc.font('Helvetica').text(data.payment_date, rightX + 80, startY + 40);

    doc.y = startY + 60;
  }

  /**
   * Add earnings table
   */
  private addEarningsTable(doc: PDFKit.PDFDocument, data: PayslipData): void {
    const tableTop = doc.y;
    const col1X = 50;
    const col2X = 400;
    const rowHeight = 25;

    // Table header
    doc.fontSize(12).font('Helvetica-Bold');
    doc.fillColor('#0066CC').text('EARNINGS', col1X, tableTop);
    doc.fillColor('#000000');

    // Draw header line
    doc.strokeColor('#0066CC')
       .lineWidth(1)
       .moveTo(col1X, tableTop + 15)
       .lineTo(doc.page.width - 50, tableTop + 15)
       .stroke();

    let currentY = tableTop + 25;

    // Earnings items
    const earnings = [
      { label: 'Basic Salary', amount: data.basic_salary },
      { label: 'Allowances', amount: data.allowances },
      { label: 'Overtime Pay', amount: data.overtime_pay },
      { label: 'Bonus', amount: data.bonus },
    ];

    doc.fontSize(10).font('Helvetica');

    earnings.forEach((item) => {
      doc.text(item.label, col1X, currentY);
      doc.text(this.formatCurrency(item.amount), col2X, currentY, { align: 'right' });
      currentY += rowHeight;
    });

    // Gross total
    doc.strokeColor('#CCCCCC')
       .lineWidth(0.5)
       .moveTo(col1X, currentY - 5)
       .lineTo(doc.page.width - 50, currentY - 5)
       .stroke();

    doc.fontSize(11).font('Helvetica-Bold');
    doc.fillColor('#0066CC').text('GROSS SALARY', col1X, currentY);
    doc.text(this.formatCurrency(data.gross_salary), col2X, currentY, { align: 'right' });
    doc.fillColor('#000000');

    doc.y = currentY + rowHeight;
  }

  /**
   * Add deductions table
   */
  private addDeductionsTable(doc: PDFKit.PDFDocument, data: PayslipData): void {
    const tableTop = doc.y;
    const col1X = 50;
    const col2X = 400;
    const rowHeight = 25;

    // Table header
    doc.fontSize(12).font('Helvetica-Bold');
    doc.fillColor('#CC0000').text('DEDUCTIONS', col1X, tableTop);
    doc.fillColor('#000000');

    // Draw header line
    doc.strokeColor('#CC0000')
       .lineWidth(1)
       .moveTo(col1X, tableTop + 15)
       .lineTo(doc.page.width - 50, tableTop + 15)
       .stroke();

    let currentY = tableTop + 25;

    // Deductions items
    const deductions = [
      { label: 'Social Security (9%)', amount: data.social_security },
      { label: 'Health Insurance', amount: data.health_insurance },
      { label: 'Loan Deduction', amount: data.loan_deduction },
      { label: 'Advance Deduction', amount: data.advance_deduction },
      { label: 'Other Deductions', amount: data.other_deductions },
    ];

    doc.fontSize(10).font('Helvetica');

    deductions.forEach((item) => {
      if (item.amount > 0) {
        doc.text(item.label, col1X, currentY);
        doc.text(this.formatCurrency(item.amount), col2X, currentY, { align: 'right' });
        currentY += rowHeight;
      }
    });

    // Total deductions
    doc.strokeColor('#CCCCCC')
       .lineWidth(0.5)
       .moveTo(col1X, currentY - 5)
       .lineTo(doc.page.width - 50, currentY - 5)
       .stroke();

    doc.fontSize(11).font('Helvetica-Bold');
    doc.fillColor('#CC0000').text('TOTAL DEDUCTIONS', col1X, currentY);
    doc.text(this.formatCurrency(data.total_deductions), col2X, currentY, { align: 'right' });
    doc.fillColor('#000000');

    doc.y = currentY + rowHeight;
  }

  /**
   * Add net salary section
   */
  private addNetSalary(doc: PDFKit.PDFDocument, data: PayslipData): void {
    const boxTop = doc.y;
    const boxHeight = 50;
    const boxWidth = doc.page.width - 100;

    // Draw box
    doc.rect(50, boxTop, boxWidth, boxHeight)
       .fillAndStroke('#E8F4F8', '#0066CC');

    // Net salary text
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000');
    doc.text('NET SALARY (SAR)', 70, boxTop + 10);
    
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#0066CC');
    doc.text(
      this.formatCurrency(data.net_salary),
      70,
      boxTop + 28,
      { width: boxWidth - 40, align: 'right' }
    );

    doc.fillColor('#000000');
    doc.y = boxTop + boxHeight + 10;
  }

  /**
   * Add bank details section
   */
  private addBankDetails(doc: PDFKit.PDFDocument, data: PayslipData): void {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Payment Method: Bank Transfer', 50, doc.y);
    
    doc.font('Helvetica');
    doc.text(`Bank: ${data.bank_name}`, 50, doc.y + 15);
    doc.text(`Account: ${this.maskAccountNumber(data.account_number!)}`, 50, doc.y + 30);
  }

  /**
   * Add footer
   */
  private addFooter(doc: PDFKit.PDFDocument): void {
    const footerY = doc.page.height - 100;

    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666');
    doc.text(
      'This is a computer-generated payslip and does not require a signature.',
      50,
      footerY,
      { align: 'center', width: doc.page.width - 100 }
    );

    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      50,
      footerY + 15,
      { align: 'center', width: doc.page.width - 100 }
    );

    doc.fillColor('#000000');
  }

  /**
   * Format currency (SAR)
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format pay period
   */
  private formatPayPeriod(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  }

  /**
   * Mask account number for security
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    const lastFour = accountNumber.slice(-4);
    const masked = '*'.repeat(accountNumber.length - 4);
    return masked + lastFour;
  }
}

export const payslipGenerator = new PayslipGenerator();
