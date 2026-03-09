-- Add settlement rules fields to staff table
-- This supports pension, deductions, and end-of-service settlement calculations

-- Pension configuration
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pension_eligible BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pension_scheme VARCHAR(50) DEFAULT 'STANDARD';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pension_contribution_rate DECIMAL(5,2) DEFAULT 5.00;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employer_pension_rate DECIMAL(5,2) DEFAULT 5.00;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pension_start_date DATE;

-- Deductions configuration
ALTER TABLE staff ADD COLUMN IF NOT EXISTS social_security_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS social_security_rate DECIMAL(5,2) DEFAULT 5.00;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tax_id_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tax_exemption_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS other_deductions JSONB DEFAULT '[]'::jsonb;

-- End-of-service settlement
ALTER TABLE staff ADD COLUMN IF NOT EXISTS settlement_eligible BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS settlement_calculation_method VARCHAR(50) DEFAULT 'IRAQI_LABOR_LAW';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gratuity_eligible BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;

-- Settlement history
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_settlement_date DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_settlement_amount DECIMAL(15,2);

-- Comments for documentation
COMMENT ON COLUMN staff.pension_eligible IS 'Whether employee is eligible for pension scheme';
COMMENT ON COLUMN staff.pension_scheme IS 'Pension scheme type: STANDARD, GOVERNMENT, PRIVATE, NONE';
COMMENT ON COLUMN staff.pension_contribution_rate IS 'Employee pension contribution percentage';
COMMENT ON COLUMN staff.employer_pension_rate IS 'Employer pension contribution percentage';
COMMENT ON COLUMN staff.pension_start_date IS 'Date when pension contributions started';

COMMENT ON COLUMN staff.social_security_number IS 'Social security/insurance number';
COMMENT ON COLUMN staff.social_security_rate IS 'Social security deduction percentage (default 5%)';
COMMENT ON COLUMN staff.tax_id_number IS 'Tax identification number';
COMMENT ON COLUMN staff.tax_exemption_amount IS 'Monthly tax exemption amount in IQD';
COMMENT ON COLUMN staff.other_deductions IS 'Array of other deductions: [{name, amount, type, frequency}]';

COMMENT ON COLUMN staff.settlement_eligible IS 'Whether employee is eligible for end-of-service settlement';
COMMENT ON COLUMN staff.settlement_calculation_method IS 'Method for calculating settlement: IRAQI_LABOR_LAW, CUSTOM';
COMMENT ON COLUMN staff.gratuity_eligible IS 'Whether employee is eligible for gratuity/end-of-service benefits';
COMMENT ON COLUMN staff.notice_period_days IS 'Required notice period in days';

COMMENT ON COLUMN staff.last_settlement_date IS 'Date of last settlement payment';
COMMENT ON COLUMN staff.last_settlement_amount IS 'Amount of last settlement payment';
