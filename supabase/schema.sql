-- ============================================================================
-- TIBBNA-EHR HOSPITAL MANAGEMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- Healthcare Standards: FHIR R4, openEHR, Iraqi Healthcare Compliance
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE: ORGANIZATIONS & LOCATIONS
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  type VARCHAR(50) NOT NULL, -- 'HOSPITAL', 'CLINIC', 'PHARMACY', 'LAB'
  license_number VARCHAR(100),
  tax_id VARCHAR(100),
  active BOOLEAN DEFAULT true,
  address JSONB,
  contact JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  type VARCHAR(50), -- 'CLINICAL', 'ADMINISTRATIVE', 'SUPPORT'
  parent_id UUID REFERENCES departments(id),
  head_employee_id UUID, -- References employees (added later)
  budget_code VARCHAR(50),
  cost_center_code VARCHAR(50),
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'WARD', 'ROOM', 'BED', 'WAREHOUSE', 'PHARMACY'
  parent_id UUID REFERENCES locations(id),
  capacity INTEGER,
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CORE: PRACTITIONERS (FHIR Practitioner)
-- ============================================================================

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),

  -- Identity
  employee_number VARCHAR(50) UNIQUE NOT NULL,
  national_id VARCHAR(50) UNIQUE,
  passport_number VARCHAR(50),

  -- Personal Info (FHIR HumanName)
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  first_name_ar VARCHAR(100),
  last_name_ar VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20), -- 'MALE', 'FEMALE', 'OTHER', 'UNKNOWN'
  marital_status VARCHAR(20),
  nationality VARCHAR(50) DEFAULT 'Iraqi',

  -- Employment
  job_title VARCHAR(255),
  job_title_ar VARCHAR(255),
  employment_type VARCHAR(50), -- 'FULL_TIME', 'PART_TIME', 'CONTRACT'
  employment_status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'
  hire_date DATE,
  termination_date DATE,
  probation_end_date DATE,

  -- Salary & Grade
  salary_grade VARCHAR(10), -- 'G1' to 'G10'
  base_salary DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'IQD',

  -- Contact (FHIR ContactPoint)
  email VARCHAR(255),
  phone VARCHAR(50),
  emergency_contact JSONB,
  address JSONB,

  -- Professional (FHIR Practitioner.qualification)
  qualifications JSONB,
  specialties JSONB,
  license_number VARCHAR(100),
  license_expiry DATE,

  -- System
  user_id UUID,
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for department head
ALTER TABLE departments
ADD CONSTRAINT fk_department_head
FOREIGN KEY (head_employee_id) REFERENCES employees(id);

-- ============================================================================
-- CORE: PATIENTS (FHIR Patient)
-- ============================================================================

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identity (FHIR Identifier)
  medical_record_number VARCHAR(50) UNIQUE NOT NULL,
  national_id VARCHAR(50),
  passport_number VARCHAR(50),

  -- Personal Info (FHIR HumanName)
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  first_name_ar VARCHAR(100),
  last_name_ar VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(20),
  nationality VARCHAR(50) DEFAULT 'Iraqi',

  -- Contact (FHIR ContactPoint)
  email VARCHAR(255),
  phone VARCHAR(50),
  address JSONB,

  -- Clinical
  blood_type VARCHAR(10), -- 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  allergies JSONB,
  chronic_conditions JSONB,

  -- Insurance
  primary_insurance_id UUID,
  secondary_insurance_id UUID,

  -- Billing
  payment_category VARCHAR(50) DEFAULT 'SELF_PAY', -- 'SELF_PAY', 'INSURANCE', 'GOVERNMENT'
  credit_limit DECIMAL(12, 2) DEFAULT 0,

  -- System
  active BOOLEAN DEFAULT true,
  deceased BOOLEAN DEFAULT false,
  deceased_date DATE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSURANCE
-- ============================================================================

CREATE TABLE insurance_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  type VARCHAR(50), -- 'PRIVATE', 'GOVERNMENT', 'CORPORATE'
  contact JSONB,
  address JSONB,
  payment_terms INTEGER DEFAULT 30,
  credit_limit DECIMAL(12, 2),
  annual_budget DECIMAL(12, 2),
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES insurance_providers(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,

  policy_number VARCHAR(100) UNIQUE NOT NULL,
  group_number VARCHAR(100),

  coverage_start DATE NOT NULL,
  coverage_end DATE NOT NULL,

  coverage_percentage DECIMAL(5, 2) DEFAULT 80.00,
  annual_limit DECIMAL(12, 2),
  remaining_balance DECIMAL(12, 2),

  copay_amount DECIMAL(10, 2) DEFAULT 0,
  deductible DECIMAL(10, 2) DEFAULT 0,

  status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys for patient insurance
ALTER TABLE patients
ADD CONSTRAINT fk_patient_primary_insurance
FOREIGN KEY (primary_insurance_id) REFERENCES insurance_policies(id);

ALTER TABLE patients
ADD CONSTRAINT fk_patient_secondary_insurance
FOREIGN KEY (secondary_insurance_id) REFERENCES insurance_policies(id);

-- ============================================================================
-- SERVICES & PRICING
-- ============================================================================

CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,
  category VARCHAR(100), -- 'CONSULTATION', 'DIAGNOSTIC', 'PROCEDURE', 'LAB', 'IMAGING'

  -- Pricing by payment type
  price_self_pay DECIMAL(10, 2) NOT NULL,
  price_insurance DECIMAL(10, 2) NOT NULL,
  price_government DECIMAL(10, 2) NOT NULL,

  currency VARCHAR(3) DEFAULT 'IQD',

  -- Clinical coding (FHIR CodeableConcept)
  cpt_code VARCHAR(20),
  icd10_code VARCHAR(20),
  loinc_code VARCHAR(20),

  duration_minutes INTEGER,
  requires_appointment BOOLEAN DEFAULT false,

  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BILLING & INVOICING (FHIR Invoice/Claim)
-- ============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,

  patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
  insurance_policy_id UUID REFERENCES insurance_policies(id),

  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,

  insurance_coverage DECIMAL(12, 2) DEFAULT 0,
  patient_responsibility DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  balance_due DECIMAL(12, 2) NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'VOID'
  payment_status VARCHAR(50) DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'

  -- References
  encounter_id UUID,
  created_by UUID REFERENCES employees(id),

  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,
  service_id UUID REFERENCES service_catalog(id) ON DELETE RESTRICT,

  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  line_total DECIMAL(12, 2) NOT NULL,

  -- Clinical reference
  performed_by UUID REFERENCES employees(id),
  performed_date DATE,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,

  payment_number VARCHAR(50) UNIQUE NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,

  payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'INSURANCE'
  reference_number VARCHAR(100),

  received_by UUID REFERENCES employees(id),

  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  return_number VARCHAR(50) UNIQUE NOT NULL,
  return_date DATE NOT NULL,

  invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
  patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,

  return_amount DECIMAL(12, 2) NOT NULL,
  reason TEXT,

  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'

  processed_by UUID REFERENCES employees(id),
  processed_at TIMESTAMPTZ,

  refund_method VARCHAR(50), -- 'CASH', 'CARD', 'BANK_TRANSFER'
  refund_reference VARCHAR(100),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY (FHIR Medication/Device/Substance)
-- ============================================================================

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  code VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(100),

  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,

  category VARCHAR(100) NOT NULL, -- 'MEDICATION', 'SUPPLY', 'EQUIPMENT', 'REAGENT'
  subcategory VARCHAR(100),

  -- Clinical coding
  rxnorm_code VARCHAR(50),
  unspsc_code VARCHAR(50),

  -- Unit & Packaging
  unit_of_measure VARCHAR(50) NOT NULL, -- 'PIECE', 'BOX', 'BOTTLE', 'ML', 'MG'
  package_size DECIMAL(10, 2) DEFAULT 1,

  -- Inventory Control
  reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reorder_quantity DECIMAL(10, 2),
  max_stock_level DECIMAL(10, 2),

  -- Costing
  cost_method VARCHAR(50) DEFAULT 'FIFO', -- 'FIFO', 'LIFO', 'AVERAGE'
  standard_cost DECIMAL(12, 2),

  -- Medication-specific
  is_controlled_substance BOOLEAN DEFAULT false,
  requires_prescription BOOLEAN DEFAULT false,
  strength VARCHAR(100),
  dosage_form VARCHAR(100),

  -- Equipment-specific
  serial_tracked BOOLEAN DEFAULT false,
  warranty_months INTEGER,

  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,

  batch_number VARCHAR(100) NOT NULL,
  serial_number VARCHAR(100),

  quantity_on_hand DECIMAL(10, 2) NOT NULL DEFAULT 0,
  quantity_reserved DECIMAL(10, 2) DEFAULT 0,
  quantity_available DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,

  unit_cost DECIMAL(12, 2) NOT NULL,
  total_value DECIMAL(12, 2) GENERATED ALWAYS AS (quantity_on_hand * unit_cost) STORED,

  manufacture_date DATE,
  expiry_date DATE,

  supplier_id UUID,
  purchase_order_id UUID,

  status VARCHAR(50) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'RESERVED', 'EXPIRED', 'RECALLED', 'QUARANTINE'

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(batch_number, item_id)
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  movement_number VARCHAR(50) UNIQUE NOT NULL,
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  movement_type VARCHAR(50) NOT NULL, -- 'RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DISPOSAL'

  item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES inventory_batches(id),

  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id),

  quantity DECIMAL(10, 2) NOT NULL,
  unit_cost DECIMAL(12, 2),
  total_value DECIMAL(12, 2),

  -- References
  patient_id UUID REFERENCES patients(id),
  employee_id UUID REFERENCES employees(id),
  invoice_id UUID REFERENCES invoices(id),
  purchase_order_id UUID,

  reason VARCHAR(255),
  notes TEXT,

  performed_by UUID REFERENCES employees(id),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROCUREMENT
-- ============================================================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  type VARCHAR(50), -- 'PHARMACEUTICAL', 'MEDICAL_EQUIPMENT', 'SUPPLIES', 'SERVICES'

  tax_id VARCHAR(100),
  license_number VARCHAR(100),

  contact JSONB,
  address JSONB,

  payment_terms INTEGER DEFAULT 30,
  credit_limit DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'IQD',

  rating DECIMAL(3, 2),
  active BOOLEAN DEFAULT true,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for inventory_batches supplier
ALTER TABLE inventory_batches
ADD CONSTRAINT fk_batch_supplier
FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

CREATE TABLE purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),

  requisition_number VARCHAR(50) UNIQUE NOT NULL,
  requisition_date DATE NOT NULL,
  required_by_date DATE,

  requested_by UUID REFERENCES employees(id),
  approved_by UUID REFERENCES employees(id),

  status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED'
  priority VARCHAR(50) DEFAULT 'NORMAL', -- 'URGENT', 'HIGH', 'NORMAL', 'LOW'

  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_requisition_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisition_id UUID REFERENCES purchase_requisitions(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,
  item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,

  quantity DECIMAL(10, 2) NOT NULL,
  estimated_cost DECIMAL(12, 2),

  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  requisition_id UUID REFERENCES purchase_requisitions(id),

  po_number VARCHAR(50) UNIQUE NOT NULL,
  po_date DATE NOT NULL,
  expected_delivery_date DATE,

  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,

  currency VARCHAR(3) DEFAULT 'IQD',

  status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'

  created_by UUID REFERENCES employees(id),
  approved_by UUID REFERENCES employees(id),

  payment_terms INTEGER,
  delivery_location_id UUID REFERENCES locations(id),

  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for inventory_batches purchase_order
ALTER TABLE inventory_batches
ADD CONSTRAINT fk_batch_purchase_order
FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);

-- Add foreign key for inventory_movements purchase_order
ALTER TABLE inventory_movements
ADD CONSTRAINT fk_movement_purchase_order
FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,
  item_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,

  quantity_ordered DECIMAL(10, 2) NOT NULL,
  quantity_received DECIMAL(10, 2) DEFAULT 0,
  quantity_pending DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,

  unit_cost DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HR: ATTENDANCE & LEAVES
-- ============================================================================

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

  attendance_date DATE NOT NULL,

  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  total_hours DECIMAL(5, 2),

  late_minutes INTEGER DEFAULT 0,
  early_leave_minutes INTEGER DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,

  status VARCHAR(50) NOT NULL, -- 'PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HOLIDAY', 'WEEKEND'

  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,

  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(employee_id, attendance_date)
);

CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),

  max_days_per_year INTEGER,
  max_consecutive_days INTEGER,
  requires_approval BOOLEAN DEFAULT true,
  requires_documentation BOOLEAN DEFAULT false,
  carry_forward BOOLEAN DEFAULT false,
  paid BOOLEAN DEFAULT true,

  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,

  total_entitlement DECIMAL(5, 2) NOT NULL,
  used_days DECIMAL(5, 2) DEFAULT 0,
  pending_days DECIMAL(5, 2) DEFAULT 0,
  available_days DECIMAL(5, 2) GENERATED ALWAYS AS (total_entitlement - used_days - pending_days) STORED,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE RESTRICT,

  request_number VARCHAR(50) UNIQUE NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5, 2) NOT NULL,

  reason TEXT,
  supporting_document_url TEXT,
  contact_number VARCHAR(50),

  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'

  -- Multi-level approval
  approver_1_id UUID REFERENCES employees(id),
  approver_1_status VARCHAR(50),
  approver_1_date TIMESTAMPTZ,
  approver_1_remarks TEXT,

  approver_2_id UUID REFERENCES employees(id),
  approver_2_status VARCHAR(50),
  approver_2_date TIMESTAMPTZ,
  approver_2_remarks TEXT,

  approver_3_id UUID REFERENCES employees(id),
  approver_3_status VARCHAR(50),
  approver_3_date TIMESTAMPTZ,
  approver_3_remarks TEXT,

  rejected_by UUID REFERENCES employees(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HR: PAYROLL
-- ============================================================================

CREATE TABLE salary_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  grade_code VARCHAR(10) UNIQUE NOT NULL, -- 'G1', 'G2', etc.
  title VARCHAR(255) NOT NULL,

  min_salary DECIMAL(12, 2) NOT NULL,
  max_salary DECIMAL(12, 2) NOT NULL,
  midpoint_salary DECIMAL(12, 2) GENERATED ALWAYS AS ((min_salary + max_salary) / 2) STORED,

  currency VARCHAR(3) DEFAULT 'IQD',

  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  period_code VARCHAR(50) UNIQUE NOT NULL, -- '2024-03'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE NOT NULL,

  status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'CALCULATED', 'APPROVED', 'PAID'

  total_gross DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  total_net DECIMAL(12, 2) DEFAULT 0,

  processed_by UUID REFERENCES employees(id),
  approved_by UUID REFERENCES employees(id),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payroll_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE RESTRICT,

  -- Salary components
  base_salary DECIMAL(12, 2) NOT NULL,
  housing_allowance DECIMAL(12, 2) DEFAULT 0,
  transport_allowance DECIMAL(12, 2) DEFAULT 0,
  other_allowances DECIMAL(12, 2) DEFAULT 0,
  overtime_pay DECIMAL(12, 2) DEFAULT 0,
  bonus DECIMAL(12, 2) DEFAULT 0,

  gross_salary DECIMAL(12, 2) NOT NULL,

  -- Deductions
  tax DECIMAL(12, 2) DEFAULT 0,
  social_security_employee DECIMAL(12, 2) DEFAULT 0, -- Iraqi 5%
  social_security_employer DECIMAL(12, 2) DEFAULT 0, -- Iraqi 12%
  loan_deduction DECIMAL(12, 2) DEFAULT 0,
  other_deductions DECIMAL(12, 2) DEFAULT 0,

  total_deductions DECIMAL(12, 2) NOT NULL,
  net_salary DECIMAL(12, 2) NOT NULL,

  -- Bank transfer
  bank_name VARCHAR(255),
  account_number VARCHAR(100),

  payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'PAID', 'FAILED'
  payment_date DATE,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employee_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

  loan_number VARCHAR(50) UNIQUE NOT NULL,
  loan_date DATE NOT NULL,

  principal_amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,

  installments INTEGER NOT NULL,
  installment_amount DECIMAL(12, 2) NOT NULL,

  amount_paid DECIMAL(12, 2) DEFAULT 0,
  amount_remaining DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

  start_date DATE NOT NULL,
  end_date DATE,

  status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'PAID', 'CANCELLED'

  approved_by UUID REFERENCES employees(id),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HR: TRAINING & PERFORMANCE
-- ============================================================================

CREATE TABLE training_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  description TEXT,

  category VARCHAR(100), -- 'CLINICAL', 'COMPLIANCE', 'LEADERSHIP', 'TECHNICAL', 'CME'
  provider VARCHAR(255),
  duration_hours DECIMAL(5, 2),

  is_mandatory BOOLEAN DEFAULT false,
  is_cme BOOLEAN DEFAULT false,
  cme_credits DECIMAL(5, 2),

  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES training_programs(id) ON DELETE CASCADE,

  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,

  location VARCHAR(255),
  instructor VARCHAR(255),
  max_participants INTEGER,

  status VARCHAR(50) DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,

  status VARCHAR(50) DEFAULT 'ENROLLED', -- 'ENROLLED', 'ATTENDED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'
  score DECIMAL(5, 2),
  certificate_url TEXT,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, employee_id)
);

CREATE TABLE performance_review_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  cycle_name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  period VARCHAR(50), -- 'ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY'

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'ACTIVE', 'COMPLETED'

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES performance_review_cycles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES employees(id),

  review_date DATE,

  -- Ratings (1-5 scale)
  overall_rating DECIMAL(3, 2),
  competency_ratings JSONB, -- { "clinical_skills": 4.5, "communication": 4.0, ... }

  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  comments TEXT,

  status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'

  acknowledged_at TIMESTAMPTZ,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employee_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES performance_review_cycles(id),

  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'CLINICAL', 'PROFESSIONAL', 'PERSONAL', 'ORGANIZATIONAL'

  target_date DATE,
  progress_percentage DECIMAL(5, 2) DEFAULT 0,

  status VARCHAR(50) DEFAULT 'NOT_STARTED', -- 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HR: RECRUITMENT
-- ============================================================================

CREATE TABLE vacancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),

  vacancy_number VARCHAR(50) UNIQUE NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  job_title_ar VARCHAR(255),
  description TEXT,

  employment_type VARCHAR(50), -- 'FULL_TIME', 'PART_TIME', 'CONTRACT'
  salary_grade VARCHAR(10),
  positions_available INTEGER DEFAULT 1,

  requirements JSONB,
  benefits JSONB,

  posted_date DATE,
  closing_date DATE,

  status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'OPEN', 'CLOSED', 'FILLED', 'CANCELLED'

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacancy_id UUID REFERENCES vacancies(id) ON DELETE CASCADE,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  first_name_ar VARCHAR(100),
  last_name_ar VARCHAR(100),

  email VARCHAR(255),
  phone VARCHAR(50),

  resume_url TEXT,
  cover_letter TEXT,

  experience_years DECIMAL(4, 1),
  education JSONB,
  skills JSONB,

  pipeline_stage VARCHAR(50) DEFAULT 'APPLIED', -- 'APPLIED', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED', 'REJECTED'

  interview_date TIMESTAMPTZ,
  interview_notes TEXT,
  rating DECIMAL(3, 2),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HR: BENEFITS
-- ============================================================================

CREATE TABLE benefit_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'HEALTH_INSURANCE', 'TRANSPORT', 'HOUSING', 'MEAL', 'EDUCATION'

  description TEXT,
  eligibility_criteria JSONB,

  employer_contribution DECIMAL(12, 2) DEFAULT 0,
  employee_contribution DECIMAL(12, 2) DEFAULT 0,

  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE benefit_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES benefit_plans(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

  enrollment_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  termination_date DATE,

  status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'TERMINATED'

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plan_id, employee_id)
);

-- ============================================================================
-- CLINICAL: ENCOUNTERS (FHIR Encounter)
-- ============================================================================

CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  encounter_number VARCHAR(50) UNIQUE NOT NULL,
  encounter_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
  practitioner_id UUID REFERENCES employees(id),
  department_id UUID REFERENCES departments(id),
  location_id UUID REFERENCES locations(id),

  type VARCHAR(50) NOT NULL, -- 'OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'SURGERY'
  status VARCHAR(50) DEFAULT 'IN_PROGRESS', -- 'PLANNED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'

  chief_complaint TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,

  admission_date TIMESTAMPTZ,
  discharge_date TIMESTAMPTZ,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for invoices encounter
ALTER TABLE invoices
ADD CONSTRAINT fk_invoice_encounter
FOREIGN KEY (encounter_id) REFERENCES encounters(id);

-- ============================================================================
-- CLINICAL: APPOINTMENTS (FHIR Appointment)
-- ============================================================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  appointment_number VARCHAR(50) UNIQUE NOT NULL,

  patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
  practitioner_id UUID REFERENCES employees(id),
  department_id UUID REFERENCES departments(id),
  service_id UUID REFERENCES service_catalog(id),

  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  status VARCHAR(50) DEFAULT 'BOOKED', -- 'BOOKED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'

  reason TEXT,
  notes TEXT,

  encounter_id UUID REFERENCES encounters(id),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FINANCE: ACCOUNTING
-- ============================================================================

CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_name_ar VARCHAR(255),
  account_type VARCHAR(50) NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
  account_subtype VARCHAR(50),

  parent_id UUID REFERENCES chart_of_accounts(id),

  normal_balance VARCHAR(10) NOT NULL, -- 'DEBIT', 'CREDIT'
  current_balance DECIMAL(14, 2) DEFAULT 0,

  allow_posting BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  type VARCHAR(50), -- 'REVENUE', 'COST', 'PROFIT'

  annual_budget DECIMAL(14, 2) DEFAULT 0,
  actual_spending DECIMAL(14, 2) DEFAULT 0,

  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  posting_date DATE,

  description TEXT NOT NULL,
  reference VARCHAR(255),

  entry_type VARCHAR(50) DEFAULT 'STANDARD', -- 'STANDARD', 'ADJUSTING', 'CLOSING', 'REVERSING'
  status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'POSTED', 'VOID'

  total_debit DECIMAL(14, 2) NOT NULL,
  total_credit DECIMAL(14, 2) NOT NULL,

  created_by UUID REFERENCES employees(id),
  posted_by UUID REFERENCES employees(id),
  posted_at TIMESTAMPTZ,

  -- Source references
  invoice_id UUID REFERENCES invoices(id),
  payment_id UUID REFERENCES payments(id),
  payroll_period_id UUID REFERENCES payroll_periods(id),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_balanced CHECK (total_debit = total_credit)
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  cost_center_id UUID REFERENCES cost_centers(id),

  description TEXT,

  debit_amount DECIMAL(14, 2) DEFAULT 0,
  credit_amount DECIMAL(14, 2) DEFAULT 0,

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- ============================================================================
-- STAKEHOLDERS
-- ============================================================================

CREATE TABLE stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  type VARCHAR(50) NOT NULL, -- 'PARTNER', 'SHAREHOLDER', 'INVESTOR', 'FOUNDER'

  ownership_percentage DECIMAL(5, 2),
  investment_amount DECIMAL(14, 2),

  contact JSONB,

  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stakeholder_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,

  distribution_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  total_profit DECIMAL(14, 2) NOT NULL,
  distribution_amount DECIMAL(14, 2) NOT NULL,

  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'PAID'

  paid_date DATE,
  payment_reference VARCHAR(100),

  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT & SYSTEM
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'

  user_id UUID,
  user_email VARCHAR(255),
  user_role VARCHAR(50),

  old_values JSONB,
  new_values JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type VARCHAR(50) NOT NULL, -- 'STRING', 'NUMBER', 'BOOLEAN', 'JSON'

  description TEXT,

  updated_by UUID REFERENCES employees(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Employees
CREATE INDEX idx_employees_dept ON employees(department_id);
CREATE INDEX idx_employees_number ON employees(employee_number);
CREATE INDEX idx_employees_status ON employees(employment_status);
CREATE INDEX idx_employees_org ON employees(organization_id);

-- Patients
CREATE INDEX idx_patients_mrn ON patients(medical_record_number);
CREATE INDEX idx_patients_national_id ON patients(national_id);
CREATE INDEX idx_patients_org ON patients(organization_id);

-- Insurance
CREATE INDEX idx_insurance_policies_patient ON insurance_policies(patient_id);
CREATE INDEX idx_insurance_policies_provider ON insurance_policies(provider_id);
CREATE INDEX idx_insurance_policies_status ON insurance_policies(status);

-- Invoices
CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_org ON invoices(organization_id);

-- Payments
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Returns
CREATE INDEX idx_returns_invoice ON returns(invoice_id);
CREATE INDEX idx_returns_patient ON returns(patient_id);

-- Inventory
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_org ON inventory_items(organization_id);
CREATE INDEX idx_inventory_batches_item ON inventory_batches(item_id);
CREATE INDEX idx_inventory_batches_location ON inventory_batches(location_id);
CREATE INDEX idx_inventory_batches_expiry ON inventory_batches(expiry_date);
CREATE INDEX idx_inventory_batches_status ON inventory_batches(status);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(movement_date);
CREATE INDEX idx_inventory_movements_item ON inventory_movements(item_id);

-- Procurement
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Attendance
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);

-- Leaves
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);

-- Payroll
CREATE INDEX idx_payroll_transactions_period ON payroll_transactions(period_id);
CREATE INDEX idx_payroll_transactions_employee ON payroll_transactions(employee_id);
CREATE INDEX idx_employee_loans_employee ON employee_loans(employee_id);

-- Encounters & Appointments
CREATE INDEX idx_encounters_patient ON encounters(patient_id);
CREATE INDEX idx_encounters_date ON encounters(encounter_date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_practitioner ON appointments(practitioner_id);

-- Accounting
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id);

-- Audit
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_audit_log_date ON audit_log(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_insurance_providers_updated_at BEFORE UPDATE ON insurance_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_insurance_policies_updated_at BEFORE UPDATE ON insurance_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_service_catalog_updated_at BEFORE UPDATE ON service_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_batches_updated_at BEFORE UPDATE ON inventory_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_purchase_requisitions_updated_at BEFORE UPDATE ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employee_loans_updated_at BEFORE UPDATE ON employee_loans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_training_programs_updated_at BEFORE UPDATE ON training_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employee_goals_updated_at BEFORE UPDATE ON employee_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vacancies_updated_at BEFORE UPDATE ON vacancies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_encounters_updated_at BEFORE UPDATE ON encounters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stakeholders_updated_at BEFORE UPDATE ON stakeholders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update invoice balance_due when payment is recorded
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices SET
    paid_amount = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id),
    balance_due = patient_responsibility - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id),
    payment_status = CASE
      WHEN patient_responsibility <= (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) THEN 'PAID'
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) > 0 THEN 'PARTIALLY_PAID'
      ELSE 'UNPAID'
    END,
    status = CASE
      WHEN patient_responsibility <= (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) THEN 'PAID'
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) > 0 THEN 'PARTIALLY_PAID'
      ELSE status
    END
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_update_invoice
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();

-- Auto-update inventory batch quantities on movement
CREATE OR REPLACE FUNCTION update_batch_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'RECEIPT' THEN
    UPDATE inventory_batches SET quantity_on_hand = quantity_on_hand + NEW.quantity WHERE id = NEW.batch_id;
  ELSIF NEW.movement_type IN ('ISSUE', 'DISPOSAL') THEN
    UPDATE inventory_batches SET quantity_on_hand = quantity_on_hand - NEW.quantity WHERE id = NEW.batch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movement_update_batch
AFTER INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION update_batch_on_movement();

-- Auto-update leave balance when request is approved
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status = 'PENDING' THEN
    UPDATE leave_balances SET
      used_days = used_days + NEW.total_days,
      pending_days = pending_days - NEW.total_days
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  ELSIF NEW.status = 'PENDING' AND OLD.status IS DISTINCT FROM 'PENDING' THEN
    UPDATE leave_balances SET
      pending_days = pending_days + NEW.total_days
    WHERE employee_id = NEW.employee_id
      AND leave_type_id = NEW.leave_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_request_update_balance
AFTER UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION update_leave_balance_on_approval();

-- Audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (organization_id, table_name, record_id, action, new_values)
    VALUES (NEW.organization_id, TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (organization_id, table_name, record_id, action, old_values, new_values)
    VALUES (NEW.organization_id, TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (organization_id, table_name, record_id, action, old_values)
    VALUES (OLD.organization_id, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER trg_audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_inventory_movements AFTER INSERT OR UPDATE OR DELETE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_journal_entries AFTER INSERT OR UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

INSERT INTO organizations (id, code, name, name_ar, type, active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TIBBNA-MAIN',
  'Tibbna Hospital',
  'مستشفى طبنا',
  'HOSPITAL',
  true
);

-- ============================================================================
-- SCHEMA COMPLETE
-- Total Tables: 42
-- Healthcare Standards: FHIR R4, openEHR-compatible
-- Iraqi Compliance: Social Security, Labor Law
-- Features: RLS, Audit Trails, Auto-triggers, Computed Columns
-- ============================================================================
