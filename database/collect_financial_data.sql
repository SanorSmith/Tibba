-- Financial Data Collection Script
-- This script collects and aggregates financial data from various tables
-- Run this periodically (daily/weekly) to populate financial_transactions table

-- 1. Collect Service Revenue
INSERT INTO financial_transactions (
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
    payment_method,
    status
)
SELECT 
    DATE(createdat) as transaction_date,
    'REVENUE' as transaction_type,
    UPPER(category) as category,
    subcategory,
    name || ' - ' || COALESCE(description, 'Service fee') as description,
    department_id,
    (SELECT name FROM departments WHERE departmentid = s.department_id LIMIT 1) as department_name,
    (price_self_pay + price_insurance + price_government) as amount,
    id as reference_id,
    'SERVICE' as reference_type,
    'MIXED' as payment_method,
    'COMPLETED' as status
FROM services s
WHERE active = true
    AND id NOT IN (
        SELECT reference_id 
        FROM financial_transactions 
        WHERE reference_type = 'SERVICE'
    )
ON CONFLICT (reference_id, reference_type) DO NOTHING;

-- 2. Collect Invoice Revenue (Only from invoices table)
INSERT INTO financial_transactions (
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
    payment_method,
    status
)
SELECT 
    DATE(invoice_date) as transaction_date,
    'REVENUE' as transaction_type,
    'INVOICE_REVENUE' as category,
    'PAID' as subcategory,
    'Invoice: ' || invoice_number || ' - ' || patient_name as description,
    NULL as department_id,
    NULL as department_name,
    total_amount as amount,
    id as reference_id,
    'INVOICE' as reference_type,
    COALESCE(payment_method, 'MIXED') as payment_method,
    status
FROM invoices
WHERE status = 'PAID'
    AND id NOT IN (
        SELECT reference_id 
        FROM financial_transactions 
        WHERE reference_type = 'INVOICE'
    )
ON CONFLICT (reference_id, reference_type) DO NOTHING;

-- 3. Collect Payroll Expenses
INSERT INTO financial_transactions (
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
    payment_method,
    status
)
SELECT 
    DATE(createdat) as transaction_date,
    'EXPENSE' as transaction_type,
    'SALARIES_WAGES' as category,
    transaction_type as subcategory,
    'Payroll: ' || COALESCE(employee_id, 'Unknown') || ' - ' || COALESCE(period_id, 'Unknown period') as description,
    NULL as department_id,
    NULL as department_name,
    CASE 
        WHEN transaction_type = 'EARNING' THEN amount
        ELSE 0 
    END as amount,
    id as reference_id,
    'PAYROLL' as reference_type,
    'BANK' as payment_method,
    'COMPLETED' as status
FROM payroll_transactions
WHERE transaction_type = 'EARNING'
    AND id NOT IN (
        SELECT reference_id 
        FROM financial_transactions 
        WHERE reference_type = 'PAYROLL'
    )
ON CONFLICT (reference_id, reference_type) DO NOTHING;

-- 4. Update Financial Summary Table (Aggregated data for fast reporting)
INSERT INTO financial_summary (
    period_type,
    period_start,
    period_end,
    department_id,
    total_revenue,
    total_expenses,
    net_income,
    revenue_breakdown,
    expense_breakdown,
    transaction_count
)
SELECT 
    'MONTHLY' as period_type,
    DATE_TRUNC('month', CURRENT_DATE) as period_start,
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day' as period_end,
    department_id,
    SUM(CASE WHEN transaction_type = 'REVENUE' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN transaction_type = 'REVENUE' THEN amount ELSE 0 END) - 
    SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END) as net_income,
    jsonb_object_agg(
        CASE WHEN transaction_type = 'REVENUE' THEN category ELSE NULL END,
        CASE WHEN transaction_type = 'REVENUE' THEN amount ELSE 0 END
    ) FILTER (WHERE transaction_type = 'REVENUE') as revenue_breakdown,
    jsonb_object_agg(
        CASE WHEN transaction_type = 'EXPENSE' THEN category ELSE NULL END,
        CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END
    ) FILTER (WHERE transaction_type = 'EXPENSE') as expense_breakdown,
    COUNT(*) as transaction_count
FROM financial_transactions
WHERE DATE(transaction_date) >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY department_id
ON CONFLICT (period_type, period_start, period_end, department_id) 
DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_expenses = EXCLUDED.total_expenses,
    net_income = EXCLUDED.net_income,
    revenue_breakdown = EXCLUDED.revenue_breakdown,
    expense_breakdown = EXCLUDED.expense_breakdown,
    transaction_count = EXCLUDED.transaction_count,
    updated_at = CURRENT_TIMESTAMP;

-- 5. Create Monthly Financial Periods (if not exists)
INSERT INTO financial_periods (
    period_type,
    start_date,
    end_date
)
SELECT 
    'MONTHLY' as period_type,
    DATE_TRUNC('month', series_month) as start_date,
    DATE_TRUNC('month', series_month) + INTERVAL '1 month' - INTERVAL '1 day' as end_date
FROM generate_series(
    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months',
    DATE_TRUNC('month', CURRENT_DATE),
    INTERVAL '1 month'
) as series_month
ON CONFLICT (period_type, start_date, end_date) DO NOTHING;

-- Verification queries
SELECT 
    'Financial Transactions Collected' as status,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN transaction_type = 'REVENUE' THEN amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END) as total_expenses,
    COUNT(DISTINCT DATE(transaction_date)) as days_covered
FROM financial_transactions;

SELECT 
    'Financial Summary Updated' as status,
    COUNT(*) as summary_records,
    SUM(total_revenue) as summary_revenue,
    SUM(total_expenses) as summary_expenses,
    SUM(net_income) as summary_net_income
FROM financial_summary
WHERE period_type = 'MONTHLY';
