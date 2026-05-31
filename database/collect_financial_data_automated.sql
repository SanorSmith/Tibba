-- Automated Financial Data Collection Script
-- This script collects financial data from your existing tables and stores it in the financial tables
-- Run this script daily/weekly to keep financial data up to date

-- Set the date range for collection (can be parameterized)
\set start_date '2026-01-01'
\set end_date '2026-12-31'

-- 1. COLLECT SERVICE REVENUE
INSERT INTO financial_transactions_log (
    transaction_date,
    transaction_type,
    category,
    subcategory,
    description,
    department_id,
    department_name,
    amount,
    reference_id,
    reference_type,
    reference_table,
    payment_method,
    payment_status
)
SELECT 
    DATE(s.createdat) as transaction_date,
    'REVENUE' as transaction_type,
    UPPER(s.category) as category,
    s.subcategory,
    s.name || ' - ' || COALESCE(s.description, 'Service fee') as description,
    s.department_id,
    d.name as department_name,
    (s.price_self_pay + s.price_insurance + s.price_government) as amount,
    s.id as reference_id,
    'SERVICE' as reference_type,
    'services' as reference_table,
    'MIXED' as payment_method,
    'COMPLETED' as payment_status
FROM services s
LEFT JOIN departments d ON s.department_id = d.departmentid
WHERE s.active = true
    AND DATE(s.createdat) BETWEEN :start_date AND :end_date
    AND s.id NOT IN (
        SELECT reference_id 
        FROM financial_transactions_log 
        WHERE reference_type = 'SERVICE' 
            AND reference_table = 'services'
    )
ON CONFLICT (reference_id, reference_type, reference_table) DO NOTHING;

-- 2. COLLECT INVOICE REVENUE (Actual collected payments)
INSERT INTO financial_transactions_log (
    transaction_date,
    transaction_type,
    category,
    subcategory,
    description,
    department_id,
    department_name,
    amount,
    reference_id,
    reference_type,
    reference_table,
    payment_method,
    payment_status
)
SELECT 
    DATE(i.invoice_date) as transaction_date,
    'REVENUE' as transaction_type,
    'INVOICE_REVENUE' as category,
    'COLLECTED' as subcategory,
    'Invoice: ' || i.invoice_number || ' - ' || i.patient_name as description,
    NULL as department_id,
    NULL as department_name,
    i.total_amount as amount,
    i.id as reference_id,
    'INVOICE' as reference_type,
    'invoices' as reference_table,
    COALESCE(i.payment_method, 'MIXED') as payment_method,
    i.status as payment_status
FROM invoices i
WHERE i.status = 'PAID'
    AND DATE(i.invoice_date) BETWEEN :start_date AND :end_date
    AND i.id NOT IN (
        SELECT reference_id 
        FROM financial_transactions_log 
        WHERE reference_type = 'INVOICE' 
            AND reference_table = 'invoices'
    )
ON CONFLICT (reference_id, reference_type, reference_table) DO NOTHING;

-- 3. COLLECT INSURANCE PAYMENTS
INSERT INTO financial_transactions_log (
    transaction_date,
    transaction_type,
    category,
    subcategory,
    description,
    department_id,
    department_name,
    amount,
    reference_id,
    reference_type,
    reference_table,
    payment_method,
    payment_status
)
SELECT 
    DATE(i.invoice_date) as transaction_date,
    'REVENUE' as transaction_type,
    'INSURANCE_PAYMENTS' as category,
    'INSURANCE' as subcategory,
    'Insurance payment for: ' || i.invoice_number || ' - ' || i.patient_name as description,
    NULL as department_id,
    NULL as department_name,
    i.insurance_coverage_amount as amount,
    i.id || '_INSURANCE' as reference_id,
    'INSURANCE_PAYMENT' as reference_type,
    'invoices' as reference_table,
    'INSURANCE' as payment_method,
    CASE WHEN i.status = 'PAID' THEN 'COMPLETED' ELSE 'PENDING' END as payment_status
FROM invoices i
WHERE i.status = 'PAID' 
    AND i.insurance_coverage_amount > 0
    AND DATE(i.invoice_date) BETWEEN :start_date AND :end_date
    AND i.id || '_INSURANCE' NOT IN (
        SELECT reference_id 
        FROM financial_transactions_log 
        WHERE reference_type = 'INSURANCE_PAYMENT' 
            AND reference_table = 'invoices'
    )
ON CONFLICT (reference_id, reference_type, reference_table) DO NOTHING;

-- 4. COLLECT PATIENT PAYMENTS (Out-of-pocket)
INSERT INTO financial_transactions_log (
    transaction_date,
    transaction_type,
    category,
    subcategory,
    description,
    department_id,
    department_name,
    amount,
    reference_id,
    reference_type,
    reference_table,
    payment_method,
    payment_status
)
SELECT 
    DATE(i.invoice_date) as transaction_date,
    'REVENUE' as transaction_type,
    'PATIENT_PAYMENTS' as category,
    'PATIENT' as subcategory,
    'Patient payment for: ' || i.invoice_number || ' - ' || i.patient_name as description,
    NULL as department_id,
    NULL as department_name,
    i.patient_responsibility as amount,
    i.id || '_PATIENT' as reference_id,
    'PATIENT_PAYMENT' as reference_type,
    'invoices' as reference_table,
    'PATIENT' as payment_method,
    CASE WHEN i.status = 'PAID' THEN 'COMPLETED' ELSE 'PENDING' END as payment_status
FROM invoices i
WHERE i.status = 'PAID' 
    AND i.patient_responsibility > 0
    AND DATE(i.invoice_date) BETWEEN :start_date AND :end_date
    AND i.id || '_PATIENT' NOT IN (
        SELECT reference_id 
        FROM financial_transactions_log 
        WHERE reference_type = 'PATIENT_PAYMENT' 
            AND reference_table = 'invoices'
    )
ON CONFLICT (reference_id, reference_type, reference_table) DO NOTHING;

-- 5. COLLECT PAYROLL EXPENSES
INSERT INTO financial_transactions_log (
    transaction_date,
    transaction_type,
    category,
    subcategory,
    description,
    department_id,
    department_name,
    amount,
    reference_id,
    reference_type,
    reference_table,
    payment_method,
    payment_status
)
SELECT 
    DATE(pt.createdat) as transaction_date,
    'EXPENSE' as transaction_type,
    'SALARIES_WAGES' as category,
    pt.transaction_type as subcategory,
    'Payroll: ' || COALESCE(pt.employee_id, 'Unknown') || ' - ' || COALESCE(pt.period_id, 'Unknown period') as description,
    NULL as department_id,
    'HR Department' as department_name,
    pt.amount as amount,
    pt.id as reference_id,
    'PAYROLL' as reference_type,
    'payroll_transactions' as reference_table,
    'BANK' as payment_method,
    'COMPLETED' as payment_status
FROM payroll_transactions pt
WHERE pt.transaction_type = 'EARNING'
    AND DATE(pt.createdat) BETWEEN :start_date AND :end_date
    AND pt.id NOT IN (
        SELECT reference_id 
        FROM financial_transactions_log 
        WHERE reference_type = 'PAYROLL' 
            AND reference_table = 'payroll_transactions'
    )
ON CONFLICT (reference_id, reference_type, reference_table) DO NOTHING;

-- 6. UPDATE FINANCIAL SUMMARY FOR DIFFERENT PERIODS

-- Daily summary
SELECT update_financial_summary(
    'DAILY',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE - INTERVAL '1 day',
    NULL
);

-- Weekly summary (current week)
SELECT update_financial_summary(
    'WEEKLY',
    DATE_TRUNC('week', CURRENT_DATE),
    DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days',
    NULL
);

-- Monthly summary (current month)
SELECT update_financial_summary(
    'MONTHLY',
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    NULL
);

-- Quarterly summary (current quarter)
SELECT update_financial_summary(
    'QUARTERLY',
    DATE_TRUNC('quarter', CURRENT_DATE),
    DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day',
    NULL
);

-- Yearly summary (current year)
SELECT update_financial_summary(
    'YEARLY',
    DATE_TRUNC('year', CURRENT_DATE),
    DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day',
    NULL
);

-- 7. UPDATE COLLECTION JOB STATUS
UPDATE financial_collection_jobs 
SET 
    last_run_at = CURRENT_TIMESTAMP,
    next_run_at = CASE 
        WHEN schedule_type = 'DAILY' THEN CURRENT_DATE + INTERVAL '1 day' + INTERVAL '2 hours'
        WHEN schedule_type = 'WEEKLY' THEN CURRENT_DATE + INTERVAL '1 week' + INTERVAL '2 hours'
        WHEN schedule_type = 'MONTHLY' THEN CURRENT_DATE + INTERVAL '1 month' + INTERVAL '2 hours'
    END,
    run_status = 'SUCCESS',
    last_run_duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - (SELECT last_run_at FROM financial_collection_jobs WHERE job_name = 'Collect Service Revenue' LIMIT 1))),
    last_run_records_processed = (
        SELECT COUNT(*) 
        FROM financial_transactions_log 
        WHERE DATE(createdat) = CURRENT_DATE - INTERVAL '1 day'
    )
WHERE job_name IN ('Collect Service Revenue', 'Collect Invoice Revenue', 'Collect Payroll Data');

-- 8. VERIFICATION QUERIES
SELECT 
    'Financial Data Collection Summary' as report_type,
    COUNT(DISTINCT DATE(transaction_date)) as days_collected,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN transaction_type = 'REVENUE' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END) as total_expenses,
    SUM(amount) as total_amount,
    MIN(transaction_date) as earliest_transaction,
    MAX(transaction_date) as latest_transaction
FROM financial_transactions_log;

SELECT 
    'Financial Summary Status' as report_type,
    period_type,
    COUNT(*) as summary_records,
    SUM(total_revenue) as summary_revenue,
    SUM(total_expenses) as summary_expenses,
    SUM(net_income) as summary_net_income,
    AVG(profit_margin) as avg_profit_margin
FROM financial_summary
GROUP BY period_type
ORDER BY period_type;

SELECT 
    'Collection Jobs Status' as report_type,
    job_name,
    job_type,
    schedule_type,
    run_status,
    last_run_at,
    next_run_at,
    last_run_records_processed
FROM financial_collection_jobs
ORDER BY next_run_at;

-- 9. CLEANUP OLD DATA (optional - keep last 2 years)
DELETE FROM financial_transactions_log 
WHERE transaction_date < CURRENT_DATE - INTERVAL '2 years';

DELETE FROM financial_summary 
WHERE period_end < CURRENT_DATE - INTERVAL '2 years';

-- 10. OPTIMIZE TABLES (run periodically)
VACUUM ANALYZE financial_transactions_log;
VACUUM ANALYZE financial_summary;
VACUUM ANALYZE financial_collection_jobs;
VACUUM ANALYZE financial_data_sources;

-- Output completion message
SELECT 
    'Financial Data Collection Completed' as status,
    CURRENT_TIMESTAMP as completed_at,
    'Data collected from services, invoices, and payroll tables' as details;
