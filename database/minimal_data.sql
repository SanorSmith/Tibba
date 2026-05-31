-- MINIMAL DATA - Copy and paste this directly into your SQL session
-- Execute line by line if needed

-- First, insert departments
INSERT INTO departments (departmentid, name, description, active, createdat, updatedat) 
VALUES ('DEPT002', 'Laboratory', 'Clinical laboratory testing', true, '2026-03-01', '2026-03-01');

-- Insert one service for lab
INSERT INTO services (code, name, category, price_self_pay, price_insurance, price_government, department_id, active, createdat, updatedat)
VALUES ('LAB001', 'Blood Test', 'LAB TEST', 435000, 391500, 348000, 'DEPT002', true, '2026-03-19', '2026-03-19');

-- Insert one invoice
INSERT INTO invoices (invoice_number, invoice_date, total_amount, status, createdat, updatedat)
VALUES ('INV001', '2026-03-19', 520000, 'PAID', '2026-03-19', '2026-03-19');

-- Insert one payroll transaction
INSERT INTO payroll_transactions (employee_id, period_id, transaction_type, amount, createdat, updatedat)
VALUES ('EMP001', '2026-03', 'EARNING', 35000000, '2026-03-01', '2026-03-01');

-- Verify
SELECT 'Data inserted' as status, CURRENT_TIMESTAMP as time;
