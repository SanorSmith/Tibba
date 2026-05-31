/**
 * GL Auto-Posting Helper
 * Creates balanced journal entries in fin_journal_entries + fin_journal_lines
 * whenever an invoice is paid or a payment is recorded.
 *
 * ── Real fin_accounts column names (from accounts API query) ──────────
 *   accountid        PK
 *   accountcode      account number / code  (e.g. "1101", "4100")
 *   accountname      display name (may be Arabic)
 *   accounttype      ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
 *   isgroupaccount   true = parent/group, false = posting leaf
 *   isactive         boolean
 *   normalbalance    DEBIT | CREDIT
 *   workspaceid      workspace FK
 *
 * ── fin_account_balances columns ─────────────────────────────────────
 *   accountid        FK
 *   workspaceid      FK
 *   perioddebit      summed debit for the period
 *   periodcredit     summed credit for the period
 *   (+ any date/period columns)
 *
 * ── fin_journal_entries columns ───────────────────────────────────────
 *   journalid, workspaceid, journalnumber, journaldate,
 *   sourcetype, description, totaldebit, totalcredit, status
 *
 * ── fin_journal_lines columns ─────────────────────────────────────────
 *   journalid, accountid, debit, credit, memo
 */

import { PoolClient } from 'pg';

const WORKSPACE_ID = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';

/** In-process cache so we only query fin_accounts once per server restart */
const _cache: Record<string, string | null> = {};

/**
 * Find a posting leaf account by type + optional account-code prefix.
 * Falls back to the first leaf account of that type if no prefix match found.
 * Returns the real `accountid` UUID.
 */
async function findByType(
  client: PoolClient,
  accountType: string,
  codePrefix?: string
): Promise<string | null> {
  const key = `${accountType}:${codePrefix ?? '*'}`;
  if (key in _cache) return _cache[key];

  try {
    // 1. Try with code prefix
    if (codePrefix) {
      const r = await client.query(
        `SELECT accountid FROM fin_accounts
         WHERE accounttype = $1
           AND accountcode LIKE $2
           AND isgroupaccount = false
           AND isactive = true
         ORDER BY accountcode ASC
         LIMIT 1`,
        [accountType, `${codePrefix}%`]
      );
      if (r.rows.length > 0) {
        _cache[key] = r.rows[0].accountid;
        return r.rows[0].accountid;
      }
    }

    // 2. Fallback: any posting leaf of this type
    const r2 = await client.query(
      `SELECT accountid FROM fin_accounts
       WHERE accounttype = $1
         AND isgroupaccount = false
         AND isactive = true
       ORDER BY accountcode ASC
       LIMIT 1`,
      [accountType]
    );
    const id = r2.rows[0]?.accountid ?? null;
    _cache[key] = id;
    return id;
  } catch (err) {
    console.error(`[GL] findByType(${accountType}, ${codePrefix}) error:`, err);
    return null;
  }
}

/**
 * Find a posting account by type + keyword search in accountname.
 * Used as a secondary lookup when code-prefix fails.
 */
async function findByName(
  client: PoolClient,
  accountType: string,
  keyword: string
): Promise<string | null> {
  const key = `name:${accountType}:${keyword}`;
  if (key in _cache) return _cache[key];
  try {
    const r = await client.query(
      `SELECT accountid FROM fin_accounts
       WHERE accounttype = $1
         AND LOWER(accountname) LIKE $2
         AND isgroupaccount = false
         AND isactive = true
       ORDER BY accountcode ASC
       LIMIT 1`,
      [accountType, `%${keyword.toLowerCase()}%`]
    );
    const id = r.rows[0]?.accountid ?? null;
    _cache[key] = id;
    return id;
  } catch {
    return null;
  }
}

// ── Semantic account resolvers ────────────────────────────────────────────
// Standard Iraqi / Arab chart of accounts code prefixes:
//   11xx  = Cash & Bank (النقدية والبنوك)
//   12xx  = Trade Receivables (الذمم المدينة)
//   13xx  = Insurance & Other Receivables
//   21xx  = Trade Payables (الذمم الدائنة)
//   4xxx  = Revenue (الإيرادات)
//   5xxx  = Cost of Revenue
//   6xxx  = Operating Expenses

async function getCashAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByType(client, 'ASSET', '11') ??
    await findByType(client, 'ASSET', '10') ??
    await findByName(client, 'ASSET', 'cash') ??
    await findByName(client, 'ASSET', 'bank') ??
    await findByName(client, 'ASSET', 'نقد') ??
    await findByName(client, 'ASSET', 'بنك') ??
    await findByType(client, 'ASSET')           // last resort: any asset
  );
}

async function getARAccount(client: PoolClient): Promise<string | null> {
  // Receivables are at 112x in this chart of accounts, not 12x (which is Equipment)
  return (
    await findByName(client, 'ASSET', 'insurance accounts receivable') ??
    await findByName(client, 'ASSET', 'insurance receivable') ??
    await findByName(client, 'ASSET', 'receivable') ??
    await findByType(client, 'ASSET', '112') ??   // 1121/1122 receivables
    await findByType(client, 'ASSET', '13') ??
    await findByName(client, 'ASSET', 'insurance') ??
    await findByName(client, 'ASSET', 'مدين') ??
    await findByName(client, 'ASSET', 'تأمين') ??
    await getCashAccount(client)                // fall back to cash
  );
}

async function getPatientARAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByName(client, 'ASSET', 'patient accounts receivable') ??
    await findByName(client, 'ASSET', 'patient receivable') ??
    await findByType(client, 'ASSET', '1121') ??
    await getARAccount(client)
  );
}

// ── Equity account resolvers (shareholder capital + dividends) ────────────
async function getOwnerCapitalAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByName(client, 'EQUITY', "owner's capital") ??
    await findByName(client, 'EQUITY', 'capital') ??
    await findByType(client, 'EQUITY', '3100') ??
    await findByType(client, 'EQUITY', '31') ??
    await findByType(client, 'EQUITY')
  );
}

async function getRetainedEarningsAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByName(client, 'EQUITY', 'retained earnings') ??
    await findByName(client, 'EQUITY', 'retained') ??
    await findByType(client, 'EQUITY', '3200') ??
    await findByType(client, 'EQUITY', '32') ??
    await getOwnerCapitalAccount(client)
  );
}

async function getRevenueAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByType(client, 'REVENUE', '4') ??
    await findByType(client, 'REVENUE', '41') ??
    await findByType(client, 'REVENUE', '40') ??
    await findByName(client, 'REVENUE', 'revenue') ??
    await findByName(client, 'REVENUE', 'income') ??
    await findByName(client, 'REVENUE', 'إيراد') ??
    await findByName(client, 'REVENUE', 'دخل') ??
    await findByType(client, 'REVENUE')
  );
}

async function getPayableAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByType(client, 'LIABILITY', '21') ??
    await findByType(client, 'LIABILITY', '20') ??
    await findByName(client, 'LIABILITY', 'payable') ??
    await findByName(client, 'LIABILITY', 'creditor') ??
    await findByName(client, 'LIABILITY', 'دائن') ??
    await findByName(client, 'LIABILITY', 'مورد') ??
    await findByType(client, 'LIABILITY')
  );
}

async function getExpenseAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByType(client, 'EXPENSE', '6') ??
    await findByType(client, 'EXPENSE', '5') ??
    await findByName(client, 'EXPENSE', 'purchase') ??
    await findByName(client, 'EXPENSE', 'supplies') ??
    await findByName(client, 'EXPENSE', 'مشتريات') ??
    await findByName(client, 'EXPENSE', 'مصاريف') ??
    await findByType(client, 'EXPENSE')
  );
}

// ── Payroll-specific account resolvers ────────────────────────────────────
async function getSalaryExpenseAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByName(client, 'EXPENSE', 'salaries') ??
    await findByName(client, 'EXPENSE', 'wages') ??
    await findByType(client, 'EXPENSE', '5210') ??
    await findByType(client, 'EXPENSE', '52') ??
    await findByName(client, 'EXPENSE', 'staff') ??
    await getExpenseAccount(client)
  );
}

async function getEmployeePayableAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByName(client, 'LIABILITY', 'employee payable') ??
    await findByName(client, 'LIABILITY', 'employee') ??
    await findByType(client, 'LIABILITY', '2140') ??
    await findByName(client, 'LIABILITY', 'accrued') ??
    await getPayableAccount(client)
  );
}

async function getTaxPayableAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByName(client, 'LIABILITY', 'tax payable') ??
    await findByName(client, 'LIABILITY', 'tax') ??
    await findByType(client, 'LIABILITY', '2130') ??
    await getEmployeePayableAccount(client)
  );
}

async function getAccruedExpenseAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByName(client, 'LIABILITY', 'accrued') ??
    await findByType(client, 'LIABILITY', '2120') ??
    await getEmployeePayableAccount(client)
  );
}

// ── Journal helpers ───────────────────────────────────────────────────────

function makeJournalNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `JE-${year}-${rand}`;
}

/**
 * Resolve the accounting period (fin_periods.periodid) that contains the given date.
 * Falls back to the latest OPEN period if no exact range match.
 */
async function resolvePeriodId(client: PoolClient, entryDate: string): Promise<string | null> {
  try {
    // 1. Period whose date range contains entryDate
    const r = await client.query(
      `SELECT periodid FROM fin_periods
       WHERE workspaceid = $1
         AND $2::date BETWEEN startdate AND enddate
       ORDER BY startdate DESC
       LIMIT 1`,
      [WORKSPACE_ID, entryDate]
    );
    if (r.rows.length > 0) return r.rows[0].periodid;

    // 2. Fallback: latest OPEN period
    const r2 = await client.query(
      `SELECT periodid FROM fin_periods
       WHERE workspaceid = $1 AND status = 'OPEN'
       ORDER BY startdate DESC
       LIMIT 1`,
      [WORKSPACE_ID]
    );
    return r2.rows[0]?.periodid ?? null;
  } catch (err) {
    console.error('[GL] resolvePeriodId error:', err);
    return null;
  }
}

/** Resolve a valid users.userid for the createdby column (NOT NULL FK). Cached. */
async function resolveCreatedBy(client: PoolClient): Promise<string | null> {
  if ('__createdby' in _cache) return _cache['__createdby'];
  try {
    const r = await client.query(`SELECT userid FROM users ORDER BY createdat ASC LIMIT 1`);
    const id = r.rows[0]?.userid ?? null;
    _cache['__createdby'] = id;
    return id;
  } catch {
    // Maybe no createdat column — try plain
    try {
      const r2 = await client.query(`SELECT userid FROM users LIMIT 1`);
      const id = r2.rows[0]?.userid ?? null;
      _cache['__createdby'] = id;
      return id;
    } catch {
      _cache['__createdby'] = null;
      return null;
    }
  }
}

/**
 * Insert a balanced journal entry (header + lines) with status POSTED.
 * Also updates fin_account_balances running totals.
 */
async function insertJournal(
  client: PoolClient,
  opts: {
    source_type: string;
    source_id?: string;
    description: string;
    entry_date: string;
    lines: Array<{ accountId: string; debit: number; credit: number; memo?: string }>;
  }
): Promise<string | null> {
  const totalDebit  = opts.lines.reduce((s, l) => s + (l.debit  || 0), 0);
  const totalCredit = opts.lines.reduce((s, l) => s + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.warn(`[GL] Imbalanced — DR ${totalDebit.toFixed(2)} ≠ CR ${totalCredit.toFixed(2)} — skipping`);
    return null;
  }

  // Resolve required NOT NULL FKs: periodid (by date) + createdby (any user)
  const periodId  = await resolvePeriodId(client, opts.entry_date);
  const createdBy = await resolveCreatedBy(client);

  if (!periodId) {
    console.warn(`[GL] No accounting period found for ${opts.entry_date} — GL skipped`);
    return null;
  }
  if (!createdBy) {
    console.warn('[GL] No user found for createdby — GL skipped');
    return null;
  }

  // Insert header. sourceid stores the originating record's id (e.g. AP invoice
  // id) so journal entries can be reliably linked back without parsing text.
  const jeRes = await client.query(
    `INSERT INTO fin_journal_entries
       (workspaceid, journalnumber, journaldate, periodid, sourcetype, sourceid, description,
        totaldebit, totalcredit, status, postedat, createdby, createdat, updatedat)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'POSTED',NOW(),$10,NOW(),NOW())
     RETURNING journalid`,
    [WORKSPACE_ID, makeJournalNumber(), opts.entry_date, periodId,
     opts.source_type, opts.source_id ?? null, opts.description, totalDebit, totalCredit, createdBy]
  );
  const journalId = jeRes.rows[0]?.journalid;
  if (!journalId) return null;

  // Insert lines
  for (const line of opts.lines) {
    await client.query(
      `INSERT INTO fin_journal_lines (journalid, accountid, debit, credit, memo)
       VALUES ($1, $2, $3, $4, $5)`,
      [journalId, line.accountId, line.debit || 0, line.credit || 0, line.memo ?? null]
    );
  }

  // Note: fin_account_balances requires periodid (UUID NOT NULL) which needs a
  // pre-existing accounting period record. We skip direct balance updates here.
  // The accounts API is updated to compute running balance from fin_journal_lines
  // directly, so balances stay accurate without touching this table.

  console.log(`[GL] Posted ${opts.source_type} — JE ${journalId} — DR/CR ${totalDebit.toFixed(2)}`);
  return journalId;
}

/* ═══════════════════════════════════════════════════════════════════════
   PUBLIC POSTING FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Post a patient invoice payment to GL.
 * DR Cash (patient portion) + DR AR-Insurance (insurance portion)
 * CR Revenue (full amount)
 */
export async function postInvoicePayment(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  patientPayment: number,
  insurancePayment: number,
  entryDate?: string
): Promise<void> {
  try {
    const date    = entryDate ?? new Date().toISOString().split('T')[0];
    const cashAcc      = await getCashAccount(client);        // 1111 Cash & Bank
    const patientARAcc = await getPatientARAccount(client);   // 1121 Patient AR
    const insARAcc     = await getARAccount(client);          // 1122 Insurance AR
    const revAcc       = await getRevenueAccount(client);     // 4110 Revenue

    if (!revAcc) {
      console.warn('[GL] postInvoicePayment: No REVENUE account found — GL skipped');
      return;
    }

    const lines: Array<{ accountId: string; debit: number; credit: number; memo?: string }> = [];
    const total = (patientPayment || 0) + (insurancePayment || 0);
    if (total <= 0) return;

    // Patient portion → DR Cash (money received now) or DR Patient AR (if deferred)
    if (patientPayment > 0) {
      const drAcc = cashAcc ?? patientARAcc;
      if (drAcc) {
        lines.push({ accountId: drAcc, debit: patientPayment, credit: 0, memo: `Cash — ${invoiceNumber}` });
      }
    }
    // Insurance portion → DR Insurance AR (claim submitted, cash to arrive later)
    if (insurancePayment > 0) {
      const drAcc = insARAcc ?? cashAcc;
      if (drAcc) {
        lines.push({ accountId: drAcc, debit: insurancePayment, credit: 0, memo: `Insurance AR — ${invoiceNumber}` });
      }
    }
    // Credit side — revenue for the total debited
    const creditTotal = lines.reduce((s, l) => s + l.debit, 0);
    if (creditTotal > 0) {
      lines.push({ accountId: revAcc, debit: 0, credit: creditTotal, memo: `Revenue — ${invoiceNumber}` });
    }

    if (lines.length < 2) {
      console.warn('[GL] postInvoicePayment: Insufficient accounts resolved — GL skipped');
      return;
    }

    await insertJournal(client, {
      source_type: 'INVOICE',
      source_id: invoiceId,
      description: `Invoice payment — ${invoiceNumber}`,
      entry_date: date,
      lines,
    });
  } catch (err) {
    console.error('[GL] postInvoicePayment error:', err);
  }
}

/**
 * Post an invoice on an ACCRUAL basis (revenue recognized when invoiced, before payment).
 *   DR Patient AR   (total − insurance portion)
 *   DR Insurance AR (insurance portion)
 *   CR Revenue      (total)
 * Used to recognize revenue for unpaid/pending invoices so the GL reflects ALL
 * invoiced activity and the financial statements tie out.
 */
export async function postInvoiceAccrual(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  totalAmount: number,
  insuranceAmount: number,
  entryDate?: string
): Promise<void> {
  try {
    if (totalAmount <= 0) return;
    const date         = entryDate ?? new Date().toISOString().split('T')[0];
    const patientARAcc = await getPatientARAccount(client);   // 1121 Patient AR
    const insARAcc     = await getARAccount(client);          // 1122 Insurance AR
    const revAcc       = await getRevenueAccount(client);     // 4110 Revenue
    if (!revAcc) {
      console.warn('[GL] postInvoiceAccrual: No REVENUE account — skipped');
      return;
    }

    const insurance = Math.max(0, insuranceAmount || 0);
    const patient   = Math.max(0, totalAmount - insurance);

    const lines: Array<{ accountId: string; debit: number; credit: number; memo?: string }> = [];
    if (patient > 0 && patientARAcc) {
      lines.push({ accountId: patientARAcc, debit: patient, credit: 0, memo: `Patient AR — ${invoiceNumber}` });
    }
    if (insurance > 0 && insARAcc) {
      lines.push({ accountId: insARAcc, debit: insurance, credit: 0, memo: `Insurance AR — ${invoiceNumber}` });
    }
    const drTotal = lines.reduce((s, l) => s + l.debit, 0);
    if (drTotal <= 0) return;
    lines.push({ accountId: revAcc, debit: 0, credit: drTotal, memo: `Revenue — ${invoiceNumber}` });

    await insertJournal(client, {
      source_type: 'INVOICE',
      source_id: invoiceId,
      description: `Invoice issued (accrual) — ${invoiceNumber}`,
      entry_date: date,
      lines,
    });
  } catch (err) {
    console.error('[GL] postInvoiceAccrual error:', err);
  }
}

/**
 * Post insurance claim receipt.
 * DR Cash, CR Insurance Receivable
 */
export async function postInsuranceClaimPayment(
  client: PoolClient,
  claimId: string,
  claimRef: string,
  amount: number,
  entryDate?: string
): Promise<void> {
  try {
    if (amount <= 0) return;
    const date    = entryDate ?? new Date().toISOString().split('T')[0];
    const cashAcc = await getCashAccount(client);
    const arAcc   = await getARAccount(client);
    if (!cashAcc || !arAcc) return;

    await insertJournal(client, {
      source_type: 'INSURANCE_CLAIM',
      description: `Insurance claim — ${claimRef}`,
      entry_date: date,
      lines: [
        { accountId: cashAcc, debit: amount, credit: 0,      memo: `Receipt — ${claimRef}` },
        { accountId: arAcc,   debit: 0,      credit: amount, memo: `Clear AR — ${claimRef}` },
      ],
    });
  } catch (err) {
    console.error('[GL] postInsuranceClaimPayment error:', err);
  }
}

/**
 * Post a vendor AP invoice (goods received).
 * DR Expense, CR Accounts Payable
 */
export async function postAPInvoiceReceived(
  client: PoolClient,
  apInvoiceId: string,
  vendorName: string,
  amount: number,
  entryDate?: string,
  reference?: string   // AP invoice number, e.g. "AP-2026-45148"
): Promise<void> {
  try {
    if (amount <= 0) return;
    const date       = entryDate ?? new Date().toISOString().split('T')[0];
    const expenseAcc = await getExpenseAccount(client);
    const payableAcc = await getPayableAccount(client);
    if (!expenseAcc || !payableAcc) {
      console.warn('[GL] postAPInvoiceReceived: accounts not found — GL skipped');
      return;
    }

    const ref = reference ? ` (${reference})` : '';
    await insertJournal(client, {
      source_type: 'AP_INVOICE',
      source_id: apInvoiceId,
      description: `Vendor invoice — ${vendorName}${ref}`,
      entry_date: date,
      lines: [
        { accountId: expenseAcc, debit: amount, credit: 0,      memo: `Expense — ${vendorName}${ref}` },
        { accountId: payableAcc, debit: 0,      credit: amount, memo: `Payable — ${vendorName}${ref}` },
      ],
    });
  } catch (err) {
    console.error('[GL] postAPInvoiceReceived error:', err);
  }
}

/**
 * Post vendor payment.
 * DR Accounts Payable, CR Cash
 */
export async function postAPPayment(
  client: PoolClient,
  apInvoiceId: string,
  vendorName: string,
  amount: number,
  entryDate?: string,
  reference?: string   // AP invoice number, e.g. "AP-2026-45148"
): Promise<void> {
  try {
    if (amount <= 0) return;
    const date       = entryDate ?? new Date().toISOString().split('T')[0];
    const cashAcc    = await getCashAccount(client);
    const payableAcc = await getPayableAccount(client);
    if (!cashAcc || !payableAcc) return;

    const ref = reference ? ` (${reference})` : '';
    await insertJournal(client, {
      source_type: 'AP_PAYMENT',
      source_id: apInvoiceId,
      description: `Vendor payment — ${vendorName}${ref}`,
      entry_date: date,
      lines: [
        { accountId: payableAcc, debit: amount, credit: 0,      memo: `Clear payable — ${vendorName}${ref}` },
        { accountId: cashAcc,    debit: 0,      credit: amount, memo: `Payment — ${vendorName}${ref}` },
      ],
    });
  } catch (err) {
    console.error('[GL] postAPPayment error:', err);
  }
}

/**
 * Post payroll for a period (accrual — when payroll is calculated/approved).
 *   DR Salaries & Wages (gross)
 *   CR Employee Payable (net)        — what we owe staff
 *   CR Tax Payable      (income tax)
 *   CR Accrued Expenses (SS + health + loans + advances + absence + unpaid leave)
 * Always balances: net + tax + other = gross.
 */
export async function postPayroll(
  client: PoolClient,
  periodId: string,
  periodName: string,
  totals: { gross: number; net: number; incomeTax: number },
  entryDate?: string
): Promise<void> {
  try {
    if (totals.gross <= 0) return;
    const date       = entryDate ?? new Date().toISOString().split('T')[0];
    const salaryAcc  = await getSalaryExpenseAccount(client);
    const empPayAcc  = await getEmployeePayableAccount(client);
    const taxAcc     = await getTaxPayableAccount(client);
    const accruedAcc = await getAccruedExpenseAccount(client);

    if (!salaryAcc || !empPayAcc) {
      console.warn('[GL] postPayroll: salary/payable accounts not found — skipped');
      return;
    }

    const net    = Math.max(0, totals.net);
    const tax    = Math.max(0, totals.incomeTax);
    const other  = Math.max(0, totals.gross - net - tax); // SS, health, loans, etc.
    const ref    = `Payroll ${periodName}`;

    const lines: Array<{ accountId: string; debit: number; credit: number; memo?: string }> = [
      { accountId: salaryAcc, debit: totals.gross, credit: 0, memo: `Salaries expense — ${ref}` },
      { accountId: empPayAcc, debit: 0, credit: net, memo: `Net payable to staff — ${ref}` },
    ];
    if (tax > 0 && taxAcc)      lines.push({ accountId: taxAcc,     debit: 0, credit: tax,   memo: `Income tax withheld — ${ref}` });
    if (other > 0 && accruedAcc) lines.push({ accountId: accruedAcc, debit: 0, credit: other, memo: `SS/other deductions — ${ref}` });

    // If tax/accrued account missing, fold remainder into employee payable to stay balanced
    const creditTotal = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(creditTotal - totals.gross) > 0.01) {
      lines[1].credit += (totals.gross - creditTotal);
    }

    await insertJournal(client, {
      source_type: 'PAYROLL',
      source_id: periodId,
      description: `Payroll accrual — ${periodName}`,
      entry_date: date,
      lines,
    });
  } catch (err) {
    console.error('[GL] postPayroll error:', err);
  }
}

/**
 * Post payroll payment (when net salaries are disbursed via bank transfer).
 *   DR Employee Payable
 *   CR Cash & Bank
 */
export async function postPayrollPayment(
  client: PoolClient,
  periodId: string,
  periodName: string,
  netAmount: number,
  entryDate?: string
): Promise<void> {
  try {
    if (netAmount <= 0) return;
    const date      = entryDate ?? new Date().toISOString().split('T')[0];
    const cashAcc   = await getCashAccount(client);
    const empPayAcc = await getEmployeePayableAccount(client);
    if (!cashAcc || !empPayAcc) return;

    await insertJournal(client, {
      source_type: 'PAYROLL_PAYMENT',
      source_id: periodId,
      description: `Payroll payment — ${periodName}`,
      entry_date: date,
      lines: [
        { accountId: empPayAcc, debit: netAmount, credit: 0,         memo: `Clear staff payable — ${periodName}` },
        { accountId: cashAcc,   debit: 0,         credit: netAmount, memo: `Salary disbursement — ${periodName}` },
      ],
    });
  } catch (err) {
    console.error('[GL] postPayrollPayment error:', err);
  }
}

/**
 * Post shareholder paid-in capital.
 *   DR Cash & Bank / CR Owner's Capital
 * Makes the Balance Sheet equity reflect real shareholder investment.
 */
export async function postShareholderCapital(
  client: PoolClient,
  sourceId: string,
  label: string,
  amount: number,
  entryDate?: string
): Promise<void> {
  try {
    if (amount <= 0) return;
    const date       = entryDate ?? new Date().toISOString().split('T')[0];
    const cashAcc    = await getCashAccount(client);
    const capitalAcc = await getOwnerCapitalAccount(client);
    if (!cashAcc || !capitalAcc) {
      console.warn('[GL] postShareholderCapital: accounts not found — skipped');
      return;
    }
    await insertJournal(client, {
      source_type: 'SH_CAPITAL',
      source_id: sourceId,
      description: `Shareholder capital — ${label}`,
      entry_date: date,
      lines: [
        { accountId: cashAcc,    debit: amount, credit: 0,      memo: `Capital received — ${label}` },
        { accountId: capitalAcc, debit: 0,      credit: amount, memo: `Owner's capital — ${label}` },
      ],
    });
  } catch (err) {
    console.error('[GL] postShareholderCapital error:', err);
  }
}

/**
 * Post a dividend distribution (declared + paid to shareholders).
 *   DR Retained Earnings / CR Cash & Bank
 */
export async function postDividend(
  client: PoolClient,
  declarationId: string,
  label: string,
  amount: number,
  entryDate?: string
): Promise<void> {
  try {
    if (amount <= 0) return;
    const date        = entryDate ?? new Date().toISOString().split('T')[0];
    const cashAcc     = await getCashAccount(client);
    const retainedAcc = await getRetainedEarningsAccount(client);
    if (!cashAcc || !retainedAcc) {
      console.warn('[GL] postDividend: accounts not found — skipped');
      return;
    }
    await insertJournal(client, {
      source_type: 'DIVIDEND',
      source_id: declarationId,
      description: `Dividend distribution — ${label}`,
      entry_date: date,
      lines: [
        { accountId: retainedAcc, debit: amount, credit: 0,      memo: `Dividend declared — ${label}` },
        { accountId: cashAcc,     debit: 0,      credit: amount, memo: `Dividend paid — ${label}` },
      ],
    });
  } catch (err) {
    console.error('[GL] postDividend error:', err);
  }
}

// Provider / professional-fees expense account for stakeholder share payouts
async function getProviderFeeAccount(client: PoolClient): Promise<string | null> {
  return (
    await findByName(client, 'EXPENSE', 'provider') ??
    await findByName(client, 'EXPENSE', 'professional') ??
    await findByName(client, 'EXPENSE', 'doctor') ??
    await findByName(client, 'EXPENSE', 'physician') ??
    await findByName(client, 'EXPENSE', 'fees') ??
    await findByName(client, 'EXPENSE', 'أتعاب') ??
    await getExpenseAccount(client)
  );
}

/**
 * Post a stakeholder/service-provider share payment.
 *   DR Provider Fees Expense / CR Cash & Bank
 * Records the payout to the doctor/provider so accounting sees the expense + cash outflow.
 */
export async function postStakeholderPayment(
  client: PoolClient,
  sourceId: string,
  label: string,
  amount: number,
  entryDate?: string
): Promise<void> {
  try {
    if (amount <= 0) return;
    const date    = entryDate ?? new Date().toISOString().split('T')[0];
    const cashAcc = await getCashAccount(client);
    const feeAcc  = await getProviderFeeAccount(client);
    if (!cashAcc || !feeAcc) {
      console.warn('[GL] postStakeholderPayment: accounts not found — skipped');
      return;
    }
    await insertJournal(client, {
      source_type: 'STAKEHOLDER_PAYMENT',
      source_id: sourceId,
      description: `Provider share payment — ${label}`,
      entry_date: date,
      lines: [
        { accountId: feeAcc,  debit: amount, credit: 0,      memo: `Provider fees — ${label}` },
        { accountId: cashAcc, debit: 0,      credit: amount, memo: `Paid to provider — ${label}` },
      ],
    });
  } catch (err) {
    console.error('[GL] postStakeholderPayment error:', err);
  }
}
