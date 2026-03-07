-- =============================================================================
-- RECEPTION DESK DATABASE SCHEMA MIGRATION
-- =============================================================================
-- Migration: 001_reception_desk_schema.sql
-- Description: Complete database schema for reception desk operations
-- Created: 2026-03-05
-- Author: Hospital Management System

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PATIENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS patients (
    patient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_number VARCHAR(20) UNIQUE NOT NULL, -- P-2024-00001
    first_name_ar VARCHAR(100) NOT NULL,
    first_name_en VARCHAR(100),
    middle_name VARCHAR(100),
    last_name_ar VARCHAR(100) NOT NULL,
    last_name_en VARCHAR(100),
    full_name_ar VARCHAR(250) NOT NULL,
    full_name_en VARCHAR(250),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE')) NOT NULL,
    blood_group VARCHAR(5),
    national_id VARCHAR(20),
    phone VARCHAR(20) NOT NULL,
    mobile VARCHAR(20),
    email VARCHAR(100),
    governorate VARCHAR(50),
    district VARCHAR(50),
    neighborhood VARCHAR(50),
    emergency_contact_name_ar VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship_ar VARCHAR(50),
    medical_history TEXT,
    total_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for patients
CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_full_name_ar ON patients(full_name_ar);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON patients(national_id);
CREATE INDEX IF NOT EXISTS idx_patients_is_active ON patients(is_active);

-- =============================================================================
-- INSURANCE PROVIDERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS insurance_providers (
    provider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_code VARCHAR(20) UNIQUE NOT NULL, -- INS-001
    provider_name_ar VARCHAR(200) NOT NULL,
    provider_name_en VARCHAR(200),
    provider_type VARCHAR(20) CHECK (provider_type IN ('PRIVATE_INSURANCE', 'GOVERNMENT', 'MOH')) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address_ar TEXT,
    support_frequency VARCHAR(20) CHECK (support_frequency IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL')),
    total_annual_budget DECIMAL(15,2),
    price DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for insurance providers
CREATE INDEX IF NOT EXISTS idx_insurance_providers_provider_code ON insurance_providers(provider_code);
CREATE INDEX IF NOT EXISTS idx_insurance_providers_is_active ON insurance_providers(is_active);

-- =============================================================================
-- PATIENT INSURANCE TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS patient_insurance (
    insurance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES insurance_providers(provider_id) ON DELETE RESTRICT,
    policy_number VARCHAR(50) NOT NULL,
    policy_start_date DATE NOT NULL,
    policy_end_date DATE,
    coverage_type VARCHAR(20) CHECK (coverage_type IN ('FULL', 'PARTIAL', 'SPECIFIC_SERVICES')) NOT NULL,
    coverage_percentage DECIMAL(5,2) NOT NULL,
    coverage_amount_limit DECIMAL(15,2),
    coverage_amount_used DECIMAL(15,2) DEFAULT 0,
    covered_services TEXT[], -- Array of service codes
    exclusions TEXT,
    status VARCHAR(20) CHECK (status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED')) NOT NULL,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for patient insurance
CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient_id ON patient_insurance(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_provider_id ON patient_insurance(provider_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_policy_number ON patient_insurance(policy_number);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_status ON patient_insurance(status);

-- =============================================================================
-- STAKEHOLDERS TABLE (Revenue Sharing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS stakeholders (
    stakeholder_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_code VARCHAR(20) UNIQUE NOT NULL, -- SH-2024-00001
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    role VARCHAR(30) CHECK (role IN ('HOSPITAL', 'DOCTOR', 'NURSE', 'ANESTHESIOLOGIST', 'LAB_TECHNICIAN', 'PHARMACIST', 'OUTSOURCE_DOCTOR', 'OTHER_HEALTHCARE_WORKER')) NOT NULL,
    specialty_ar VARCHAR(100),
    specialty_en VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    department_id VARCHAR(50),
    license_number VARCHAR(50),
    license_expiry_date DATE,
    bank_name_ar VARCHAR(100),
    account_number VARCHAR(50),
    iban VARCHAR(34),
    service_type VARCHAR(100),
    default_share_type VARCHAR(20) CHECK (default_share_type IN ('PERCENTAGE', 'FIXED_AMOUNT')) NOT NULL,
    default_share_percentage DECIMAL(5,2),
    default_share_amount DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for stakeholders
CREATE INDEX IF NOT EXISTS idx_stakeholders_stakeholder_code ON stakeholders(stakeholder_code);
CREATE INDEX IF NOT EXISTS idx_stakeholders_role ON stakeholders(role);
CREATE INDEX IF NOT EXISTS idx_stakeholders_is_active ON stakeholders(is_active);

-- =============================================================================
-- MEDICAL SERVICES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS medical_services (
    service_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(20) UNIQUE NOT NULL, -- SVC-001
    service_name_ar VARCHAR(200) NOT NULL,
    service_name_en VARCHAR(200),
    service_category VARCHAR(20) CHECK (service_category IN ('CONSULTATION', 'SURGERY', 'EXAMINATION', 'LAB_TEST', 'RADIOLOGY', 'PHARMACY', 'TELEMEDICINE', 'PROCEDURE')) NOT NULL,
    base_price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IQD' CHECK (currency IN ('IQD', 'USD')),
    description_ar TEXT,
    duration_minutes INTEGER,
    covered_by_insurance BOOLEAN DEFAULT true,
    insurance_coverage_percentage DECIMAL(5,2),
    department_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for medical services
CREATE INDEX IF NOT EXISTS idx_medical_services_service_code ON medical_services(service_code);
CREATE INDEX IF NOT EXISTS idx_medical_services_category ON medical_services(service_category);
CREATE INDEX IF NOT EXISTS idx_medical_services_is_active ON medical_services(is_active);

-- =============================================================================
-- SERVICE SHARE TEMPLATES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_share_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES medical_services(service_id) ON DELETE CASCADE,
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
    share_type VARCHAR(20) CHECK (share_type IN ('PERCENTAGE', 'FIXED_AMOUNT')) NOT NULL,
    share_percentage DECIMAL(5,2),
    share_amount DECIMAL(15,2),
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, stakeholder_id)
);

-- Create indexes for service share templates
CREATE INDEX IF NOT EXISTS idx_service_share_templates_service_id ON service_share_templates(service_id);
CREATE INDEX IF NOT EXISTS idx_service_share_templates_stakeholder_id ON service_share_templates(stakeholder_id);

-- =============================================================================
-- INVOICES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(20) UNIQUE NOT NULL, -- INV-2024-00001
    invoice_date DATE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    patient_name_ar VARCHAR(250) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    insurance_provider_id UUID REFERENCES insurance_providers(provider_id) ON DELETE SET NULL,
    insurance_coverage_amount DECIMAL(15,2) DEFAULT 0,
    insurance_coverage_percentage DECIMAL(5,2) DEFAULT 0,
    patient_responsibility DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('PENDING', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'CANCELLED', 'REFUNDED')) DEFAULT 'PENDING',
    amount_paid DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    payment_method VARCHAR(20) CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER')),
    payment_date TIMESTAMP,
    payment_reference VARCHAR(100),
    responsible_entity_type VARCHAR(20) CHECK (responsible_entity_type IN ('PATIENT', 'INSURANCE', 'GOVERNMENT', 'EMPLOYER')),
    responsible_entity_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_insurance_provider_id ON invoices(insurance_provider_id);

-- =============================================================================
-- INVOICE ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES medical_services(service_id) ON DELETE RESTRICT,
    service_name_ar VARCHAR(200) NOT NULL,
    service_name_en VARCHAR(200),
    service_category VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    service_provider_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL,
    department_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invoice items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_provider_id ON invoice_items(service_provider_id);

-- =============================================================================
-- INVOICE SHARES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoice_shares (
    share_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    invoice_item_id UUID REFERENCES invoice_items(item_id) ON DELETE CASCADE,
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE RESTRICT,
    stakeholder_name_ar VARCHAR(200) NOT NULL,
    stakeholder_role VARCHAR(30) NOT NULL,
    share_type VARCHAR(20) CHECK (share_type IN ('PERCENTAGE', 'FIXED_AMOUNT')) NOT NULL,
    share_percentage DECIMAL(5,2),
    share_amount DECIMAL(15,2) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIALLY_PAID')) DEFAULT 'PENDING',
    amount_paid DECIMAL(15,2) DEFAULT 0,
    payment_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invoice shares
CREATE INDEX IF NOT EXISTS idx_invoice_shares_invoice_id ON invoice_shares(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_shares_stakeholder_id ON invoice_shares(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_invoice_shares_payment_status ON invoice_shares(payment_status);

-- =============================================================================
-- INVOICE RETURNS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoice_returns (
    return_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(20) UNIQUE NOT NULL, -- RET-2024-00001
    return_date DATE NOT NULL,
    original_invoice_id UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE RESTRICT,
    original_invoice_number VARCHAR(20) NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    patient_name_ar VARCHAR(250) NOT NULL,
    return_reason_ar TEXT NOT NULL,
    return_reason_en TEXT,
    total_return_amount DECIMAL(15,2) NOT NULL,
    refund_method VARCHAR(20) CHECK (refund_method IN ('CASH', 'BANK_TRANSFER', 'CREDIT_TO_ACCOUNT')),
    refund_status VARCHAR(20) CHECK (refund_status IN ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED')) DEFAULT 'PENDING',
    refund_date TIMESTAMP,
    refund_reference VARCHAR(100),
    approved_by VARCHAR(50),
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- Create indexes for invoice returns
CREATE INDEX IF NOT EXISTS idx_invoice_returns_return_number ON invoice_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_original_invoice_id ON invoice_returns(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_patient_id ON invoice_returns(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_refund_status ON invoice_returns(refund_status);

-- =============================================================================
-- RETURN ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS return_items (
    return_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES invoice_returns(return_id) ON DELETE CASCADE,
    original_item_id UUID NOT NULL REFERENCES invoice_items(item_id) ON DELETE RESTRICT,
    service_name_ar VARCHAR(200) NOT NULL,
    quantity_returned INTEGER NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    return_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity_returned * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for return items
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_original_item_id ON return_items(original_item_id);

-- =============================================================================
-- SUPPLIERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(20) UNIQUE NOT NULL, -- SUP-001
    company_name_ar VARCHAR(200) NOT NULL,
    company_name_en VARCHAR(200),
    contact_person_ar VARCHAR(100),
    contact_person_en VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    mobile VARCHAR(20),
    email VARCHAR(100),
    governorate VARCHAR(50),
    district VARCHAR(50),
    address_ar TEXT,
    tax_registration_number VARCHAR(50),
    bank_name_ar VARCHAR(100),
    account_number VARCHAR(50),
    iban VARCHAR(34),
    payment_terms_ar TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- =============================================================================
-- APPOINTMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number VARCHAR(20) UNIQUE NOT NULL, -- APT-2024-00001
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    patient_name_ar VARCHAR(250) NOT NULL,
    service_id UUID REFERENCES medical_services(service_id) ON DELETE SET NULL,
    service_name_ar VARCHAR(200),
    department_id VARCHAR(50),
    doctor_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL,
    doctor_name_ar VARCHAR(200),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')) DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- Create indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_number ON appointments(appointment_number);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- =============================================================================
-- BOOKINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
    booking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(20) UNIQUE NOT NULL, -- BKG-2024-00001
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    patient_name_ar VARCHAR(250) NOT NULL,
    booking_type VARCHAR(20) CHECK (booking_type IN ('APPOINTMENT', 'PROCEDURE', 'CONSULTATION', 'LAB_TEST', 'RADIOLOGY')) NOT NULL,
    service_id UUID REFERENCES medical_services(service_id) ON DELETE SET NULL,
    service_name_ar VARCHAR(200),
    department_id VARCHAR(50),
    preferred_date DATE NOT NULL,
    preferred_time TIME,
    alternative_date DATE,
    alternative_time TIME,
    status VARCHAR(20) CHECK (status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED')) DEFAULT 'REQUESTED',
    priority VARCHAR(10) CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')) DEFAULT 'NORMAL',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_patient_id ON bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_preferred_date ON bookings(preferred_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- =============================================================================
-- PAYMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(20) UNIQUE NOT NULL, -- PAY-2024-00001
    invoice_id UUID REFERENCES invoices(invoice_id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    patient_name_ar VARCHAR(250) NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER')) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')) DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);

-- =============================================================================
-- RECEPTION TODOs TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS reception_todos (
    todo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_number VARCHAR(20) UNIQUE NOT NULL, -- TODO-2024-00001
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(50) NOT NULL, -- Staff ID
    patient_id UUID REFERENCES patients(patient_id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(invoice_id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    priority VARCHAR(10) CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')) DEFAULT 'NORMAL',
    status VARCHAR(20) CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    completed_by VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- Create indexes for reception todos
CREATE INDEX IF NOT EXISTS idx_reception_todos_todo_number ON reception_todos(todo_number);
CREATE INDEX IF NOT EXISTS idx_reception_todos_assigned_to ON reception_todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reception_todos_patient_id ON reception_todos(patient_id);
CREATE INDEX IF NOT EXISTS idx_reception_todos_status ON reception_todos(status);
CREATE INDEX IF NOT EXISTS idx_reception_todos_due_date ON reception_todos(due_date);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insurance_providers_updated_at BEFORE UPDATE ON insurance_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_insurance_updated_at BEFORE UPDATE ON patient_insurance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stakeholders_updated_at BEFORE UPDATE ON stakeholders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_services_updated_at BEFORE UPDATE ON medical_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_returns_updated_at BEFORE UPDATE ON invoice_returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reception_todos_updated_at BEFORE UPDATE ON reception_todos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE patients IS 'Patient information and demographics';
COMMENT ON TABLE insurance_providers IS 'Insurance company information';
COMMENT ON TABLE patient_insurance IS 'Patient insurance policies and coverage';
COMMENT ON TABLE stakeholders IS 'Healthcare providers for revenue sharing';
COMMENT ON TABLE medical_services IS 'Medical services and pricing';
COMMENT ON TABLE service_share_templates IS 'Revenue sharing templates for services';
COMMENT ON TABLE invoices IS 'Patient invoices and billing';
COMMENT ON TABLE invoice_items IS 'Individual line items in invoices';
COMMENT ON TABLE invoice_shares IS 'Revenue sharing distribution for invoices';
COMMENT ON TABLE invoice_returns IS 'Invoice returns and refunds';
COMMENT ON TABLE return_items IS 'Individual items being returned';
COMMENT ON TABLE suppliers IS 'Supplier information for procurement';
COMMENT ON TABLE appointments IS 'Patient appointments and scheduling';
COMMENT ON TABLE bookings IS 'Patient booking requests';
COMMENT ON TABLE payments IS 'Payment transactions and records';
COMMENT ON TABLE reception_todos IS 'Reception desk task management';

-- Migration completed successfully
