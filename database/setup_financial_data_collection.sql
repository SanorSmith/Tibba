-- Financial Data Collection Setup
-- This script creates tables to collect and store financial data from your existing system

-- 1. Financial Summary Table (stores aggregated data for fast reporting)
CREATE TABLE IF NOT EXISTS financial_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(20) NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    department_id VARCHAR(50),
    department_name VARCHAR(255),
    
    -- Revenue totals
    total_revenue DECIMAL(15,2) DEFAULT 0,
    service_revenue DECIMAL(15,2) DEFAULT 0,
    invoice_revenue DECIMAL(15,2) DEFAULT 0,
    insurance_revenue DECIMAL(15,2) DEFAULT 0,
    patient_revenue DECIMAL(15,2) DEFAULT 0,
    
    -- Expense totals
    total_expenses DECIMAL(15,2) DEFAULT 0,
    payroll_expenses DECIMAL(15,2) DEFAULT 0,
    
    -- Calculated fields
    net_income DECIMAL(15,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    
    -- Breakdown data (JSON)
    revenue_breakdown JSONB, -- {"category": amount, ...}
    expense_breakdown JSONB, -- {"category": amount, ...}
    
    -- Metadata
    transaction_count INTEGER DEFAULT 0,
    data_source VARCHAR(50) DEFAULT 'DATABASE', -- 'DATABASE', 'MANUAL', 'IMPORTED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(period_type, period_start, period_end, department_id)
);

-- 2. Financial Transactions Log (detailed transaction records)
CREATE TABLE IF NOT EXISTS financial_transactions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'REVENUE', 'EXPENSE'
    category VARCHAR(100) NOT NULL, -- 'CONSULTATION', 'LAB_TEST', 'SALARIES', etc.
    subcategory VARCHAR(100),
    description TEXT,
    
    -- Department info
    department_id VARCHAR(50),
    department_name VARCHAR(255),
    
    -- Amount info
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IQD',
    
    -- Reference to original record
    reference_id VARCHAR(100),
    reference_type VARCHAR(50), -- 'SERVICE', 'INVOICE', 'PAYROLL', etc.
    reference_table VARCHAR(50),
    
    -- Payment info
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'COMPLETED',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_financial_log_date (transaction_date),
    INDEX idx_financial_log_type (transaction_type),
    INDEX idx_financial_log_category (category),
    INDEX idx_financial_log_department (department_id),
    INDEX idx_financial_log_reference (reference_type, reference_id)
);

-- 3. Financial Data Collection Jobs (automated data collection schedule)
CREATE TABLE IF NOT EXISTS financial_collection_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL UNIQUE,
    job_type VARCHAR(50) NOT NULL, -- 'SERVICE_REVENUE', 'INVOICE_REVENUE', 'PAYROLL_EXPENSES'
    
    -- Schedule info
    schedule_type VARCHAR(20) NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY'
    schedule_time TIME DEFAULT '02:00:00', -- Run at 2 AM
    
    -- Job status
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    run_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED'
    
    -- Job results
    last_run_duration INTEGER, -- seconds
    last_run_records_processed INTEGER,
    last_run_error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Financial Data Sources (tracks where data comes from)
CREATE TABLE IF NOT EXISTS financial_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(100) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL, -- 'TABLE', 'VIEW', 'API', 'MANUAL'
    source_reference VARCHAR(255), -- table name, API endpoint, etc.
    
    -- Data mapping
    date_field VARCHAR(100), -- field name for date filtering
    amount_field VARCHAR(100), -- field name for amount
    category_field VARCHAR(100), -- field name for category
    department_field VARCHAR(100), -- field name for department
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'PENDING',
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data sources
INSERT INTO financial_data_sources (source_name, source_type, source_reference, date_field, amount_field, category_field, department_field, description) VALUES
('Services Revenue', 'TABLE', 'services', 'createdat', 'price_self_pay + price_insurance + price_government', 'category', 'department_id', 'Service pricing revenue from services table'),
('Invoice Revenue', 'TABLE', 'invoices', 'invoice_date', 'total_amount', 'INVOICE_REVENUE', NULL, 'Actual collected revenue from invoices'),
('Insurance Payments', 'TABLE', 'invoices', 'invoice_date', 'insurance_coverage_amount', 'INSURANCE_PAYMENTS', NULL, 'Insurance company payments from invoices'),
('Patient Payments', 'TABLE', 'invoices', 'invoice_date', 'patient_responsibility', 'PATIENT_PAYMENTS', NULL, 'Patient out-of-pocket payments from invoices'),
('Payroll Expenses', 'TABLE', 'payroll_transactions', 'createdat', 'amount', 'SALARIES_WAGES', NULL, 'Employee salaries and wages from payroll transactions')
ON CONFLICT (source_name) DO NOTHING;

-- Insert default collection jobs
INSERT INTO financial_collection_jobs (job_name, job_type, schedule_type, next_run_at) VALUES
('Collect Service Revenue', 'SERVICE_REVENUE', 'DAILY', CURRENT_DATE + INTERVAL '1 day' + TIME '02:00:00'),
('Collect Invoice Revenue', 'INVOICE_REVENUE', 'DAILY', CURRENT_DATE + INTERVAL '1 day' + TIME '02:05:00'),
('Collect Payroll Data', 'PAYROLL_EXPENSES', 'WEEKLY', CURRENT_DATE + INTERVAL '1 week' + TIME '02:10:00')
ON CONFLICT (job_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_summary_period ON financial_summary(period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_financial_summary_department ON financial_summary(department_id);
CREATE INDEX IF NOT EXISTS idx_financial_summary_date_range ON financial_summary(period_start, period_end);

-- Create function to update financial summary
CREATE OR REPLACE FUNCTION update_financial_summary(
    p_period_type VARCHAR(20),
    p_period_start DATE,
    p_period_end DATE,
    p_department_id VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_total_revenue DECIMAL(15,2);
    v_total_expenses DECIMAL(15,2);
    v_net_income DECIMAL(15,2);
    v_profit_margin DECIMAL(5,2);
    v_revenue_breakdown JSONB;
    v_expense_breakdown JSONB;
    v_transaction_count INTEGER;
    v_department_name VARCHAR(255);
BEGIN
    -- Get department name if department_id provided
    IF p_department_id IS NOT NULL THEN
        SELECT name INTO v_department_name
        FROM departments
        WHERE departmentid = p_department_id
        LIMIT 1;
    END IF;
    
    -- Calculate revenue breakdown
    SELECT jsonb_object_agg(category, revenue) INTO v_revenue_breakdown
    FROM (
        SELECT category, SUM(amount) as revenue
        FROM financial_transactions_log
        WHERE transaction_type = 'REVENUE'
            AND transaction_date BETWEEN p_period_start AND p_period_end
            AND (p_department_id IS NULL OR department_id = p_department_id)
        GROUP BY category
    ) revenue_data;
    
    -- Calculate expense breakdown
    SELECT jsonb_object_agg(category, expenses) INTO v_expense_breakdown
    FROM (
        SELECT category, SUM(amount) as expenses
        FROM financial_transactions_log
        WHERE transaction_type = 'EXPENSE'
            AND transaction_date BETWEEN p_period_start AND p_period_end
            AND (p_department_id IS NULL OR department_id = p_department_id)
        GROUP BY category
    ) expense_data;
    
    -- Calculate totals
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'REVENUE' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END), 0),
        COUNT(*)
    INTO v_total_revenue, v_total_expenses, v_transaction_count
    FROM financial_transactions_log
    WHERE transaction_date BETWEEN p_period_start AND p_period_end
        AND (p_department_id IS NULL OR department_id = p_department_id);
    
    -- Calculate net income and profit margin
    v_net_income := v_total_revenue - v_total_expenses;
    v_profit_margin := CASE WHEN v_total_revenue > 0 THEN (v_net_income / v_total_revenue) * 100 ELSE 0 END;
    
    -- Insert or update financial summary
    INSERT INTO financial_summary (
        period_type, period_start, period_end, department_id, department_name,
        total_revenue, total_expenses, net_income, profit_margin,
        revenue_breakdown, expense_breakdown, transaction_count,
        updated_at
    ) VALUES (
        p_period_type, p_period_start, p_period_end, p_department_id, v_department_name,
        v_total_revenue, v_total_expenses, v_net_income, v_profit_margin,
        v_revenue_breakdown, v_expense_breakdown, v_transaction_count,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (period_type, period_start, period_end, department_id)
    DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_expenses = EXCLUDED.total_expenses,
        net_income = EXCLUDED.net_income,
        profit_margin = EXCLUDED.profit_margin,
        revenue_breakdown = EXCLUDED.revenue_breakdown,
        expense_breakdown = EXCLUDED.expense_breakdown,
        transaction_count = EXCLUDED.transaction_count,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create view for current month financial summary
CREATE OR REPLACE VIEW current_month_financial_summary AS
SELECT 
    period_start,
    period_end,
    department_name,
    total_revenue,
    total_expenses,
    net_income,
    profit_margin,
    revenue_breakdown,
    expense_breakdown,
    transaction_count
FROM financial_summary
WHERE period_type = 'MONTHLY'
    AND period_start = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY total_revenue DESC;

COMMENT ON TABLE financial_summary IS 'Aggregated financial data for fast reporting and dashboard display';
COMMENT ON TABLE financial_transactions_log IS 'Detailed log of all financial transactions from source tables';
COMMENT ON TABLE financial_collection_jobs IS 'Automated jobs for collecting financial data from various sources';
COMMENT ON TABLE financial_data_sources IS 'Configuration of data sources for financial reporting';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON financial_summary TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON financial_transactions_log TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON financial_collection_jobs TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON financial_data_sources TO your_app_user;
-- GRANT EXECUTE ON FUNCTION update_financial_summary TO your_app_user;
