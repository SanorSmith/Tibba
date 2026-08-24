-- Phase 01c: make facility-issued numbering per-tenant.
--
-- 42 unique constraints on tenant tables were globally unique, so a second
-- facility could not have a specialty named Cardiology, an employee number
-- that another facility already used, an "annual leave" code, or a payroll
-- period for the same month. Each is rebuilt as UNIQUE (workspace, ...).
--
-- Kept global on purpose:
--   national_id            a national identity is unique by nature
--   equipment.serialnumber a physical device exists once
--   employees.employee_id  employees.reporting_to foreign-keys onto it, so it
--                          functions as a key, not a numbering rule; the
--                          human-facing employee_number is per-tenant instead
--   insurance_companies.insuranceid, emergency_doctor_assignments.visitid
--   composites already scoped to a tenant-owned entity, e.g. (employee_id,
--   date), (period_id, employee_id), (vendorid, supplierinvoicenumber)
--
-- Applied to production on 2026-08-22.

ALTER TABLE accession_samples DROP CONSTRAINT "accession_samples_samplenumber_unique";
CREATE UNIQUE INDEX "accession_samples_ws_samplenumber_uq" ON accession_samples (workspaceid, samplenumber);
ALTER TABLE accession_samples DROP CONSTRAINT "accession_samples_barcode_unique";
CREATE UNIQUE INDEX "accession_samples_ws_barcode_uq" ON accession_samples (workspaceid, barcode);
ALTER TABLE equipment DROP CONSTRAINT "equipment_equipmentidcode_unique";
CREATE UNIQUE INDEX "equipment_ws_equipmentidcode_uq" ON equipment (workspaceid, equipmentidcode);
ALTER TABLE laboratory_types DROP CONSTRAINT "laboratory_types_code_unique";
CREATE UNIQUE INDEX "laboratory_types_ws_code_uq" ON laboratory_types (workspaceid, code);
ALTER TABLE study_protocols DROP CONSTRAINT "study_protocols_protocolnumber_unique";
CREATE UNIQUE INDEX "study_protocols_ws_protocolnumber_uq" ON study_protocols (workspaceid, protocolnumber);
ALTER TABLE materials DROP CONSTRAINT "materials_code_unique";
CREATE UNIQUE INDEX "materials_ws_code_uq" ON materials (workspaceid, code);
ALTER TABLE shop_orders DROP CONSTRAINT "shop_orders_ordernumber_unique";
CREATE UNIQUE INDEX "shop_orders_ws_ordernumber_uq" ON shop_orders (workspaceid, ordernumber);
ALTER TABLE storage_locations DROP CONSTRAINT "storage_locations_code_unique";
CREATE UNIQUE INDEX "storage_locations_ws_code_uq" ON storage_locations (workspaceid, code);
ALTER TABLE suppliers DROP CONSTRAINT "suppliers_code_unique";
CREATE UNIQUE INDEX "suppliers_ws_code_uq" ON suppliers (workspaceid, code);
ALTER TABLE specialties DROP CONSTRAINT "specialties_name_key";
CREATE UNIQUE INDEX "specialties_ws_name_uq" ON specialties (workspaceid, name);
ALTER TABLE specialties DROP CONSTRAINT "specialties_code_key";
CREATE UNIQUE INDEX "specialties_ws_code_uq" ON specialties (workspaceid, code);
ALTER TABLE invoices DROP CONSTRAINT "invoices_invoice_number_key";
CREATE UNIQUE INDEX "invoices_ws_invoice_number_uq" ON invoices (workspaceid, invoice_number);
ALTER TABLE services DROP CONSTRAINT "services_code_key";
CREATE UNIQUE INDEX "services_ws_code_uq" ON services (workspaceid, code);
ALTER TABLE insurance_companies DROP CONSTRAINT "insurance_companies_company_code_key";
CREATE UNIQUE INDEX "insurance_companies_ws_company_code_uq" ON insurance_companies (workspaceid, company_code);
ALTER TABLE invoice_returns DROP CONSTRAINT "invoice_returns_return_number_key";
CREATE UNIQUE INDEX "invoice_returns_ws_return_number_uq" ON invoice_returns (workspaceid, return_number);
ALTER TABLE leave_types DROP CONSTRAINT "leave_types_code_key";
CREATE UNIQUE INDEX "leave_types_ws_code_uq" ON leave_types (workspaceid, code);
ALTER TABLE shifts DROP CONSTRAINT "shifts_code_key";
CREATE UNIQUE INDEX "shifts_ws_code_uq" ON shifts (workspaceid, code);
ALTER TABLE employees DROP CONSTRAINT "employees_employee_number_key";
CREATE UNIQUE INDEX "employees_ws_employee_number_uq" ON employees (workspaceid, employee_number);
ALTER TABLE salary_grades DROP CONSTRAINT "salary_grades_grade_code_key";
CREATE UNIQUE INDEX "salary_grades_ws_grade_code_uq" ON salary_grades (workspaceid, grade_code);
ALTER TABLE payroll_periods DROP CONSTRAINT "payroll_periods_period_code_key";
CREATE UNIQUE INDEX "payroll_periods_ws_period_code_uq" ON payroll_periods (workspaceid, period_code);
ALTER TABLE employee_loans DROP CONSTRAINT "employee_loans_loan_number_key";
CREATE UNIQUE INDEX "employee_loans_ws_loan_number_uq" ON employee_loans (workspaceid, loan_number);
ALTER TABLE employee_advances DROP CONSTRAINT "employee_advances_advance_number_key";
CREATE UNIQUE INDEX "employee_advances_ws_advance_number_uq" ON employee_advances (workspaceid, advance_number);
ALTER TABLE bank_transfers DROP CONSTRAINT "bank_transfers_batch_number_key";
CREATE UNIQUE INDEX "bank_transfers_ws_batch_number_uq" ON bank_transfers (workspaceid, batch_number);
ALTER TABLE job_vacancies DROP CONSTRAINT "job_vacancies_vacancy_number_key";
CREATE UNIQUE INDEX "job_vacancies_ws_vacancy_number_uq" ON job_vacancies (workspace_id, vacancy_number);
ALTER TABLE job_candidates DROP CONSTRAINT "job_candidates_candidate_number_key";
CREATE UNIQUE INDEX "job_candidates_ws_candidate_number_uq" ON job_candidates (workspace_id, candidate_number);
ALTER TABLE job_candidates DROP CONSTRAINT "job_candidates_email_key";
CREATE UNIQUE INDEX "job_candidates_ws_email_uq" ON job_candidates (workspace_id, email);
ALTER TABLE manufacturers DROP CONSTRAINT "manufacturers_code_key";
CREATE UNIQUE INDEX "manufacturers_ws_code_uq" ON manufacturers (workspace_id, code);
ALTER TABLE pos_sales DROP CONSTRAINT "pos_sales_salenumber_unique";
CREATE UNIQUE INDEX "pos_sales_ws_salenumber_uq" ON pos_sales (workspaceid, salenumber);
ALTER TABLE pos_shifts DROP CONSTRAINT "pos_shifts_shiftnumber_unique";
CREATE UNIQUE INDEX "pos_shifts_ws_shiftnumber_uq" ON pos_shifts (workspaceid, shiftnumber);
ALTER TABLE hospital_orders DROP CONSTRAINT "hospital_orders_order_number_key";
CREATE UNIQUE INDEX "hospital_orders_ws_order_number_uq" ON hospital_orders (workspace_id, order_number);
ALTER TABLE hospital_goods_receipt DROP CONSTRAINT "hospital_goods_receipt_receipt_number_key";
CREATE UNIQUE INDEX "hospital_goods_receipt_ws_receipt_number_uq" ON hospital_goods_receipt (workspace_id, receipt_number);
ALTER TABLE hospital_purchase_notes DROP CONSTRAINT "hospital_purchase_notes_note_number_key";
CREATE UNIQUE INDEX "hospital_purchase_notes_ws_note_number_uq" ON hospital_purchase_notes (workspace_id, note_number);
ALTER TABLE job_requisitions DROP CONSTRAINT "job_requisitions_requisition_number_key";
CREATE UNIQUE INDEX "job_requisitions_ws_requisition_number_uq" ON job_requisitions (workspace_id, requisition_number);
ALTER TABLE job_applications DROP CONSTRAINT "job_applications_application_number_key";
CREATE UNIQUE INDEX "job_applications_ws_application_number_uq" ON job_applications (workspace_id, application_number);
ALTER TABLE job_offers DROP CONSTRAINT "job_offers_offer_number_key";
CREATE UNIQUE INDEX "job_offers_ws_offer_number_uq" ON job_offers (workspace_id, offer_number);
ALTER TABLE pos_returns DROP CONSTRAINT "pos_returns_returnnumber_key";
CREATE UNIQUE INDEX "pos_returns_ws_returnnumber_uq" ON pos_returns (workspaceid, returnnumber);
ALTER TABLE pharmacy_purchase_orders DROP CONSTRAINT "pharmacy_purchase_orders_order_number_key";
CREATE UNIQUE INDEX "pharmacy_purchase_orders_ws_order_number_uq" ON pharmacy_purchase_orders (workspace_id, order_number);
ALTER TABLE pharmacy_goods_receipt DROP CONSTRAINT "pharmacy_goods_receipt_receipt_number_key";
CREATE UNIQUE INDEX "pharmacy_goods_receipt_ws_receipt_number_uq" ON pharmacy_goods_receipt (workspace_id, receipt_number);
ALTER TABLE insurance_claims DROP CONSTRAINT "insurance_claims_claim_number_key";
CREATE UNIQUE INDEX "insurance_claims_ws_claim_number_uq" ON insurance_claims (workspaceid, claim_number);
ALTER TABLE stakeholders DROP CONSTRAINT "stakeholders_stakeholder_code_key";
CREATE UNIQUE INDEX "stakeholders_ws_stakeholder_code_uq" ON stakeholders (workspaceid, stakeholder_code);
ALTER TABLE ap_invoices DROP CONSTRAINT "ap_invoices_ap_number_key";
CREATE UNIQUE INDEX "ap_invoices_ws_ap_number_uq" ON ap_invoices (workspaceid, ap_number);
ALTER TABLE shareholders DROP CONSTRAINT "shareholders_shareholder_id_key";
CREATE UNIQUE INDEX "shareholders_ws_shareholder_id_uq" ON shareholders (workspaceid, shareholder_id);
