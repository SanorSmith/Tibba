-- Row-level security for tables that reach a facility only through a parent.
--
-- The original sweep found tables by looking for a workspace column. These
-- 63 have none: an invoice line belongs to a facility because its invoice
-- does, a sale item because its sale does. They were therefore left open, and
-- a query against them returned every facility.
--
-- Each policy asks whether the parent row is visible. That question is already
-- answered by the parent policy, so isolation stays defined in one place: if
-- the parent rule changes, these follow. Anchors were chosen by hand, never
-- from the first foreign key -- pos_sale_items links to both its sale and a
-- drug, and only the sale carries the facility.
--
-- Deliberately no anchor points at patients, workspaces or insurance_companies:
-- migration 0068 made those readable across facilities on purpose, so anchoring
-- to them would look like protection while providing none.
--
-- Verified before writing: all 63 anchors resolve for every existing row --
-- 2,215 rows, no NULLs, no orphans -- except one row of end_of_service_provisions
-- whose employee no longer exists. That policy also admits rows with no matching
-- parent, so nothing disappears; the row is unattributable, not hidden.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.audit_logs;
CREATE POLICY tenant_isolation ON public.audit_logs
  USING (
    EXISTS (SELECT 1 FROM public.accession_samples p WHERE p.sampleid = audit_logs.sampleid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accession_samples p WHERE p.sampleid = audit_logs.sampleid)
  );

ALTER TABLE public.bank_transfer_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transfer_details FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.bank_transfer_details;
CREATE POLICY tenant_isolation ON public.bank_transfer_details
  USING (
    EXISTS (SELECT 1 FROM public.bank_transfers p WHERE p.id = bank_transfer_details.bank_transfer_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.bank_transfers p WHERE p.id = bank_transfer_details.bank_transfer_id)
  );

ALTER TABLE public.batch_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_quarantine FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.batch_quarantine;
CREATE POLICY tenant_isolation ON public.batch_quarantine
  USING (
    EXISTS (SELECT 1 FROM public.items p WHERE p.id = batch_quarantine.item_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.items p WHERE p.id = batch_quarantine.item_id)
  );

ALTER TABLE public.controlled_drug_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controlled_drug_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.controlled_drug_log;
CREATE POLICY tenant_isolation ON public.controlled_drug_log
  USING (
    EXISTS (SELECT 1 FROM public.stores p WHERE p.id = controlled_drug_log.store_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores p WHERE p.id = controlled_drug_log.store_id)
  );

ALTER TABLE public.drug_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_batches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.drug_batches;
CREATE POLICY tenant_isolation ON public.drug_batches
  USING (
    EXISTS (SELECT 1 FROM public.drugs p WHERE p.drugid = drug_batches.drugid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.drugs p WHERE p.drugid = drug_batches.drugid)
  );

ALTER TABLE public.employee_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_bonuses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.employee_bonuses;
CREATE POLICY tenant_isolation ON public.employee_bonuses
  USING (
    EXISTS (SELECT 1 FROM public.payroll_periods p WHERE p.id = employee_bonuses.period_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.payroll_periods p WHERE p.id = employee_bonuses.period_id)
  );

ALTER TABLE public.employee_rotation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_rotation_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.employee_rotation_assignments;
CREATE POLICY tenant_isolation ON public.employee_rotation_assignments
  USING (
    EXISTS (SELECT 1 FROM public.employees p WHERE p.id = employee_rotation_assignments.employee_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees p WHERE p.id = employee_rotation_assignments.employee_id)
  );

ALTER TABLE public.end_of_service_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.end_of_service_provisions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.end_of_service_provisions;
CREATE POLICY tenant_isolation ON public.end_of_service_provisions
  USING (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = end_of_service_provisions.employee_id)
    OR NOT EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = end_of_service_provisions.employee_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = end_of_service_provisions.employee_id)
    OR NOT EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = end_of_service_provisions.employee_id)
  );

ALTER TABLE public.fin_account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_account_balances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.fin_account_balances;
CREATE POLICY tenant_isolation ON public.fin_account_balances
  USING (
    EXISTS (SELECT 1 FROM public.fin_accounts p WHERE p.accountid = fin_account_balances.accountid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.fin_accounts p WHERE p.accountid = fin_account_balances.accountid)
  );

ALTER TABLE public.fin_ap_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_ap_payment_allocations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.fin_ap_payment_allocations;
CREATE POLICY tenant_isolation ON public.fin_ap_payment_allocations
  USING (
    EXISTS (SELECT 1 FROM public.fin_ap_invoices p WHERE p.apinvoiceid = fin_ap_payment_allocations.apinvoiceid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.fin_ap_invoices p WHERE p.apinvoiceid = fin_ap_payment_allocations.apinvoiceid)
  );

ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.grn_items;
CREATE POLICY tenant_isolation ON public.grn_items
  USING (
    EXISTS (SELECT 1 FROM public.goods_receipt_notes p WHERE p.id = grn_items.grnid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.goods_receipt_notes p WHERE p.id = grn_items.grnid)
  );

ALTER TABLE public.hiring_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiring_team_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.hiring_team_members;
CREATE POLICY tenant_isolation ON public.hiring_team_members
  USING (
    EXISTS (SELECT 1 FROM public.job_vacancies p WHERE p.id = hiring_team_members.vacancy_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.job_vacancies p WHERE p.id = hiring_team_members.vacancy_id)
  );

ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.inventory_stock;
CREATE POLICY tenant_isolation ON public.inventory_stock
  USING (
    EXISTS (SELECT 1 FROM public.warehouses p WHERE p.id = inventory_stock.warehouse_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.warehouses p WHERE p.id = inventory_stock.warehouse_id)
  );

ALTER TABLE public.item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_batches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.item_batches;
CREATE POLICY tenant_isolation ON public.item_batches
  USING (
    EXISTS (SELECT 1 FROM public.warehouses p WHERE p.id = item_batches.warehouse_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.warehouses p WHERE p.id = item_batches.warehouse_id)
  );

ALTER TABLE public.lab_claim_damage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_claim_damage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.lab_claim_damage;
CREATE POLICY tenant_isolation ON public.lab_claim_damage
  USING (
    EXISTS (SELECT 1 FROM public.lab_goods_receipt p WHERE p.id = lab_claim_damage.receipt_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.lab_goods_receipt p WHERE p.id = lab_claim_damage.receipt_id)
  );

ALTER TABLE public.lab_goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_goods_receipt_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.lab_goods_receipt_items;
CREATE POLICY tenant_isolation ON public.lab_goods_receipt_items
  USING (
    EXISTS (SELECT 1 FROM public.lab_goods_receipt p WHERE p.id = lab_goods_receipt_items.receipt_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.lab_goods_receipt p WHERE p.id = lab_goods_receipt_items.receipt_id)
  );

ALTER TABLE public.lab_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_purchase_order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.lab_purchase_order_items;
CREATE POLICY tenant_isolation ON public.lab_purchase_order_items
  USING (
    EXISTS (SELECT 1 FROM public.lab_purchase_orders p WHERE p.id = lab_purchase_order_items.order_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.lab_purchase_orders p WHERE p.id = lab_purchase_order_items.order_id)
  );

ALTER TABLE public.lab_vendor_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_vendor_return_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.lab_vendor_return_items;
CREATE POLICY tenant_isolation ON public.lab_vendor_return_items
  USING (
    EXISTS (SELECT 1 FROM public.lab_vendor_returns p WHERE p.id = lab_vendor_return_items.return_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.lab_vendor_returns p WHERE p.id = lab_vendor_return_items.return_id)
  );

ALTER TABLE public.leave_approval_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_approval_workflow FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.leave_approval_workflow;
CREATE POLICY tenant_isolation ON public.leave_approval_workflow
  USING (
    EXISTS (SELECT 1 FROM public.leave_types p WHERE p.id = leave_approval_workflow.leave_type_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.leave_types p WHERE p.id = leave_approval_workflow.leave_type_id)
  );

ALTER TABLE public.leave_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.leave_audit_log;
CREATE POLICY tenant_isolation ON public.leave_audit_log
  USING (
    EXISTS (SELECT 1 FROM public.leave_requests p WHERE p.id = leave_audit_log.leave_request_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.leave_requests p WHERE p.id = leave_audit_log.leave_request_id)
  );

ALTER TABLE public.leave_policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policy_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.leave_policy_rules;
CREATE POLICY tenant_isolation ON public.leave_policy_rules
  USING (
    EXISTS (SELECT 1 FROM public.leave_types p WHERE p.id = leave_policy_rules.leave_type_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.leave_types p WHERE p.id = leave_policy_rules.leave_type_id)
  );

ALTER TABLE public.lims_order_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lims_order_tests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.lims_order_tests;
CREATE POLICY tenant_isolation ON public.lims_order_tests
  USING (
    EXISTS (SELECT 1 FROM public.lims_orders p WHERE p.orderid = lims_order_tests.orderid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.lims_orders p WHERE p.orderid = lims_order_tests.orderid)
  );

ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_feedback FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.patient_feedback;
CREATE POLICY tenant_isolation ON public.patient_feedback
  USING (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = patient_feedback.employee_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = patient_feedback.employee_id)
  );

ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_adjustments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.payroll_adjustments;
CREATE POLICY tenant_isolation ON public.payroll_adjustments
  USING (
    EXISTS (SELECT 1 FROM public.payroll_periods p WHERE p.id = payroll_adjustments.period_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.payroll_periods p WHERE p.id = payroll_adjustments.period_id)
  );

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.payslips;
CREATE POLICY tenant_isolation ON public.payslips
  USING (
    EXISTS (SELECT 1 FROM public.payroll_transactions p WHERE p.id = payslips.payroll_transaction_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.payroll_transactions p WHERE p.id = payslips.payroll_transaction_id)
  );

ALTER TABLE public.performance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.performance_audit_log;
CREATE POLICY tenant_isolation ON public.performance_audit_log
  USING (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = performance_audit_log.changed_by)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = performance_audit_log.changed_by)
  );

ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.performance_goals;
CREATE POLICY tenant_isolation ON public.performance_goals
  USING (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = performance_goals.employee_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = performance_goals.employee_id)
  );

ALTER TABLE public.pharmacy_claim_damage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_claim_damage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_claim_damage;
CREATE POLICY tenant_isolation ON public.pharmacy_claim_damage
  USING (
    EXISTS (SELECT 1 FROM public.pharmacy_goods_receipt p WHERE p.id = pharmacy_claim_damage.receipt_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacy_goods_receipt p WHERE p.id = pharmacy_claim_damage.receipt_id)
  );

ALTER TABLE public.pharmacy_goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_goods_receipt_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_goods_receipt_items;
CREATE POLICY tenant_isolation ON public.pharmacy_goods_receipt_items
  USING (
    EXISTS (SELECT 1 FROM public.pharmacy_goods_receipt p WHERE p.id = pharmacy_goods_receipt_items.receipt_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacy_goods_receipt p WHERE p.id = pharmacy_goods_receipt_items.receipt_id)
  );

ALTER TABLE public.pharmacy_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invoice_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_invoice_lines;
CREATE POLICY tenant_isolation ON public.pharmacy_invoice_lines
  USING (
    EXISTS (SELECT 1 FROM public.pharmacy_invoices p WHERE p.invoiceid = pharmacy_invoice_lines.invoiceid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacy_invoices p WHERE p.invoiceid = pharmacy_invoice_lines.invoiceid)
  );

ALTER TABLE public.pharmacy_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_invoices;
CREATE POLICY tenant_isolation ON public.pharmacy_invoices
  USING (
    EXISTS (SELECT 1 FROM public.pharmacy_orders p WHERE p.orderid = pharmacy_invoices.orderid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacy_orders p WHERE p.orderid = pharmacy_invoices.orderid)
  );

ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_order_items;
CREATE POLICY tenant_isolation ON public.pharmacy_order_items
  USING (
    EXISTS (SELECT 1 FROM public.pharmacy_orders p WHERE p.orderid = pharmacy_order_items.orderid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacy_orders p WHERE p.orderid = pharmacy_order_items.orderid)
  );

ALTER TABLE public.pharmacy_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_purchase_order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_purchase_order_items;
CREATE POLICY tenant_isolation ON public.pharmacy_purchase_order_items
  USING (
    EXISTS (SELECT 1 FROM public.pharmacy_purchase_orders p WHERE p.id = pharmacy_purchase_order_items.order_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacy_purchase_orders p WHERE p.id = pharmacy_purchase_order_items.order_id)
  );

ALTER TABLE public.pharmacy_stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_stock_levels FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_stock_levels;
CREATE POLICY tenant_isolation ON public.pharmacy_stock_levels
  USING (
    EXISTS (SELECT 1 FROM public.pharmacy_stock_locations p WHERE p.locationid = pharmacy_stock_levels.locationid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacy_stock_locations p WHERE p.locationid = pharmacy_stock_levels.locationid)
  );

ALTER TABLE public.pharmacy_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_stock_movements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_stock_movements;
CREATE POLICY tenant_isolation ON public.pharmacy_stock_movements
  USING (
    EXISTS (SELECT 1 FROM public.pharmacy_stock_locations p WHERE p.locationid = pharmacy_stock_movements.locationid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacy_stock_locations p WHERE p.locationid = pharmacy_stock_movements.locationid)
  );

ALTER TABLE public.pharmacy_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_substitutions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacy_substitutions;
CREATE POLICY tenant_isolation ON public.pharmacy_substitutions
  USING (
    EXISTS (SELECT 1 FROM public.drugs p WHERE p.drugid = pharmacy_substitutions.newdrugid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.drugs p WHERE p.drugid = pharmacy_substitutions.newdrugid)
  );

ALTER TABLE public.pharmacymedications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacymedications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacymedications;
CREATE POLICY tenant_isolation ON public.pharmacymedications
  USING (
    EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.pharmacyid = pharmacymedications.pharmacyid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.pharmacyid = pharmacymedications.pharmacyid)
  );

ALTER TABLE public.pharmacyorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacyorders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacyorders;
CREATE POLICY tenant_isolation ON public.pharmacyorders
  USING (
    EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.pharmacyid = pharmacyorders.pharmacyid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.pharmacyid = pharmacyorders.pharmacyid)
  );

ALTER TABLE public.pharmacyreviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacyreviews FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pharmacyreviews;
CREATE POLICY tenant_isolation ON public.pharmacyreviews
  USING (
    EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.pharmacyid = pharmacyreviews.pharmacyid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.pharmacyid = pharmacyreviews.pharmacyid)
  );

ALTER TABLE public.pos_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pos_payments;
CREATE POLICY tenant_isolation ON public.pos_payments
  USING (
    EXISTS (SELECT 1 FROM public.pos_sales p WHERE p.saleid = pos_payments.saleid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pos_sales p WHERE p.saleid = pos_payments.saleid)
  );

ALTER TABLE public.pos_refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_refund_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pos_refund_transactions;
CREATE POLICY tenant_isolation ON public.pos_refund_transactions
  USING (
    EXISTS (SELECT 1 FROM public.pos_returns p WHERE p.returnid = pos_refund_transactions.returnid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pos_returns p WHERE p.returnid = pos_refund_transactions.returnid)
  );

ALTER TABLE public.pos_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_return_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pos_return_items;
CREATE POLICY tenant_isolation ON public.pos_return_items
  USING (
    EXISTS (SELECT 1 FROM public.pos_returns p WHERE p.returnid = pos_return_items.returnid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pos_returns p WHERE p.returnid = pos_return_items.returnid)
  );

ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sale_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.pos_sale_items;
CREATE POLICY tenant_isolation ON public.pos_sale_items
  USING (
    EXISTS (SELECT 1 FROM public.pos_sales p WHERE p.saleid = pos_sale_items.saleid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pos_sales p WHERE p.saleid = pos_sale_items.saleid)
  );

ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.profile;
CREATE POLICY tenant_isolation ON public.profile
  USING (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = profile.staff_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff p WHERE p.staffid = profile.staff_id)
  );

ALTER TABLE public.reagent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reagent_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.reagent_assignments;
CREATE POLICY tenant_isolation ON public.reagent_assignments
  USING (
    EXISTS (SELECT 1 FROM public.items p WHERE p.id = reagent_assignments.item_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.items p WHERE p.id = reagent_assignments.item_id)
  );

ALTER TABLE public.sample_accession_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_accession_audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.sample_accession_audit_log;
CREATE POLICY tenant_isolation ON public.sample_accession_audit_log
  USING (
    EXISTS (SELECT 1 FROM public.accession_samples p WHERE p.sampleid = sample_accession_audit_log.sampleid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accession_samples p WHERE p.sampleid = sample_accession_audit_log.sampleid)
  );

ALTER TABLE public.sample_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_status_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.sample_status_history;
CREATE POLICY tenant_isolation ON public.sample_status_history
  USING (
    EXISTS (SELECT 1 FROM public.accession_samples p WHERE p.sampleid = sample_status_history.sampleid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accession_samples p WHERE p.sampleid = sample_status_history.sampleid)
  );

ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.schedule_exceptions;
CREATE POLICY tenant_isolation ON public.schedule_exceptions
  USING (
    EXISTS (SELECT 1 FROM public.employees p WHERE p.id = schedule_exceptions.employee_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employees p WHERE p.id = schedule_exceptions.employee_id)
  );

ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.shift_assignments;
CREATE POLICY tenant_isolation ON public.shift_assignments
  USING (
    EXISTS (SELECT 1 FROM public.shifts p WHERE p.id = shift_assignments.shift_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shifts p WHERE p.id = shift_assignments.shift_id)
  );

ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.shop_order_items;
CREATE POLICY tenant_isolation ON public.shop_order_items
  USING (
    EXISTS (SELECT 1 FROM public.shop_orders p WHERE p.orderid = shop_order_items.orderid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shop_orders p WHERE p.orderid = shop_order_items.orderid)
  );

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.stock_transfers;
CREATE POLICY tenant_isolation ON public.stock_transfers
  USING (
    EXISTS (SELECT 1 FROM public.warehouses p WHERE p.id = stock_transfers.from_warehouse_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.warehouses p WHERE p.id = stock_transfers.from_warehouse_id)
  );

ALTER TABLE public.store_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisitions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.store_requisitions;
CREATE POLICY tenant_isolation ON public.store_requisitions
  USING (
    EXISTS (SELECT 1 FROM public.stores p WHERE p.id = store_requisitions.store_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores p WHERE p.id = store_requisitions.store_id)
  );

ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.store_stock;
CREATE POLICY tenant_isolation ON public.store_stock
  USING (
    EXISTS (SELECT 1 FROM public.stores p WHERE p.id = store_stock.store_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores p WHERE p.id = store_stock.store_id)
  );

ALTER TABLE public.store_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.store_transactions;
CREATE POLICY tenant_isolation ON public.store_transactions
  USING (
    EXISTS (SELECT 1 FROM public.warehouses p WHERE p.id = store_transactions.store_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.warehouses p WHERE p.id = store_transactions.store_id)
  );

ALTER TABLE public.supplier_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_claims FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.supplier_claims;
CREATE POLICY tenant_isolation ON public.supplier_claims
  USING (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = supplier_claims.vendorid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = supplier_claims.vendorid)
  );

ALTER TABLE public.supplier_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_return_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.supplier_return_items;
CREATE POLICY tenant_isolation ON public.supplier_return_items
  USING (
    EXISTS (SELECT 1 FROM public.supplier_returns p WHERE p.id = supplier_return_items.returnid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.supplier_returns p WHERE p.id = supplier_return_items.returnid)
  );

ALTER TABLE public.supplier_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_returns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.supplier_returns;
CREATE POLICY tenant_isolation ON public.supplier_returns
  USING (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = supplier_returns.vendorid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = supplier_returns.vendorid)
  );

ALTER TABLE public.test_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_package_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.test_package_items;
CREATE POLICY tenant_isolation ON public.test_package_items
  USING (
    EXISTS (SELECT 1 FROM public.test_packages p WHERE p.packageid = test_package_items.packageid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.test_packages p WHERE p.packageid = test_package_items.packageid)
  );

ALTER TABLE public.validation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_states FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.validation_states;
CREATE POLICY tenant_isolation ON public.validation_states
  USING (
    EXISTS (SELECT 1 FROM public.accession_samples p WHERE p.sampleid = validation_states.sampleid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accession_samples p WHERE p.sampleid = validation_states.sampleid)
  );

ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contracts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.vendor_contracts;
CREATE POLICY tenant_isolation ON public.vendor_contracts
  USING (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = vendor_contracts.vendorid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = vendor_contracts.vendorid)
  );

ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.vendor_items;
CREATE POLICY tenant_isolation ON public.vendor_items
  USING (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = vendor_items.vendor_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = vendor_items.vendor_id)
  );

ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.vendor_payments;
CREATE POLICY tenant_isolation ON public.vendor_payments
  USING (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = vendor_payments.vendor_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors p WHERE p.id = vendor_payments.vendor_id)
  );

ALTER TABLE public.worklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worklist_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.worklist_items;
CREATE POLICY tenant_isolation ON public.worklist_items
  USING (
    EXISTS (SELECT 1 FROM public.worklists p WHERE p.worklistid = worklist_items.worklistid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.worklists p WHERE p.worklistid = worklist_items.worklistid)
  );
