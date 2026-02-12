'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

export async function getInvoices() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        patient:patients(id, medical_record_number, first_name, last_name),
        insurance_policy:insurance_policies(
          id,
          policy_number,
          provider:insurance_providers(id, name)
        ),
        line_items:invoice_line_items(
          *,
          service:service_catalog(id, code, name, category)
        ),
        payments(id, payment_date, amount, payment_method)
      `)
      .eq('organization_id', session.organizationId)
      .order('invoice_date', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return { success: false, error: 'Failed to fetch invoices' };
  }
}

export async function getInvoiceById(id: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        patient:patients(id, medical_record_number, first_name, last_name, phone, email),
        insurance_policy:insurance_policies(
          id,
          policy_number,
          coverage_percentage,
          provider:insurance_providers(id, name, code)
        ),
        line_items:invoice_line_items(
          *,
          service:service_catalog(id, code, name, category)
        ),
        payments(*)
      `)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return { success: false, error: 'Invoice not found' };
  }
}

export async function createInvoice(invoiceData: {
  patient_id: string;
  invoice_date: string;
  due_date: string;
  line_items: Array<{
    service_id: string;
    quantity: number;
    unit_price: number;
    description: string;
  }>;
  discount_percentage?: number;
  notes?: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Calculate totals
    const subtotal = invoiceData.line_items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price),
      0
    );

    const discount_amount = subtotal * ((invoiceData.discount_percentage || 0) / 100);
    const total_amount = subtotal - discount_amount;

    // Get patient's insurance policy
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', invoiceData.patient_id)
      .single();

    let insurance_coverage = 0;
    let insurance_policy_id: string | null = null;

    if (patient?.primary_insurance_id) {
      const { data: policy } = await supabaseAdmin
        .from('insurance_policies')
        .select('*')
        .eq('id', patient.primary_insurance_id)
        .eq('status', 'ACTIVE')
        .single();

      if (policy) {
        insurance_policy_id = policy.id;
        insurance_coverage = total_amount * (policy.coverage_percentage / 100);
      }
    }

    const patient_responsibility = total_amount - insurance_coverage;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        organization_id: session.organizationId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        patient_id: invoiceData.patient_id,
        insurance_policy_id,
        subtotal,
        discount_amount,
        discount_percentage: invoiceData.discount_percentage || 0,
        total_amount,
        insurance_coverage,
        patient_responsibility,
        paid_amount: 0,
        balance_due: patient_responsibility,
        status: 'ISSUED' as const,
        payment_status: 'UNPAID' as const,
        created_by: session.employeeId,
        notes: invoiceData.notes
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error('Failed to create invoice');

    // Create line items
    const lineItemsData = invoiceData.line_items.map((item, index) => ({
      invoice_id: invoice.id,
      line_number: index + 1,
      service_id: item.service_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price
    }));

    const { error: lineItemsError } = await supabaseAdmin
      .from('invoice_line_items')
      .insert(lineItemsData as any);

    if (lineItemsError) throw lineItemsError;

    // Create accounting entry (double-entry bookkeeping)
    await createInvoiceJournalEntry(invoice);

    revalidatePath('/finance/invoices');

    return { success: true, data: invoice };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, error: 'Failed to create invoice' };
  }
}

async function createInvoiceJournalEntry(invoice: Record<string, any>) {
  try {
    const session = await getSession();
    if (!session) return;

    // Get accounts
    const { data: accountsReceivable } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .eq('account_code', '1200')
      .single();

    const { data: revenueAccount } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .eq('account_code', '4000')
      .single();

    if (!accountsReceivable || !revenueAccount) return;

    // Create journal entry
    const entryNumber = `JE-${Date.now()}`;

    const { data: entry } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        organization_id: session.organizationId,
        entry_number: entryNumber,
        entry_date: invoice.invoice_date,
        description: `Invoice ${invoice.invoice_number}`,
        reference: invoice.invoice_number,
        status: 'POSTED' as const,
        total_debit: invoice.total_amount,
        total_credit: invoice.total_amount,
        created_by: session.employeeId,
        posted_by: session.employeeId,
        posted_at: new Date().toISOString(),
        invoice_id: invoice.id
      })
      .select()
      .single();

    if (!entry) return;

    // Create journal entry lines
    await supabaseAdmin.from('journal_entry_lines').insert([
      {
        entry_id: entry.id,
        line_number: 1,
        account_id: accountsReceivable.id,
        description: `AR - ${invoice.invoice_number}`,
        debit_amount: invoice.total_amount,
        credit_amount: 0
      },
      {
        entry_id: entry.id,
        line_number: 2,
        account_id: revenueAccount.id,
        description: `Revenue - ${invoice.invoice_number}`,
        debit_amount: 0,
        credit_amount: invoice.total_amount
      }
    ] as any);
  } catch (error) {
    console.error('Error creating journal entry:', error);
  }
}

export async function recordPayment(invoiceId: string, paymentData: {
  amount: number;
  payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'INSURANCE';
  payment_date: string;
  reference_number?: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Get invoice
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!invoice) throw new Error('Invoice not found');

    // Create payment record
    const paymentNumber = `PAY-${Date.now()}`;

    await supabaseAdmin.from('payments').insert({
      invoice_id: invoiceId,
      payment_number: paymentNumber,
      payment_date: paymentData.payment_date,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      reference_number: paymentData.reference_number,
      received_by: session.employeeId
    } as any);

    // Update invoice
    const new_paid_amount = invoice.paid_amount + paymentData.amount;
    const new_balance_due = invoice.balance_due - paymentData.amount;
    const new_payment_status = new_balance_due <= 0 ? 'PAID' :
                               new_paid_amount > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    await supabaseAdmin
      .from('invoices')
      .update({
        paid_amount: new_paid_amount,
        balance_due: new_balance_due,
        payment_status: new_payment_status as any
      })
      .eq('id', invoiceId);

    revalidatePath('/finance/invoices');
    revalidatePath(`/finance/invoices/${invoiceId}`);

    return { success: true };
  } catch (error) {
    console.error('Error recording payment:', error);
    return { success: false, error: 'Failed to record payment' };
  }
}
