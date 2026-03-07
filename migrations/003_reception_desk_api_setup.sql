-- =============================================================================
-- RECEPTION DESK API SETUP MIGRATION
-- =============================================================================
-- Migration: 003_reception_desk_api_setup.sql
-- Description: Database functions and views for reception desk API operations
-- Created: 2026-03-05
-- Author: Hospital Management System

-- =============================================================================
-- API HELPER FUNCTIONS
-- =============================================================================

-- Function to generate patient numbers
CREATE OR REPLACE FUNCTION generate_patient_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    patient_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0') INTO sequence_part
    FROM patients 
    WHERE patient_number LIKE 'P-' || year_part || '-%';
    
    patient_number := 'P-' || year_part || '-' || sequence_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM patients WHERE patient_number = patient_number) LOOP
        SELECT LPAD((CAST(SUBSTRING(patient_number FROM 8 FOR 5) AS INTEGER) + 1)::TEXT, 5, '0') INTO sequence_part;
        patient_number := 'P-' || year_part || '-' || sequence_part;
    END LOOP;
    
    RETURN patient_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    invoice_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0') INTO sequence_part
    FROM invoices 
    WHERE invoice_number LIKE 'INV-' || year_part || '-%';
    
    invoice_number := 'INV-' || year_part || '-' || sequence_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = invoice_number) LOOP
        SELECT LPAD((CAST(SUBSTRING(invoice_number FROM 9 FOR 5) AS INTEGER) + 1)::TEXT, 5, '0') INTO sequence_part;
        invoice_number := 'INV-' || year_part || '-' || sequence_part;
    END LOOP;
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate appointment numbers
CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    appointment_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0') INTO sequence_part
    FROM appointments 
    WHERE appointment_number LIKE 'APT-' || year_part || '-%';
    
    appointment_number := 'APT-' || year_part || '-' || sequence_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM appointments WHERE appointment_number = appointment_number) LOOP
        SELECT LPAD((CAST(SUBSTRING(appointment_number FROM 9 FOR 5) AS INTEGER) + 1)::TEXT, 5, '0') INTO sequence_part;
        appointment_number := 'APT-' || year_part || '-' || sequence_part;
    END LOOP;
    
    RETURN appointment_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    booking_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0') INTO sequence_part
    FROM bookings 
    WHERE booking_number LIKE 'BKG-' || year_part || '-%';
    
    booking_number := 'BKG-' || year_part || '-' || sequence_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM bookings WHERE booking_number = booking_number) LOOP
        SELECT LPAD((CAST(SUBSTRING(booking_number FROM 9 FOR 5) AS INTEGER) + 1)::TEXT, 5, '0') INTO sequence_part;
        booking_number := 'BKG-' || year_part || '-' || sequence_part;
    END LOOP;
    
    RETURN booking_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate payment numbers
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    payment_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0') INTO sequence_part
    FROM payments 
    WHERE payment_number LIKE 'PAY-' || year_part || '-%';
    
    payment_number := 'PAY-' || year_part || '-' || sequence_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM payments WHERE payment_number = payment_number) LOOP
        SELECT LPAD((CAST(SUBSTRING(payment_number FROM 9 FOR 5) AS INTEGER) + 1)::TEXT, 5, '0') INTO sequence_part;
        payment_number := 'PAY-' || year_part || '-' || sequence_part;
    END LOOP;
    
    RETURN payment_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate todo numbers
CREATE OR REPLACE FUNCTION generate_todo_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    todo_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next sequence number for this year
    SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0') INTO sequence_part
    FROM reception_todos 
    WHERE todo_number LIKE 'TODO-' || year_part || '-%';
    
    todo_number := 'TODO-' || year_part || '-' || sequence_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM reception_todos WHERE todo_number = todo_number) LOOP
        SELECT LPAD((CAST(SUBSTRING(todo_number FROM 10 FOR 5) AS INTEGER) + 1)::TEXT, 5, '0') INTO sequence_part;
        todo_number := 'TODO-' || year_part || '-' || sequence_part;
    END LOOP;
    
    RETURN todo_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- API VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for patient details with insurance information
CREATE OR REPLACE VIEW v_patient_details AS
SELECT 
    p.patient_id,
    p.patient_number,
    p.first_name_ar,
    p.first_name_en,
    p.middle_name,
    p.last_name_ar,
    p.last_name_en,
    p.full_name_ar,
    p.full_name_en,
    p.date_of_birth,
    p.gender,
    p.blood_group,
    p.national_id,
    p.phone,
    p.mobile,
    p.email,
    p.governorate,
    p.district,
    p.neighborhood,
    p.emergency_contact_name_ar,
    p.emergency_contact_phone,
    p.emergency_contact_relationship_ar,
    p.medical_history,
    p.total_balance,
    p.is_active,
    p.created_at,
    p.updated_at,
    -- Insurance information
    COALESCE(pi.provider_id, NULL) as insurance_provider_id,
    COALESCE(ip.provider_name_ar, NULL) as insurance_provider_name,
    COALESCE(pi.policy_number, NULL) as policy_number,
    COALESCE(pi.coverage_type, NULL) as coverage_type,
    COALESCE(pi.coverage_percentage, 0) as coverage_percentage,
    COALESCE(pi.coverage_amount_limit, 0) as coverage_amount_limit,
    COALESCE(pi.coverage_amount_used, 0) as coverage_amount_used,
    COALESCE(pi.status, NULL) as insurance_status
FROM patients p
LEFT JOIN patient_insurance pi ON p.patient_id = pi.patient_id AND pi.is_primary = true
LEFT JOIN insurance_providers ip ON pi.provider_id = ip.provider_id;

-- View for invoice details with patient and service information
CREATE OR REPLACE VIEW v_invoice_details AS
SELECT 
    i.invoice_id,
    i.invoice_number,
    i.invoice_date,
    i.patient_id,
    i.patient_name_ar,
    i.subtotal,
    i.discount_percentage,
    i.discount_amount,
    i.total_amount,
    i.insurance_provider_id,
    i.insurance_coverage_amount,
    i.insurance_coverage_percentage,
    i.patient_responsibility,
    i.status,
    i.amount_paid,
    i.balance_due,
    i.payment_method,
    i.payment_date,
    i.payment_reference,
    i.responsible_entity_type,
    i.responsible_entity_id,
    i.notes,
    i.created_at,
    i.updated_at,
    i.created_by,
    -- Patient details
    p.patient_number,
    p.phone as patient_phone,
    p.mobile as patient_mobile,
    -- Insurance details
    ip.provider_name_ar as insurance_provider_name,
    -- Item count
    (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.invoice_id) as item_count
FROM invoices i
LEFT JOIN patients p ON i.patient_id = p.patient_id
LEFT JOIN insurance_providers ip ON i.insurance_provider_id = ip.provider_id;

-- View for appointment details with patient and doctor information
CREATE OR REPLACE VIEW v_appointment_details AS
SELECT 
    a.appointment_id,
    a.appointment_number,
    a.patient_id,
    a.patient_name_ar,
    a.service_id,
    a.service_name_ar,
    a.department_id,
    a.doctor_id,
    a.doctor_name_ar,
    a.appointment_date,
    a.appointment_time,
    a.duration_minutes,
    a.status,
    a.notes,
    a.created_at,
    a.updated_at,
    a.created_by,
    -- Patient details
    p.patient_number,
    p.phone as patient_phone,
    p.mobile as patient_mobile,
    -- Doctor details
    s.stakeholder_code as doctor_code,
    s.role as doctor_role,
    s.specialty_ar as doctor_specialty,
    s.mobile as doctor_mobile
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.patient_id
LEFT JOIN stakeholders s ON a.doctor_id = s.stakeholder_id;

-- View for booking details
CREATE OR REPLACE VIEW v_booking_details AS
SELECT 
    b.booking_id,
    b.booking_number,
    b.patient_id,
    b.patient_name_ar,
    b.booking_type,
    b.service_id,
    b.service_name_ar,
    b.department_id,
    b.preferred_date,
    b.preferred_time,
    b.alternative_date,
    b.alternative_time,
    b.status,
    b.priority,
    b.notes,
    b.created_at,
    b.updated_at,
    b.created_by,
    -- Patient details
    p.patient_number,
    p.phone as patient_phone,
    p.mobile as patient_mobile
FROM bookings b
LEFT JOIN patients p ON b.patient_id = p.patient_id;

-- =============================================================================
-- API STORED PROCEDURES
-- =============================================================================

-- Procedure to create a new patient
CREATE OR REPLACE PROCEDURE create_patient(
    p_first_name_ar TEXT,
    p_first_name_en TEXT DEFAULT NULL,
    p_middle_name TEXT DEFAULT NULL,
    p_last_name_ar TEXT,
    p_last_name_en TEXT DEFAULT NULL,
    p_date_of_birth DATE,
    p_gender TEXT,
    p_blood_group TEXT DEFAULT NULL,
    p_national_id TEXT DEFAULT NULL,
    p_phone TEXT,
    p_mobile TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_governorate TEXT DEFAULT NULL,
    p_district TEXT DEFAULT NULL,
    p_neighborhood TEXT DEFAULT NULL,
    p_emergency_contact_name_ar TEXT DEFAULT NULL,
    p_emergency_contact_phone TEXT DEFAULT NULL,
    p_emergency_contact_relationship_ar TEXT DEFAULT NULL,
    p_medical_history TEXT DEFAULT NULL,
    OUT p_patient_id UUID,
    OUT p_patient_number TEXT
) AS $$
BEGIN
    -- Generate patient number
    p_patient_number := generate_patient_number();
    
    -- Create full names
    INSERT INTO patients (
        patient_id,
        patient_number,
        first_name_ar,
        first_name_en,
        middle_name,
        last_name_ar,
        last_name_en,
        full_name_ar,
        full_name_en,
        date_of_birth,
        gender,
        blood_group,
        national_id,
        phone,
        mobile,
        email,
        governorate,
        district,
        neighborhood,
        emergency_contact_name_ar,
        emergency_contact_phone,
        emergency_contact_relationship_ar,
        medical_history,
        is_active
    ) VALUES (
        uuid_generate_v4(),
        p_patient_number,
        p_first_name_ar,
        p_first_name_en,
        p_middle_name,
        p_last_name_ar,
        p_last_name_en,
        COALESCE(p_first_name_ar || ' ' || COALESCE(p_middle_name || ' ', '') || p_last_name_ar, ''),
        COALESCE(p_first_name_en || ' ' || COALESCE(p_middle_name || ' ', '') || p_last_name_en, ''),
        p_date_of_birth,
        p_gender,
        p_blood_group,
        p_national_id,
        p_phone,
        p_mobile,
        p_email,
        p_governorate,
        p_district,
        p_neighborhood,
        p_emergency_contact_name_ar,
        p_emergency_contact_phone,
        p_emergency_contact_relationship_ar,
        p_medical_history,
        true
    ) RETURNING patient_id INTO p_patient_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to create an invoice with items
CREATE OR REPLACE PROCEDURE create_invoice(
    p_patient_id UUID,
    p_patient_name_ar TEXT,
    p_items JSONB, -- Array of service objects with service_id, quantity, unit_price
    p_insurance_provider_id UUID DEFAULT NULL,
    p_discount_percentage DECIMAL(5,2) DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_created_by TEXT DEFAULT NULL,
    OUT p_invoice_id UUID,
    OUT p_invoice_number TEXT
) AS $$
DECLARE
    v_subtotal DECIMAL(15,2) := 0;
    v_discount_amount DECIMAL(15,2) := 0;
    v_total_amount DECIMAL(15,2) := 0;
    v_insurance_coverage_amount DECIMAL(15,2) := 0;
    v_patient_responsibility DECIMAL(15,2) := 0;
    v_service RECORD;
    v_item_id UUID;
    v_service_name TEXT;
    v_service_category TEXT;
    v_line_total DECIMAL(15,2);
BEGIN
    -- Calculate subtotal
    FOR v_service IN SELECT * FROM jsonb_to_recordset(p_items) AS x(service_id UUID, quantity INTEGER, unit_price DECIMAL(15,2))
    LOOP
        v_line_total := v_service.quantity * v_service.unit_price;
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;
    
    -- Calculate discount
    v_discount_amount := v_subtotal * (p_discount_percentage / 100);
    v_total_amount := v_subtotal - v_discount_amount;
    
    -- Calculate insurance coverage
    IF p_insurance_provider_id IS NOT NULL THEN
        SELECT COALESCE(coverage_percentage, 0) INTO v_insurance_coverage_amount
        FROM patient_insurance 
        WHERE patient_id = p_patient_id AND provider_id = p_insurance_provider_id AND status = 'ACTIVE';
        
        v_insurance_coverage_amount := v_total_amount * (v_insurance_coverage_amount / 100);
        v_patient_responsibility := v_total_amount - v_insurance_coverage_amount;
    ELSE
        v_patient_responsibility := v_total_amount;
    END IF;
    
    -- Generate invoice number
    p_invoice_number := generate_invoice_number();
    
    -- Create invoice
    INSERT INTO invoices (
        invoice_id,
        invoice_number,
        invoice_date,
        patient_id,
        patient_name_ar,
        subtotal,
        discount_percentage,
        discount_amount,
        total_amount,
        insurance_provider_id,
        insurance_coverage_amount,
        insurance_coverage_percentage,
        patient_responsibility,
        status,
        notes,
        created_by
    ) VALUES (
        uuid_generate_v4(),
        p_invoice_number,
        CURRENT_DATE,
        p_patient_id,
        p_patient_name_ar,
        v_subtotal,
        p_discount_percentage,
        v_discount_amount,
        v_total_amount,
        p_insurance_provider_id,
        v_insurance_coverage_amount,
        CASE WHEN p_insurance_provider_id IS NOT NULL THEN 
            (SELECT coverage_percentage FROM patient_insurance WHERE patient_id = p_patient_id AND provider_id = p_insurance_provider_id AND status = 'ACTIVE')
        ELSE 0 END,
        v_patient_responsibility,
        'PENDING',
        p_notes,
        p_created_by
    ) RETURNING invoice_id INTO p_invoice_id;
    
    -- Create invoice items
    FOR v_service IN SELECT * FROM jsonb_to_recordset(p_items) AS x(service_id UUID, quantity INTEGER, unit_price DECIMAL(15,2))
    LOOP
        -- Get service details
        SELECT service_name_ar, service_category INTO v_service_name, v_service_category
        FROM medical_services 
        WHERE service_id = v_service.service_id;
        
        v_line_total := v_service.quantity * v_service.unit_price;
        
        -- Create invoice item
        INSERT INTO invoice_items (
            item_id,
            invoice_id,
            service_id,
            service_name_ar,
            service_name_en,
            service_category,
            quantity,
            unit_price,
            notes
        ) VALUES (
            uuid_generate_v4(),
            p_invoice_id,
            v_service.service_id,
            v_service_name,
            NULL,
            v_service_category,
            v_service.quantity,
            v_service.unit_price,
            NULL
        ) RETURNING item_id INTO v_item_id;
        
        -- Create invoice shares based on service share templates
        INSERT INTO invoice_shares (
            share_id,
            invoice_id,
            invoice_item_id,
            stakeholder_id,
            stakeholder_name_ar,
            stakeholder_role,
            share_type,
            share_percentage,
            share_amount,
            payment_status
        )
        SELECT 
            uuid_generate_v4(),
            p_invoice_id,
            v_item_id,
            s.stakeholder_id,
            s.name_ar,
            s.role,
            sst.share_type,
            sst.share_percentage,
            CASE 
                WHEN sst.share_type = 'PERCENTAGE' THEN v_line_total * (sst.share_percentage / 100)
                ELSE sst.share_amount
            END,
            'PENDING'
        FROM service_share_templates sst
        JOIN stakeholders s ON sst.stakeholder_id = s.stakeholder_id
        WHERE sst.service_id = v_service.service_id AND s.is_active = true;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Procedure to create appointment
CREATE OR REPLACE PROCEDURE create_appointment(
    p_patient_id UUID,
    p_patient_name_ar TEXT,
    p_service_id UUID DEFAULT NULL,
    p_service_name_ar TEXT DEFAULT NULL,
    p_department_id TEXT DEFAULT NULL,
    p_doctor_id UUID DEFAULT NULL,
    p_doctor_name_ar TEXT DEFAULT NULL,
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_duration_minutes INTEGER DEFAULT 30,
    p_notes TEXT DEFAULT NULL,
    p_created_by TEXT DEFAULT NULL,
    OUT p_appointment_id UUID,
    OUT p_appointment_number TEXT
) AS $$
BEGIN
    -- Generate appointment number
    p_appointment_number := generate_appointment_number();
    
    -- Create appointment
    INSERT INTO appointments (
        appointment_id,
        appointment_number,
        patient_id,
        patient_name_ar,
        service_id,
        service_name_ar,
        department_id,
        doctor_id,
        doctor_name_ar,
        appointment_date,
        appointment_time,
        duration_minutes,
        status,
        notes,
        created_by
    ) VALUES (
        uuid_generate_v4(),
        p_appointment_number,
        p_patient_id,
        p_patient_name_ar,
        p_service_id,
        p_service_name_ar,
        p_department_id,
        p_doctor_id,
        p_doctor_name_ar,
        p_appointment_date,
        p_appointment_time,
        p_duration_minutes,
        'SCHEDULED',
        p_notes,
        p_created_by
    ) RETURNING appointment_id INTO p_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- API TRIGGERS FOR AUTOMATIC PROCESSES
-- =============================================================================

-- Trigger to automatically update patient balance when invoice is paid
CREATE OR REPLACE FUNCTION update_patient_balance_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update patient total balance when invoice status changes
    IF OLD.status != NEW.status THEN
        IF NEW.status = 'PAID' THEN
            UPDATE patients 
            SET total_balance = total_balance + NEW.patient_responsibility
            WHERE patient_id = NEW.patient_id;
        ELSIF OLD.status = 'PAID' AND NEW.status != 'PAID' THEN
            UPDATE patients 
            SET total_balance = total_balance - OLD.patient_responsibility
            WHERE patient_id = NEW.patient_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_patient_balance
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_balance_trigger();

-- Trigger to automatically update insurance usage when invoice is paid
CREATE OR REPLACE FUNCTION update_insurance_usage_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update insurance coverage amount used when invoice is paid
    IF OLD.status != NEW.status AND NEW.status = 'PAID' AND NEW.insurance_provider_id IS NOT NULL THEN
        UPDATE patient_insurance 
        SET coverage_amount_used = coverage_amount_used + NEW.insurance_coverage_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE patient_id = NEW.patient_id AND provider_id = NEW.insurance_provider_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_insurance_usage
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_balance_trigger();

-- =============================================================================
-- API SECURITY FUNCTIONS
-- =============================================================================

-- Function to check if user has access to patient data
CREATE OR REPLACE FUNCTION has_patient_access(p_user_id TEXT, p_patient_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, allow all authenticated users (implement proper RBAC later)
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can modify invoice
CREATE OR REPLACE FUNCTION can_modify_invoice(p_user_id TEXT, p_invoice_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_invoice_status TEXT;
BEGIN
    -- Check invoice status
    SELECT status INTO v_invoice_status FROM invoices WHERE invoice_id = p_invoice_id;
    
    -- Allow modification only for pending invoices
    IF v_invoice_status = 'PENDING' THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON FUNCTION generate_patient_number() IS 'Generates unique patient numbers in format P-YYYY-NNNNN';
COMMENT ON FUNCTION generate_invoice_number() IS 'Generates unique invoice numbers in format INV-YYYY-NNNNN';
COMMENT ON FUNCTION generate_appointment_number() IS 'Generates unique appointment numbers in format APT-YYYY-NNNNN';
COMMENT ON FUNCTION generate_booking_number() IS 'Generates unique booking numbers in format BKG-YYYY-NNNNN';
COMMENT ON FUNCTION generate_payment_number() IS 'Generates unique payment numbers in format PAY-YYYY-NNNNN';
COMMENT ON FUNCTION generate_todo_number() IS 'Generates unique todo numbers in format TODO-YYYY-NNNNN';

COMMENT ON VIEW v_patient_details IS 'Comprehensive patient view including insurance information';
COMMENT ON VIEW v_invoice_details IS 'Comprehensive invoice view including patient and insurance details';
COMMENT ON VIEW v_appointment_details IS 'Comprehensive appointment view including patient and doctor details';
COMMENT ON VIEW v_booking_details IS 'Comprehensive booking view including patient details';

COMMENT ON PROCEDURE create_patient() IS 'Creates a new patient with automatic number generation';
COMMENT ON PROCEDURE create_invoice() IS 'Creates a new invoice with items and automatic revenue sharing calculation';
COMMENT ON PROCEDURE create_appointment() IS 'Creates a new appointment with automatic number generation';

COMMENT ON FUNCTION update_patient_balance_trigger() IS 'Automatically updates patient balance when invoice status changes';
COMMENT ON FUNCTION update_insurance_usage_trigger() IS 'Automatically updates insurance usage when invoice is paid';

-- Migration completed successfully
