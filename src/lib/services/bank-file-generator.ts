/**
 * Bank File Generator Service
 * Generates bank transfer files in multiple formats (WPS, SWIFT MT101, Local CSV)
 */

import { Pool } from 'pg';

export interface BankTransferRecord {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  account_number: string;
  iban: string;
  bank_name: string;
  bank_code: string;
  branch_code: string;
  amount: number;
  currency: string;
}

export interface BankFileOptions {
  format: 'WPS' | 'SWIFT' | 'LOCAL_CSV';
  company_name?: string;
  company_account?: string;
  company_iban?: string;
  bank_code?: string;
  value_date?: string;
}

export class BankFileGenerator {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate bank file for a payroll period
   */
  async generateBankFile(
    periodId: string,
    options: BankFileOptions
  ): Promise<{ content: string; filename: string; batch_number: string }> {
    // Get approved payroll transactions
    const transactions = await this.getApprovedTransactions(periodId);

    if (transactions.length === 0) {
      throw new Error('No approved transactions found for this period');
    }

    // Generate batch number
    const batchNumber = this.generateBatchNumber();

    // Generate file based on format
    let content: string;
    let filename: string;

    switch (options.format) {
      case 'WPS':
        content = this.generateWPSFile(transactions, options, batchNumber);
        filename = `WPS_${batchNumber}_${new Date().toISOString().split('T')[0]}.txt`;
        break;

      case 'SWIFT':
        content = this.generateSWIFTFile(transactions, options, batchNumber);
        filename = `SWIFT_${batchNumber}_${new Date().toISOString().split('T')[0]}.xml`;
        break;

      case 'LOCAL_CSV':
        content = this.generateLocalCSV(transactions, options, batchNumber);
        filename = `PAYROLL_${batchNumber}_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      default:
        throw new Error('Invalid file format');
    }

    // Save bank transfer record
    await this.saveBankTransfer(periodId, batchNumber, options.format, filename, transactions);

    return { content, filename, batch_number: batchNumber };
  }

  /**
   * Get approved payroll transactions with bank details
   */
  private async getApprovedTransactions(periodId: string): Promise<BankTransferRecord[]> {
    const result = await this.pool.query(`
      SELECT 
        pt.employee_id,
        pt.employee_name,
        pt.employee_number,
        pt.net_salary as amount,
        pt.currency,
        s.email as account_number,
        s.email as iban,
        'Default Bank' as bank_name,
        '001' as bank_code,
        '001' as branch_code
      FROM payroll_transactions pt
      LEFT JOIN staff s ON pt.employee_id = s.staffid
      WHERE pt.period_id = $1
        AND pt.status = 'APPROVED'
        AND pt.net_salary > 0
      ORDER BY pt.employee_name
    `, [periodId]);

    return result.rows;
  }

  /**
   * Generate WPS (Wage Protection System) file format
   * Used in UAE and some GCC countries
   */
  private generateWPSFile(
    transactions: BankTransferRecord[],
    options: BankFileOptions,
    batchNumber: string
  ): string {
    const lines: string[] = [];
    const valueDate = options.value_date || new Date().toISOString().split('T')[0].replace(/-/g, '');

    // Header Record (SCR)
    lines.push([
      'SCR',
      options.company_account?.padEnd(14) || '00000000000000',
      options.company_name?.substring(0, 140).padEnd(140) || 'COMPANY NAME'.padEnd(140),
      batchNumber.padStart(9, '0'),
      valueDate,
      transactions.length.toString().padStart(8, '0'),
      this.formatAmount(transactions.reduce((sum, t) => sum + t.amount, 0)).padStart(15, '0'),
      ''.padEnd(14)
    ].join(''));

    // Detail Records (EDR)
    transactions.forEach((t, index) => {
      lines.push([
        'EDR',
        (index + 1).toString().padStart(9, '0'),
        t.account_number?.substring(0, 14).padEnd(14) || '00000000000000',
        t.employee_name.substring(0, 140).padEnd(140),
        t.bank_code?.padEnd(11) || '001'.padEnd(11),
        this.formatAmount(t.amount).padStart(15, '0'),
        ''.padEnd(14)
      ].join(''));
    });

    // Trailer Record (SCT)
    lines.push([
      'SCT',
      batchNumber.padStart(9, '0'),
      transactions.length.toString().padStart(8, '0'),
      this.formatAmount(transactions.reduce((sum, t) => sum + t.amount, 0)).padStart(15, '0'),
      ''.padEnd(14)
    ].join(''));

    return lines.join('\n');
  }

  /**
   * Generate SWIFT MT101 file format
   * International standard for bank transfers
   */
  private generateSWIFTFile(
    transactions: BankTransferRecord[],
    options: BankFileOptions,
    batchNumber: string
  ): string {
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const valueDate = options.value_date || new Date().toISOString().split('T')[0].replace(/-/g, '');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">\n';
    xml += '  <CstmrCdtTrfInitn>\n';
    
    // Group Header
    xml += '    <GrpHdr>\n';
    xml += `      <MsgId>${batchNumber}</MsgId>\n`;
    xml += `      <CreDtTm>${new Date().toISOString()}</CreDtTm>\n`;
    xml += `      <NbOfTxs>${transactions.length}</NbOfTxs>\n`;
    xml += `      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>\n`;
    xml += '      <InitgPty>\n';
    xml += `        <Nm>${this.escapeXml(options.company_name || 'Company Name')}</Nm>\n`;
    xml += '      </InitgPty>\n';
    xml += '    </GrpHdr>\n';

    // Payment Information
    xml += '    <PmtInf>\n';
    xml += `      <PmtInfId>${batchNumber}</PmtInfId>\n`;
    xml += '      <PmtMtd>TRF</PmtMtd>\n';
    xml += `      <NbOfTxs>${transactions.length}</NbOfTxs>\n`;
    xml += `      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>\n`;
    xml += `      <ReqdExctnDt>${valueDate}</ReqdExctnDt>\n`;
    xml += '      <Dbtr>\n';
    xml += `        <Nm>${this.escapeXml(options.company_name || 'Company Name')}</Nm>\n`;
    xml += '      </Dbtr>\n';
    xml += '      <DbtrAcct>\n';
    xml += '        <Id>\n';
    xml += `          <IBAN>${options.company_iban || 'IBAN000000000000'}</IBAN>\n`;
    xml += '        </Id>\n';
    xml += '      </DbtrAcct>\n';

    // Credit Transfer Transactions
    transactions.forEach((t, index) => {
      xml += '      <CdtTrfTxInf>\n';
      xml += '        <PmtId>\n';
      xml += `          <EndToEndId>${batchNumber}-${index + 1}</EndToEndId>\n`;
      xml += '        </PmtId>\n';
      xml += '        <Amt>\n';
      xml += `          <InstdAmt Ccy="${t.currency}">${t.amount.toFixed(2)}</InstdAmt>\n`;
      xml += '        </Amt>\n';
      xml += '        <Cdtr>\n';
      xml += `          <Nm>${this.escapeXml(t.employee_name)}</Nm>\n`;
      xml += '        </Cdtr>\n';
      xml += '        <CdtrAcct>\n';
      xml += '          <Id>\n';
      xml += `            <IBAN>${t.iban || 'IBAN000000000000'}</IBAN>\n`;
      xml += '          </Id>\n';
      xml += '        </CdtrAcct>\n';
      xml += '        <RmtInf>\n';
      xml += `          <Ustrd>Salary Payment - ${t.employee_number}</Ustrd>\n`;
      xml += '        </RmtInf>\n';
      xml += '      </CdtTrfTxInf>\n';
    });

    xml += '    </PmtInf>\n';
    xml += '  </CstmrCdtTrfInitn>\n';
    xml += '</Document>';

    return xml;
  }

  /**
   * Generate Local CSV format
   * Simple CSV format for local banks
   */
  private generateLocalCSV(
    transactions: BankTransferRecord[],
    options: BankFileOptions,
    batchNumber: string
  ): string {
    const lines: string[] = [];

    // Header
    lines.push([
      'Employee Number',
      'Employee Name',
      'Account Number',
      'IBAN',
      'Bank Name',
      'Bank Code',
      'Branch Code',
      'Amount',
      'Currency',
      'Batch Number',
      'Value Date'
    ].join(','));

    // Data rows
    const valueDate = options.value_date || new Date().toISOString().split('T')[0];
    transactions.forEach(t => {
      lines.push([
        t.employee_number,
        `"${t.employee_name}"`,
        t.account_number || '',
        t.iban || '',
        `"${t.bank_name}"`,
        t.bank_code || '',
        t.branch_code || '',
        t.amount.toFixed(2),
        t.currency,
        batchNumber,
        valueDate
      ].join(','));
    });

    // Summary row
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    lines.push([
      '',
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      totalAmount.toFixed(2),
      transactions[0]?.currency || 'USD',
      '',
      ''
    ].join(','));

    return lines.join('\n');
  }

  /**
   * Save bank transfer record to database
   */
  private async saveBankTransfer(
    periodId: string,
    batchNumber: string,
    format: string,
    filename: string,
    transactions: BankTransferRecord[]
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Insert bank transfer batch
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const currency = transactions[0]?.currency || 'USD';

      const transferResult = await client.query(`
        INSERT INTO bank_transfers (
          period_id, batch_number, batch_date, file_format,
          file_name, total_amount, total_employees, currency,
          status, file_generated_at
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, 'GENERATED', NOW())
        RETURNING id
      `, [periodId, batchNumber, format, filename, totalAmount, transactions.length, currency]);

      const transferId = transferResult.rows[0].id;

      // Insert bank transfer details
      for (const t of transactions) {
        // Get payroll transaction ID
        const ptResult = await client.query(`
          SELECT id FROM payroll_transactions
          WHERE period_id = $1 AND employee_id = $2
        `, [periodId, t.employee_id]);

        if (ptResult.rows.length > 0) {
          await client.query(`
            INSERT INTO bank_transfer_details (
              bank_transfer_id, payroll_transaction_id, employee_id,
              employee_name, employee_number, account_number, iban,
              bank_name, bank_code, branch_code, amount, currency, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING')
          `, [
            transferId, ptResult.rows[0].id, t.employee_id, t.employee_name,
            t.employee_number, t.account_number, t.iban, t.bank_name,
            t.bank_code, t.branch_code, t.amount, t.currency
          ]);
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique batch number
   */
  private generateBatchNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}${random}`;
  }

  /**
   * Format amount for WPS (remove decimal point, multiply by 100)
   */
  private formatAmount(amount: number): string {
    return Math.round(amount * 100).toString();
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export function createBankFileGenerator(pool: Pool): BankFileGenerator {
  return new BankFileGenerator(pool);
}
