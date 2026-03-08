-- =====================================================
-- PAYROLL SYSTEM SEED DATA
-- Initial configuration and reference data
-- =====================================================

-- =====================================================
-- 1. SALARY GRADES (10 Levels)
-- =====================================================

INSERT INTO salary_grades (
  grade_code, grade_name, grade_name_ar, grade_level,
  min_salary, max_salary, standard_salary,
  housing_percentage, transport_percentage, meal_percentage,
  currency, is_active
) VALUES
-- Grade 1: Entry Level
('G1', 'Entry Level', 'مستوى مبتدئ', 1,
 800, 1200, 1000,
 25.00, 10.00, 5.00,
 'USD', true),

-- Grade 2: Junior Professional
('G2', 'Junior Professional', 'محترف مبتدئ', 2,
 1200, 1800, 1500,
 25.00, 10.00, 5.00,
 'USD', true),

-- Grade 3: Junior Professional II
('G3', 'Junior Professional II', 'محترف مبتدئ ٢', 3,
 1800, 2500, 2000,
 28.00, 12.00, 7.00,
 'USD', true),

-- Grade 4: Mid-Level Professional
('G4', 'Mid-Level Professional', 'محترف متوسط', 4,
 2500, 3500, 3000,
 30.00, 12.00, 8.00,
 'USD', true),

-- Grade 5: Mid-Level Professional II
('G5', 'Mid-Level Professional II', 'محترف متوسط ٢', 5,
 3500, 4500, 4000,
 32.00, 13.00, 8.00,
 'USD', true),

-- Grade 6: Senior Professional
('G6', 'Senior Professional', 'محترف أول', 6,
 4500, 6000, 5000,
 35.00, 13.00, 9.00,
 'USD', true),

-- Grade 7: Senior Professional II
('G7', 'Senior Professional II', 'محترف أول ٢', 7,
 6000, 7500, 6500,
 35.00, 14.00, 9.00,
 'USD', true),

-- Grade 8: Specialist/Supervisor
('G8', 'Specialist/Supervisor', 'أخصائي/مشرف', 8,
 7500, 9000, 8000,
 38.00, 14.00, 10.00,
 'USD', true),

-- Grade 9: Manager/Department Head
('G9', 'Manager/Department Head', 'مدير/رئيس قسم', 9,
 9000, 12000, 10000,
 40.00, 15.00, 10.00,
 'USD', true),

-- Grade 10: Senior Manager/Director
('G10', 'Senior Manager/Director', 'مدير أول/مدير عام', 10,
 12000, 18000, 15000,
 40.00, 15.00, 10.00,
 'USD', true);

-- Update allowances based on percentages for each grade
UPDATE salary_grades SET
  housing_allowance = standard_salary * (housing_percentage / 100),
  transport_allowance = standard_salary * (transport_percentage / 100),
  meal_allowance = standard_salary * (meal_percentage / 100);

-- =====================================================
-- 2. SOCIAL SECURITY RULES
-- =====================================================

-- Iraq Social Security
INSERT INTO social_security_rules (
  rule_code, rule_name, country_code, region,
  employee_contribution_rate, employer_contribution_rate,
  min_salary_cap, max_salary_cap,
  effective_from, is_active
) VALUES
('IQ-SS-2024', 'Iraq Social Security 2024', 'IQ', 'Iraq',
 5.00, 12.00,
 NULL, NULL,
 '2024-01-01', true),

-- UAE Social Security (for reference)
('AE-SS-2024', 'UAE Social Security 2024', 'AE', 'UAE',
 5.00, 12.50,
 NULL, NULL,
 '2024-01-01', true),

-- Generic/Configurable
('GENERIC-SS', 'Generic Social Security', 'XX', 'Global',
 9.00, 9.00,
 NULL, NULL,
 '2024-01-01', true);

-- =====================================================
-- 3. CURRENCY EXCHANGE RATES
-- =====================================================

-- USD to IQD
INSERT INTO currency_exchange_rates (
  from_currency, to_currency, exchange_rate,
  effective_from, is_active, source
) VALUES
('USD', 'IQD', 1310.00, '2024-01-01', true, 'CENTRAL_BANK'),
('IQD', 'USD', 0.000763, '2024-01-01', true, 'CENTRAL_BANK'),

-- USD to AED (for reference)
('USD', 'AED', 3.67, '2024-01-01', true, 'CENTRAL_BANK'),
('AED', 'USD', 0.272, '2024-01-01', true, 'CENTRAL_BANK'),

-- IQD to AED (for reference)
('IQD', 'AED', 0.0028, '2024-01-01', true, 'CENTRAL_BANK'),
('AED', 'IQD', 357.00, '2024-01-01', true, 'CENTRAL_BANK');

-- =====================================================
-- 4. SAMPLE PAYROLL PERIOD
-- =====================================================

-- Create current month period
INSERT INTO payroll_periods (
  period_code, period_name, period_type,
  start_date, end_date, payment_date,
  status
) VALUES
('2026-03', 'March 2026', 'MONTHLY',
 '2026-03-01', '2026-03-31', '2026-04-05',
 'DRAFT');

-- =====================================================
-- 5. ASSIGN COMPENSATION TO EXISTING STAFF
-- =====================================================

-- This will assign salary grades to existing staff based on their current basic_salary
-- Assuming staff table has basic_salary column

-- First, let's create a function to auto-assign grades
CREATE OR REPLACE FUNCTION assign_salary_grade(p_basic_salary DECIMAL)
RETURNS UUID AS $$
DECLARE
  v_grade_id UUID;
BEGIN
  SELECT id INTO v_grade_id
  FROM salary_grades
  WHERE p_basic_salary BETWEEN min_salary AND max_salary
    AND is_active = true
  ORDER BY grade_level DESC
  LIMIT 1;
  
  RETURN v_grade_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-assign compensation to existing staff
-- Using default salary of 2000 USD for all staff (can be updated later)
INSERT INTO employee_compensation (
  employee_id,
  salary_grade_id,
  basic_salary,
  housing_allowance,
  transport_allowance,
  meal_allowance,
  effective_from,
  is_active,
  currency
)
SELECT 
  s.staffid,
  assign_salary_grade(2000), -- Default to Grade 3 (2000 USD)
  2000, -- Default basic salary
  2000 * 0.30, -- 30% housing = 600
  2000 * 0.12, -- 12% transport = 240
  2000 * 0.08, -- 8% meal = 160
  COALESCE(s.createdat::date, CURRENT_DATE),
  true,
  'USD'
FROM staff s
WHERE NOT EXISTS (
  SELECT 1 FROM employee_compensation ec 
  WHERE ec.employee_id = s.staffid AND ec.is_active = true
);

-- =====================================================
-- 6. INITIALIZE END OF SERVICE PROVISIONS
-- =====================================================

-- Calculate end of service provisions for all active employees
-- Using createdat as hire_date since dateofhire doesn't exist
INSERT INTO end_of_service_provisions (
  employee_id,
  employee_name,
  employee_number,
  hire_date,
  years_of_service,
  months_of_service,
  calculation_basis,
  basic_salary,
  total_allowances,
  daily_rate,
  days_entitled,
  provision_amount,
  accrued_amount,
  years_1_to_5_days,
  years_6_plus_days,
  last_calculation_date
)
SELECT 
  s.staffid,
  CONCAT(s.firstname, ' ', COALESCE(s.lastname, '')),
  COALESCE(s.custom_staff_id, s.staffid::text),
  s.createdat::date,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date)),
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.createdat::date)),
  'LAST_SALARY',
  ec.basic_salary,
  ec.housing_allowance + ec.transport_allowance + ec.meal_allowance,
  (ec.basic_salary + ec.housing_allowance + ec.transport_allowance + ec.meal_allowance) / 30,
  -- Calculate days entitled
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date)) <= 5 THEN
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date))::INTEGER * 21
    ELSE
      (5 * 21) + ((EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date))::INTEGER - 5) * 30)
  END,
  -- Calculate provision amount
  ((ec.basic_salary + ec.housing_allowance + ec.transport_allowance + ec.meal_allowance) / 30) *
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date)) <= 5 THEN
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date))::INTEGER * 21
    ELSE
      (5 * 21) + ((EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date))::INTEGER - 5) * 30)
  END,
  -- Accrued amount (same as provision for now)
  ((ec.basic_salary + ec.housing_allowance + ec.transport_allowance + ec.meal_allowance) / 30) *
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date)) <= 5 THEN
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date))::INTEGER * 21
    ELSE
      (5 * 21) + ((EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date))::INTEGER - 5) * 30)
  END,
  -- Years 1-5 days
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date)) <= 5 THEN
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date))::INTEGER * 21
    ELSE
      5 * 21
  END,
  -- Years 6+ days
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date)) > 5 THEN
      (EXTRACT(YEAR FROM AGE(CURRENT_DATE, s.createdat::date))::INTEGER - 5) * 30
    ELSE
      0
  END,
  CURRENT_DATE
FROM staff s
INNER JOIN employee_compensation ec ON s.staffid = ec.employee_id AND ec.is_active = true
WHERE s.createdat IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM end_of_service_provisions eos 
    WHERE eos.employee_id = s.staffid
  );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count records created
DO $$
DECLARE
  v_grades_count INTEGER;
  v_ss_rules_count INTEGER;
  v_exchange_rates_count INTEGER;
  v_compensation_count INTEGER;
  v_eos_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_grades_count FROM salary_grades;
  SELECT COUNT(*) INTO v_ss_rules_count FROM social_security_rules;
  SELECT COUNT(*) INTO v_exchange_rates_count FROM currency_exchange_rates;
  SELECT COUNT(*) INTO v_compensation_count FROM employee_compensation;
  SELECT COUNT(*) INTO v_eos_count FROM end_of_service_provisions;
  
  RAISE NOTICE '✅ Payroll System Seed Data Summary:';
  RAISE NOTICE '   - Salary Grades: %', v_grades_count;
  RAISE NOTICE '   - Social Security Rules: %', v_ss_rules_count;
  RAISE NOTICE '   - Exchange Rates: %', v_exchange_rates_count;
  RAISE NOTICE '   - Employee Compensation Records: %', v_compensation_count;
  RAISE NOTICE '   - End of Service Provisions: %', v_eos_count;
END $$;
