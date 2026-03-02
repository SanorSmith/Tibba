/**
 * Bank File Generator Service
 * Generates bank transfer files in multiple formats (CSV, XML, Fixed-width)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type BankFileFormat = 'csv' | 'xml' | 'fixed-width';

interface EmployeeBankDetails {
  employee_number: string;
  employee_name: string;
  account_number: string;
  bank_name: string;
  bank_code: string;
  iban: string;
  net_salary: number;
  payment_reference: string;
}

interface BankFileMetadata {
  total_records: number;
  total_amount: number;
  generation_date: string;
  payment_date: string;
  company_name: string;
  company_account: string;
}

export class BankFileGenerator {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate bank transfer file in specified format
   */
  async generateBankTransferFile(
    periodId: string,
    format: BankFileFormat = 'csv'
  ): Promise<{ content: string; filename: string; metadata: BankFileMetadata }> {
    // Fetch approved payroll records with bank details
    const { employees, metadata } = await this.fetchPayrollWithBankDetails(periodId);

    if (employees.length === 0) {
      throw new Error('No approved payroll records with bank details found');
    }

    // Generate file based on format
    let content: string;
    let filename: string;

    switch (format) {
      case 'csv':
        content = this.generateCSVFormat(employees, metadata);
        filename = `bank_transfer_${periodId}_${Date.now()}.csv`;
        break;
      case 'xml':
        content = this.generateXMLFormat(employees, metadata);
        filename = `bank_transfer_${periodId}_${Date.now()}.xml`;
        break;
      case 'fixed-width':
        content = this.generateFixedWidthFormat(employees, metadata);
        filename = `bank_transfer_${periodId}_${Date.now()}.txt`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return { content, filename, metadata };
  }

  /**
   * Fetch payroll records with employee bank details
   */
  private async fetchPayrollWithBankDetails(periodId: string): Promise<{
    employees: EmployeeBankDetails[];
    metadata: BankFileMetadata;
  }> {
    const { data: payrollRecords, error } = await this.supabase
      .from('payroll_transactions')
      .select(`
        id,
        employee_id,
        net_salary,
        created_at,
        employees(
          employee_number,
          first_name,
          last_name,
          metadata
        )
      `)
      .eq('period_id', periodId)
      .eq('status', 'approved')
      .gt('net_salary', 0);

    if (error) {
      throw new Error(`Failed to fetch payroll records: ${error.message}`);
    }

    if (!payrollRecords || payrollRecords.length === 0) {
      throw new Error('No approved payroll records found');
    }

    // Extract employee bank details
    const employees: EmployeeBankDetails[] = payrollRecords
      .filter((record: any) => {
        const bankDetails = record.employees?.metadata?.bank_details;
        return bankDetails && bankDetails.account_number && bankDetails.bank_name;
      })
      .map((record: any) => {
        const emp = record.employees;
        const bankDetails = emp.metadata.bank_details || {};

        return {
          employee_number: emp.employee_number,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          account_number: bankDetails.account_number || '',
          bank_name: bankDetails.bank_name || '',
          bank_code: bankDetails.bank_code || '',
          iban: bankDetails.iban || '',
          net_salary: record.net_salary,
          payment_reference: `PAY-${emp.employee_number}-${periodId.substring(0, 8)}`,
        };
      });

    // Calculate metadata
    const totalAmount = employees.reduce((sum, emp) => sum + emp.net_salary, 0);
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() + 2); // Payment in 2 days

    const metadata: BankFileMetadata = {
      total_records: employees.length,
      total_amount: totalAmount,
      generation_date: new Date().toISOString().split('T')[0],
      payment_date: paymentDate.toISOString().split('T')[0],
      company_name: 'Tibbna Hospital',
      company_account: 'SA0380000000608010167519', // Example IBAN
    };

    return { employees, metadata };
  }

  /**
   * Generate CSV format bank file
   */
  private generateCSVFormat(
    employees: EmployeeBankDetails[],
    metadata: BankFileMetadata
  ): string {
    const lines: string[] = [];

    // Header row
    lines.push('Employee Number,Employee Name,Bank Name,Bank Code,Account Number,IBAN,Amount,Payment Reference,Payment Date');

    // Data rows
    employees.forEach((emp) => {
      lines.push([
        emp.employee_number,
        `"${emp.employee_name}"`,
        `"${emp.bank_name}"`,
        emp.bank_code,
        emp.account_number,
        emp.iban,
        emp.net_salary.toFixed(2),
        emp.payment_reference,
        metadata.payment_date,
      ].join(','));
    });

    // Summary row
    lines.push('');
    lines.push(`TOTAL RECORDS,${metadata.total_records}`);
    lines.push(`TOTAL AMOUNT,${metadata.total_amount.toFixed(2)}`);
    lines.push(`GENERATION DATE,${metadata.generation_date}`);
    lines.push(`COMPANY NAME,"${metadata.company_name}"`);
    lines.push(`COMPANY ACCOUNT,${metadata.company_account}`);

    return lines.join('\n');
  }

  /**
   * Generate XML format bank file (SEPA/ISO 20022 style)
   */
  private generateXMLFormat(
    employees: EmployeeBankDetails[],
    metadata: BankFileMetadata
  ): string {
    const messageId = `MSG-${Date.now()}`;
    const creationDateTime = new Date().toISOString();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">\n';
    xml += '  <CstmrCdtTrfInitn>\n';

    // Group Header
    xml += '    <GrpHdr>\n';
    xml += `      <MsgId>${messageId}</MsgId>\n`;
    xml += `      <CreDtTm>${creationDateTime}</CreDtTm>\n`;
    xml += `      <NbOfTxs>${metadata.total_records}</NbOfTxs>\n`;
    xml += `      <CtrlSum>${metadata.total_amount.toFixed(2)}</CtrlSum>\n`;
    xml += '      <InitgPty>\n';
    xml += `        <Nm>${this.escapeXml(metadata.company_name)}</Nm>\n`;
    xml += '      </InitgPty>\n';
    xml += '    </GrpHdr>\n';

    // Payment Information
    xml += '    <PmtInf>\n';
    xml += `      <PmtInfId>PMT-${Date.now()}</PmtInfId>\n`;
    xml += '      <PmtMtd>TRF</PmtMtd>\n';
    xml += `      <NbOfTxs>${metadata.total_records}</NbOfTxs>\n`;
    xml += `      <CtrlSum>${metadata.total_amount.toFixed(2)}</CtrlSum>\n`;
    xml += '      <PmtTpInf>\n';
    xml += '        <SvcLvl>\n';
    xml += '          <Cd>NORM</Cd>\n';
    xml += '        </SvcLvl>\n';
    xml += '      </PmtTpInf>\n';
    xml += `      <ReqdExctnDt>${metadata.payment_date}</ReqdExctnDt>\n`;
    xml += '      <Dbtr>\n';
    xml += `        <Nm>${this.escapeXml(metadata.company_name)}</Nm>\n`;
    xml += '      </Dbtr>\n';
    xml += '      <DbtrAcct>\n';
    xml += '        <Id>\n';
    xml += `          <IBAN>${metadata.company_account}</IBAN>\n`;
    xml += '        </Id>\n';
    xml += '      </DbtrAcct>\n';

    // Credit Transfer Transactions
    employees.forEach((emp, index) => {
      xml += '      <CdtTrfTxInf>\n';
      xml += '        <PmtId>\n';
      xml += `          <EndToEndId>${emp.payment_reference}</EndToEndId>\n`;
      xml += '        </PmtId>\n';
      xml += '        <Amt>\n';
      xml += `          <InstdAmt Ccy="SAR">${emp.net_salary.toFixed(2)}</InstdAmt>\n`;
      xml += '        </Amt>\n';
      xml += '        <Cdtr>\n';
      xml += `          <Nm>${this.escapeXml(emp.employee_name)}</Nm>\n`;
      xml += '        </Cdtr>\n';
      xml += '        <CdtrAcct>\n';
      xml += '          <Id>\n';
      if (emp.iban) {
        xml += `            <IBAN>${emp.iban}</IBAN>\n`;
      } else {
        xml += '            <Othr>\n';
        xml += `              <Id>${emp.account_number}</Id>\n`;
        xml += '            </Othr>\n';
      }
      xml += '          </Id>\n';
      xml += '        </CdtrAcct>\n';
      xml += '        <RmtInf>\n';
      xml += `          <Ustrd>Salary Payment - ${emp.employee_number}</Ustrd>\n`;
      xml += '        </RmtInf>\n';
      xml += '      </CdtTrfTxInf>\n';
    });

    xml += '    </PmtInf>\n';
    xml += '  </CstmrCdtTrfInitn>\n';
    xml += '</Document>';

    return xml;
  }

  /**
   * Generate Fixed-Width format bank file
   */
  private generateFixedWidthFormat(
    employees: EmployeeBankDetails[],
    metadata: BankFileMetadata
  ): string {
    const lines: string[] = [];

    // Header record (Type 1)
    const headerRecord = [
      '1',                                              // Record type
      this.padRight(metadata.company_name, 35),        // Company name
      this.padRight(metadata.company_account, 34),     // Company account
      metadata.generation_date.replace(/-/g, ''),      // Generation date (YYYYMMDD)
      metadata.payment_date.replace(/-/g, ''),         // Payment date (YYYYMMDD)
      this.padLeft(metadata.total_records.toString(), 6, '0'),  // Total records
      this.padLeft((metadata.total_amount * 100).toFixed(0), 15, '0'),  // Total amount (in fils/cents)
      this.padRight('', 50),                           // Filler
    ].join('');
    lines.push(headerRecord);

    // Detail records (Type 2)
    employees.forEach((emp, index) => {
      const detailRecord = [
        '2',                                           // Record type
        this.padLeft((index + 1).toString(), 6, '0'), // Sequence number
        this.padRight(emp.employee_number, 20),       // Employee number
        this.padRight(emp.employee_name, 35),         // Employee name
        this.padRight(emp.bank_code, 10),             // Bank code
        this.padRight(emp.account_number, 34),        // Account number
        this.padLeft((emp.net_salary * 100).toFixed(0), 15, '0'),  // Amount (in fils/cents)
        this.padRight(emp.payment_reference, 35),     // Payment reference
        this.padRight('SAL', 10),                     // Payment type
        this.padRight('', 35),                        // Filler
      ].join('');
      lines.push(detailRecord);
    });

    // Trailer record (Type 9)
    const trailerRecord = [
      '9',                                             // Record type
      this.padLeft(metadata.total_records.toString(), 6, '0'),  // Total records
      this.padLeft((metadata.total_amount * 100).toFixed(0), 15, '0'),  // Total amount
      this.padRight('', 179),                          // Filler
    ].join('');
    lines.push(trailerRecord);

    return lines.join('\n');
  }

  /**
   * Validate bank file before generation
   */
  async validateBankFile(periodId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const { employees } = await this.fetchPayrollWithBankDetails(periodId);

      if (employees.length === 0) {
        errors.push('No employees with bank details found');
      }

      // Validate each employee's bank details
      employees.forEach((emp) => {
        if (!emp.account_number) {
          errors.push(`${emp.employee_name}: Missing account number`);
        }
        if (!emp.bank_name) {
          errors.push(`${emp.employee_name}: Missing bank name`);
        }
        if (!emp.iban && !emp.account_number) {
          errors.push(`${emp.employee_name}: Missing both IBAN and account number`);
        }
        if (emp.net_salary <= 0) {
          warnings.push(`${emp.employee_name}: Net salary is zero or negative`);
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      errors.push(error.message);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Generate bank file summary report
   */
  async generateSummaryReport(periodId: string): Promise<{
    total_employees: number;
    total_amount: number;
    by_bank: Array<{ bank_name: string; count: number; amount: number }>;
    payment_date: string;
  }> {
    const { employees, metadata } = await this.fetchPayrollWithBankDetails(periodId);

    // Group by bank
    const bankGroups = new Map<string, { count: number; amount: number }>();

    employees.forEach((emp) => {
      const bankName = emp.bank_name || 'Unknown';
      if (!bankGroups.has(bankName)) {
        bankGroups.set(bankName, { count: 0, amount: 0 });
      }
      const group = bankGroups.get(bankName)!;
      group.count += 1;
      group.amount += emp.net_salary;
    });

    const byBank = Array.from(bankGroups.entries()).map(([bank_name, data]) => ({
      bank_name,
      count: data.count,
      amount: data.amount,
    }));

    return {
      total_employees: employees.length,
      total_amount: metadata.total_amount,
      by_bank: byBank,
      payment_date: metadata.payment_date,
    };
  }

  /**
   * Helper: Pad string to the right
   */
  private padRight(str: string, length: number, char: string = ' '): string {
    return str.substring(0, length).padEnd(length, char);
  }

  /**
   * Helper: Pad string to the left
   */
  private padLeft(str: string, length: number, char: string = ' '): string {
    return str.substring(0, length).padStart(length, char);
  }

  /**
   * Helper: Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const bankFileGenerator = new BankFileGenerator();
