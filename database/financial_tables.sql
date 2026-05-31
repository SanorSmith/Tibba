-- Financial Reporting Database Schema
-- Tables to collect comprehensive financial data

-- 1. Financial Transactions Table (Main transaction log)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'REVENUE', 'EXPENSE', 'PAYROLL', 'INVESTMENT'
    category VARCHAR(100) NOT NULL, -- 'CONSULTATION', 'LAB_TEST', 'SALARY', 'SUPPLIES', etc.
    subcategory VARCHAR(100),
    description TEXT,
    department_id VARCHAR(50),
    department_name VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IQD',
    reference_id VARCHAR(100), -- Links to service_id, invoice_id, payroll_id, etc.
    reference_type VARCHAR(50), -- 'SERVICE', 'INVOICE', 'PAYROLL', 'EXPENSE'
    payment_method VARCHAR(50), -- 'CASH', 'INSURANCE', 'BANK', 'CREDIT'
    status VARCHAR(20) DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Revenue Categories Table  
CREATE TABLE IF NOT EXISTS revenue_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Department Budget Table
CREATE TABLE IF NOT EXISTS department_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id VARCHAR(50) NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    budget_year INTEGER NOT NULL,
    budget_month INTEGER NOT NULL,
    planned_revenue DECIMAL(15,2) DEFAULT 0,
    planned_expenses DECIMAL(15,2) DEFAULT 0,
    actual_revenue DECIMAL(15,2) DEFAULT 0,
    actual_expenses DECIMAL(15,2) DEFAULT 0,
    variance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, budget_year, budget_month)
);

-- 5. Financial Periods Table
CREATE TABLE IF NOT EXISTS financial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(20) NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMP,
    closed_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Financial Summary Table (Aggregated data for fast reporting)
CREATE TABLE IF NOT EXISTS financial_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    department_id VARCHAR(50),
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    net_income DECIMAL(15,2) DEFAULT 0,
    revenue_breakdown JSONB, -- {category: amount, ...}
    expense_breakdown JSONB, -- {category: amount, ...}
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_department ON financial_transactions(department_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX IF NOT EXISTS idx_financial_summary_period ON financial_summary(period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_financial_summary_department ON financial_summary(department_id);

-- Insert default categories
INSERT INTO expense_categories (name, name_ar, description) VALUES
('Salaries & Wages', 'الرواتب والأجور', 'Employee salaries and wages'),
('Medical Supplies', 'المستلزمات الطبية', 'Medical and surgical supplies'),
('Pharmaceuticals', 'الأدوية', 'Medications and drugs'),
('Utilities', 'المرافق', 'Electricity, water, gas'),
('Depreciation', 'الاستهلاك', 'Equipment and building depreciation'),
('Maintenance', 'الصيانة', 'Building and equipment maintenance'),
('Other Expenses', 'مصاريف أخرى', 'Miscellaneous expenses')
ON CONFLICT (name) DO NOTHING;

INSERT INTO revenue_categories (name, name_ar, description) VALUES
('CONSULTATION', 'استشارة', 'Medical consultation fees'),
('LAB TEST', 'فحص مختبر', 'Laboratory test fees'),
('SURGERY', 'جراحة', 'Surgical procedure fees'),
('RADIOLOGY', 'أشعة', 'Radiology and imaging fees'),
('PHARMACY', 'صيدلية', 'Pharmacy sales'),
('THERAPY', 'علاج', 'Physical and other therapy fees'),
('ADMINISTRATIVE', 'إداري', 'Administrative fees'),
('OTHER REVENUE', 'إيرادات أخرى', 'Other revenue sources')
ON CONFLICT (name) DO NOTHING;
