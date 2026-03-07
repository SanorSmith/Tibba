-- =============================================================================
-- RECEPTION DESK SEED DATA MIGRATION
-- =============================================================================
-- Migration: 002_reception_desk_seed_data.sql
-- Description: Initial seed data for reception desk operations
-- Created: 2026-03-05
-- Author: Hospital Management System

-- =============================================================================
-- INSURANCE PROVIDERS SEED DATA
-- =============================================================================
INSERT INTO insurance_providers (
    provider_id, provider_code, provider_name_ar, provider_name_en, provider_type, 
    phone, email, support_frequency, total_annual_budget, is_active
) VALUES 
    (uuid_generate_v4(), 'INS-001', 'شركة التأمين العراقية الوطنية', 'Iraq National Insurance Company', 'PRIVATE_INSURANCE', '+964-1-1234567', 'info@iraqins.iq', 'MONTHLY', 500000000, true),
    (uuid_generate_v4(), 'INS-002', 'وزارة الصحة العراقية', 'Iraq Ministry of Health', 'GOVERNMENT', '+964-1-2345678', 'contact@moh.gov.iq', 'QUARTERLY', 1000000000, true),
    (uuid_generate_v4(), 'INS-003', 'شركة التأمين الصحي المتحدة', 'United Health Insurance Company', 'PRIVATE_INSURANCE', '+964-1-3456789', 'info@unitedhealth.iq', 'MONTHLY', 750000000, true),
    (uuid_generate_v4(), 'INS-004', 'التأمين الاجتماعي العراقي', 'Iraq Social Security', 'GOVERNMENT', '+964-1-4567890', 'info@socialsec.iq', 'ANNUAL', 2000000000, true),
    (uuid_generate_v4(), 'INS-005', 'شركة الرافدين للتأمين', 'Al-Rafidain Insurance Company', 'PRIVATE_INSURANCE', '+964-1-5678901', 'info@alrafidain.iq', 'MONTHLY', 600000000, true)
ON CONFLICT (provider_code) DO NOTHING;

-- =============================================================================
-- STAKEHOLDERS SEED DATA
-- =============================================================================
INSERT INTO stakeholders (
    stakeholder_id, stakeholder_code, name_ar, name_en, role, specialty_ar, specialty_en,
    phone, mobile, email, department_id, license_number, default_share_type, 
    default_share_percentage, is_active
) VALUES 
    -- Hospital Stakeholder
    (uuid_generate_v4(), 'SH-001', 'مستشفى تبنى', 'Tibbna Hospital', 'HOSPITAL', NULL, NULL, '+964-1-7000000', '+964-770-100-0001', 'info@tibbna.iq', 'HOSPITAL', 'HOS-001', 'PERCENTAGE', 30, true),
    
    -- Doctors
    (uuid_generate_v4(), 'SH-002', 'د. أحمد محمد علي', 'Dr. Ahmed Mohammed Ali', 'DOCTOR', 'طب القلب', 'Cardiology', '+964-1-7000001', '+964-770-100-0002', 'dr.ahmed@tibbna.iq', 'CARDIOLOGY', 'DOC-001', 'PERCENTAGE', 25, true),
    (uuid_generate_v4(), 'SH-003', 'د. فاطمة حسن كريم', 'Dr. Fatima Hassan Karim', 'DOCTOR', 'طب الأطفال', 'Pediatrics', '+964-1-7000002', '+964-770-100-0003', 'dr.fatima@tibbna.iq', 'PEDIATRICS', 'DOC-002', 'PERCENTAGE', 25, true),
    (uuid_generate_v4(), 'SH-004', 'د. علي عبدالله إبراهيم', 'Dr. Ali Abdullah Ibrahim', 'DOCTOR', 'جراحة عامة', 'General Surgery', '+964-1-7000003', '+964-770-100-0004', 'dr.ali@tibbna.iq', 'SURGERY', 'DOC-003', 'PERCENTAGE', 25, true),
    (uuid_generate_v4(), 'SH-005', 'د. نورة سالم خالد', 'Dr. Nora Salem Khalid', 'DOCTOR', 'طب النساء', 'Gynecology', '+964-1-7000004', '+964-770-100-0005', 'dr.nora@tibbna.iq', 'GYNECOLOGY', 'DOC-004', 'PERCENTAGE', 25, true),
    
    -- Nurses
    (uuid_generate_v4(), 'SH-006', 'مريم يوسف أحمد', 'Mariam Yousif Ahmed', 'NURSE', 'تمريض عام', 'General Nursing', '+964-1-7000005', '+964-770-100-0006', 'mariam@tibbna.iq', 'NURSING', 'NUR-001', 'PERCENTAGE', 10, true),
    (uuid_generate_v4(), 'SH-007', 'زينب محمد حسن', 'Zainab Mohammed Hassan', 'NURSE', 'تمريض طوارئ', 'Emergency Nursing', '+964-1-7000006', '+964-770-100-0007', 'zainab@tibbna.iq', 'EMERGENCY', 'NUR-002', 'PERCENTAGE', 12, true),
    (uuid_generate_v4(), 'SH-008', 'خالد إبراهيم علي', 'Khalid Ibrahim Ali', 'NURSE', 'تمريض جراحة', 'Surgical Nursing', '+964-1-7000007', '+964-770-100-0008', 'khalid@tibbna.iq', 'SURGERY', 'NUR-003', 'PERCENTAGE', 10, true),
    
    -- Lab Technicians
    (uuid_generate_v4(), 'SH-009', 'سارة أحمد محمود', 'Sarah Ahmed Mahmoud', 'LAB_TECHNICIAN', 'مختبرات', 'Laboratory', '+964-1-7000008', '+964-770-100-0009', 'sarah@tibbna.iq', 'LABORATORY', 'LAB-001', 'PERCENTAGE', 8, true),
    (uuid_generate_v4(), 'SH-010', 'عمر حسن علي', 'Omar Hassan Ali', 'LAB_TECHNICIAN', 'مختبرات', 'Laboratory', '+964-1-7000009', '+964-770-100-0010', 'omar@tibbna.iq', 'LABORATORY', 'LAB-002', 'PERCENTAGE', 8, true),
    
    -- Pharmacists
    (uuid_generate_v4(), 'SH-011', 'ليلى محمد صالح', 'Laila Mohammed Saleh', 'PHARMACIST', 'صيدلة', 'Pharmacy', '+964-1-7000010', '+964-770-100-0011', 'laila@tibbna.iq', 'PHARMACY', 'PHM-001', 'PERCENTAGE', 10, true),
    (uuid_generate_v4(), 'SH-012', 'عبدالله أحمد كريم', 'Abdullah Ahmed Karim', 'PHARMACIST', 'صيدلة', 'Pharmacy', '+964-1-7000011', '+964-770-100-0012', 'abdullah@tibbna.iq', 'PHARMACY', 'PHM-002', 'PERCENTAGE', 10, true),
    
    -- Anesthesiologists
    (uuid_generate_v4(), 'SH-013', 'د. رشاد محمد علي', 'Dr. Rashad Mohammed Ali', 'ANESTHESIOLOGIST', 'تخدير', 'Anesthesiology', '+964-1-7000012', '+964-770-100-0013', 'dr.rashad@tibbna.iq', 'ANESTHESIA', 'ANE-001', 'PERCENTAGE', 15, true),
    (uuid_generate_v4(), 'SH-014', 'د. سعاد حسن أحمد', 'Dr. Suad Hassan Ahmed', 'ANESTHESIOLOGIST', 'تخدير', 'Anesthesiology', '+964-1-7000013', '+964-770-100-0014', 'dr.suad@tibbna.iq', 'ANESTHESIA', 'ANE-002', 'PERCENTAGE', 15, true)
ON CONFLICT (stakeholder_code) DO NOTHING;

-- =============================================================================
-- MEDICAL SERVICES SEED DATA
-- =============================================================================
INSERT INTO medical_services (
    service_id, service_code, service_name_ar, service_name_en, service_category,
    base_price, currency, description_ar, duration_minutes, covered_by_insurance,
    insurance_coverage_percentage, department_id, is_active
) VALUES 
    -- Consultation Services
    (uuid_generate_v4(), 'SVC-001', 'استشارة طبية عامة', 'General Medical Consultation', 'CONSULTATION', 50000, 'IQD', 'استشارة مع طبيب عام', 30, true, 80, 'GENERAL', true),
    (uuid_generate_v4(), 'SVC-002', 'استشارة طب قلب', 'Cardiology Consultation', 'CONSULTATION', 75000, 'IQD', 'استشارة مع طبيب قلب', 30, true, 80, 'CARDIOLOGY', true),
    (uuid_generate_v4(), 'SVC-003', 'استشارة طب أطفال', 'Pediatrics Consultation', 'CONSULTATION', 60000, 'IQD', 'استشارة مع طبيب أطفال', 30, true, 80, 'PEDIATRICS', true),
    (uuid_generate_v4(), 'SVC-004', 'استشارة طب نساء', 'Gynecology Consultation', 'CONSULTATION', 70000, 'IQD', 'استشارة مع طبيب نساء', 30, true, 80, 'GYNECOLOGY', true),
    (uuid_generate_v4(), 'SVC-005', 'استشارة جراحة عامة', 'General Surgery Consultation', 'CONSULTATION', 65000, 'IQD', 'استشارة مع جراح عام', 30, true, 80, 'SURGERY', true),
    
    -- Examination Services
    (uuid_generate_v4(), 'SVC-006', 'فحص سريري شامل', 'Complete Physical Examination', 'EXAMINATION', 40000, 'IQD', 'فحص سريري كامل', 45, true, 80, 'GENERAL', true),
    (uuid_generate_v4(), 'SVC-007', 'فحص قلب وتنفس', 'Cardiopulmonary Examination', 'EXAMINATION', 35000, 'IQD', 'فحص القلب والجهاز التنفسي', 30, true, 80, 'CARDIOLOGY', true),
    (uuid_generate_v4(), 'SVC-008', 'فحص نسائي', 'Gynecological Examination', 'EXAMINATION', 45000, 'IQD', 'فحص نسائي كامل', 30, true, 80, 'GYNECOLOGY', true),
    
    -- Lab Tests
    (uuid_generate_v4(), 'SVC-009', 'تحليل دم كامل', 'Complete Blood Count (CBC)', 'LAB_TEST', 25000, 'IQD', 'تحليل دم شامل', 15, true, 80, 'LABORATORY', true),
    (uuid_generate_v4(), 'SVC-010', 'تحليل كيمياء حيوية', 'Biochemistry Panel', 'LAB_TEST', 45000, 'IQD', 'تحليل وظائف الكلى والكبد', 20, true, 80, 'LABORATORY', true),
    (uuid_generate_v4(), 'SVC-011', 'تحليل هرمونات', 'Hormone Panel', 'LAB_TEST', 35000, 'IQD', 'تحليل هرمونات الغدة الدرقية', 15, true, 80, 'LABORATORY', true),
    (uuid_generate_v4(), 'SVC-012', 'تحليل بول', 'Urine Analysis', 'LAB_TEST', 15000, 'IQD', 'تحليل بول كامل', 10, true, 80, 'LABORATORY', true),
    (uuid_generate_v4(), 'SVC-013', 'تحليل سكري', 'Blood Sugar Test', 'LAB_TEST', 20000, 'IQD', 'تحليل سكر الدم', 5, true, 80, 'LABORATORY', true),
    
    -- Radiology Services
    (uuid_generate_v4(), 'SVC-014', 'أشعة سينية صدر', 'Chest X-Ray', 'RADIOLOGY', 30000, 'IQD', 'صورة أشعة سينية للصدر', 15, true, 80, 'RADIOLOGY', true),
    (uuid_generate_v4(), 'SVC-015', 'أشعة سينية بطن', 'Abdominal X-Ray', 'RADIOLOGY', 35000, 'IQD', 'صورة أشعة سينية للبطن', 15, true, 80, 'RADIOLOGY', true),
    (uuid_generate_v4(), 'SVC-016', 'أشعة مقطعية', 'CT Scan', 'RADIOLOGY', 150000, 'IQD', 'تصوير مقطعي بالكمبيوتر', 30, true, 80, 'RADIOLOGY', true),
    (uuid_generate_v4(), 'SVC-017', 'أشعة رنين مغناطيسي', 'MRI', 'RADIOLOGY', 250000, 'IQD', 'تصوير بالرنين المغناطيسي', 45, true, 80, 'RADIOLOGY', true),
    (uuid_generate_v4(), 'SVC-018', 'سونار بطني', 'Abdominal Ultrasound', 'RADIOLOGY', 60000, 'IQD', 'فحص سونار للبطن', 20, true, 80, 'RADIOLOGY', true),
    
    -- Procedures
    (uuid_generate_v4(), 'SVC-019', 'تخييط جرح', 'Wound Suturing', 'PROCEDURE', 30000, 'IQD', 'خياطة جرح بسيط', 20, true, 80, 'EMERGENCY', true),
    (uuid_generate_v4(), 'SVC-020', 'إزالة غرز', 'Suture Removal', 'PROCEDURE', 15000, 'IQD', 'إزالة الغرز الجراحية', 10, true, 80, 'SURGERY', true),
    (uuid_generate_v4(), 'SVC-021', 'حقنة عضلية', 'Intramuscular Injection', 'PROCEDURE', 10000, 'IQD', 'حقنة في العضل', 5, true, 80, 'NURSING', true),
    (uuid_generate_v4(), 'SVC-022', 'حقنة وريدية', 'Intravenous Injection', 'PROCEDURE', 15000, 'IQD', 'حقنة في الوريد', 10, true, 80, 'NURSING', true),
    (uuid_generate_v4(), 'SVC-023', 'مضاد حيوي', 'Antibiotic Injection', 'PROCEDURE', 25000, 'IQD', 'حقنة مضاد حيوي', 10, true, 80, 'NURSING', true),
    
    -- Pharmacy Services
    (uuid_generate_v4(), 'SVC-024', 'وصفة طبية بسيطة', 'Simple Prescription', 'PHARMACY', 20000, 'IQD', 'تكلفة وصفة طبية بسيطة', 10, true, 80, 'PHARMACY', true),
    (uuid_generate_v4(), 'SVC-025', 'وصفة طبية معقدة', 'Complex Prescription', 'PHARMACY', 50000, 'IQD', 'تكلفة وصفة طبية معقدة', 15, true, 80, 'PHARMACY', true),
    
    -- Surgery Services
    (uuid_generate_v4(), 'SVC-026', 'عملية جراحية صغرى', 'Minor Surgery', 'SURGERY', 200000, 'IQD', 'عملية جراحية بسيطة', 60, true, 80, 'SURGERY', true),
    (uuid_generate_v4(), 'SVC-027', 'عملية جراحية كبرى', 'Major Surgery', 'SURGERY', 500000, 'IQD', 'عملية جراحية كبيرة', 120, true, 80, 'SURGERY', true),
    (uuid_generate_v4(), 'SVC-028', 'عملية قسطرة', 'Catheterization', 'SURGERY', 800000, 'IQD', 'عملية قسطرة قلبية', 90, true, 80, 'CARDIOLOGY', true),
    
    -- Telemedicine
    (uuid_generate_v4(), 'SVC-029', 'استشارة عن بعد', 'Telemedicine Consultation', 'TELEMEDICINE', 40000, 'IQD', 'استشارة طبية عبر الفيديو', 20, true, 80, 'TELEMEDICINE', true)
ON CONFLICT (service_code) DO NOTHING;

-- =============================================================================
-- SERVICE SHARE TEMPLATES SEED DATA
-- =============================================================================
-- Get service and stakeholder IDs for share templates
DO $$
DECLARE
    hospital_id UUID;
    cardiology_doctor_id UUID;
    surgery_doctor_id UUID;
    pediatric_doctor_id UUID;
    gynecology_doctor_id UUID;
    nurse_id UUID;
    lab_tech_id UUID;
    pharmacist_id UUID;
    anesthesiologist_id UUID;
    consultation_service_id UUID;
    surgery_service_id UUID;
    lab_test_service_id UUID;
    pharmacy_service_id UUID;
BEGIN
    -- Get stakeholder IDs
    SELECT stakeholder_id INTO hospital_id FROM stakeholders WHERE stakeholder_code = 'SH-001';
    SELECT stakeholder_id INTO cardiology_doctor_id FROM stakeholders WHERE stakeholder_code = 'SH-002';
    SELECT stakeholder_id INTO surgery_doctor_id FROM stakeholders WHERE stakeholder_code = 'SH-004';
    SELECT stakeholder_id INTO pediatric_doctor_id FROM stakeholders WHERE stakeholder_code = 'SH-003';
    SELECT stakeholder_id INTO gynecology_doctor_id FROM stakeholders WHERE stakeholder_code = 'SH-005';
    SELECT stakeholder_id INTO nurse_id FROM stakeholders WHERE stakeholder_code = 'SH-006';
    SELECT stakeholder_id INTO lab_tech_id FROM stakeholders WHERE stakeholder_code = 'SH-009';
    SELECT stakeholder_id INTO pharmacist_id FROM stakeholders WHERE stakeholder_code = 'SH-011';
    SELECT stakeholder_id INTO anesthesiologist_id FROM stakeholders WHERE stakeholder_code = 'SH-013';
    
    -- Get service IDs
    SELECT service_id INTO consultation_service_id FROM medical_services WHERE service_code = 'SVC-001';
    SELECT service_id INTO surgery_service_id FROM medical_services WHERE service_code = 'SVC-026';
    SELECT service_id INTO lab_test_service_id FROM medical_services WHERE service_code = 'SVC-009';
    SELECT service_id INTO pharmacy_service_id FROM medical_services WHERE service_code = 'SVC-024';
    
    -- Insert share templates for consultation services
    INSERT INTO service_share_templates (template_id, service_id, stakeholder_id, share_type, share_percentage, display_order)
    VALUES 
        (uuid_generate_v4(), consultation_service_id, hospital_id, 'PERCENTAGE', 30, 1),
        (uuid_generate_v4(), consultation_service_id, cardiology_doctor_id, 'PERCENTAGE', 25, 2),
        (uuid_generate_v4(), consultation_service_id, nurse_id, 'PERCENTAGE', 10, 3)
    ON CONFLICT (service_id, stakeholder_id) DO NOTHING;
    
    -- Insert share templates for surgery services
    INSERT INTO service_share_templates (template_id, service_id, stakeholder_id, share_type, share_percentage, display_order)
    VALUES 
        (uuid_generate_v4(), surgery_service_id, hospital_id, 'PERCENTAGE', 30, 1),
        (uuid_generate_v4(), surgery_service_id, surgery_doctor_id, 'PERCENTAGE', 25, 2),
        (uuid_generate_v4(), surgery_service_id, anesthesiologist_id, 'PERCENTAGE', 15, 3),
        (uuid_generate_v4(), surgery_service_id, nurse_id, 'PERCENTAGE', 10, 3)
    ON CONFLICT (service_id, stakeholder_id) DO NOTHING;
    
    -- Insert share templates for lab tests
    INSERT INTO service_share_templates (template_id, service_id, stakeholder_id, share_type, share_percentage, display_order)
    VALUES 
        (uuid_generate_v4(), lab_test_service_id, hospital_id, 'PERCENTAGE', 30, 1),
        (uuid_generate_v4(), lab_test_service_id, lab_tech_id, 'PERCENTAGE', 8, 2)
    ON CONFLICT (service_id, stakeholder_id) DO NOTHING;
    
    -- Insert share templates for pharmacy services
    INSERT INTO service_share_templates (template_id, service_id, stakeholder_id, share_type, share_percentage, display_order)
    VALUES 
        (uuid_generate_v4(), pharmacy_service_id, hospital_id, 'PERCENTAGE', 30, 1),
        (uuid_generate_v4(), pharmacy_service_id, pharmacist_id, 'PERCENTAGE', 10, 2)
    ON CONFLICT (service_id, stakeholder_id) DO NOTHING;
END $$;

-- =============================================================================
-- SUPPLIERS SEED DATA
-- =============================================================================
INSERT INTO suppliers (
    supplier_id, supplier_code, company_name_ar, company_name_en, contact_person_ar,
    phone, mobile, email, governorate, address_ar, tax_registration_number,
    is_active
) VALUES 
    (uuid_generate_v4(), 'SUP-001', 'شركة الأدوية العراقية', 'Iraqi Pharmaceutical Company', 'أحمد محمد علي', '+964-1-8000001', '+964-770-200-0001', 'sales@iraqpharma.iq', 'بغداد', 'شارع فلسطين، بغداد، العراق', 'TRN-001', true),
    (uuid_generate_v4(), 'SUP-002', 'المستلزمات الطبية المتحدة', 'United Medical Supplies', 'فاطمة حسن كريم', '+964-1-8000002', '+964-770-200-0002', 'info@unitedmed.iq', 'بغداد', 'شارع السعدون، بغداد، العراق', 'TRN-002', true),
    (uuid_generate_v4(), 'SUP-003', 'شركة المعدات الطبية', 'Medical Equipment Company', 'علي عبدالله إبراهيم', '+964-1-8000003', '+964-770-200-0003', 'equipment@medeq.iq', 'بغداد', 'منطقة الكرادة، بغداد، العراق', 'TRN-003', true),
    (uuid_generate_v4(), 'SUP-004', 'المختبرات المتخصصة', 'Specialized Laboratories', 'نورة سالم خالد', '+964-1-8000004', '+964-770-200-0004', 'lab@speclab.iq', 'بغداد', 'شارع الرشيد، بغداد، العراق', 'TRN-004', true),
    (uuid_generate_v4(), 'SUP-005', 'شركة التغذية الطبية', 'Medical Nutrition Company', 'مريم يوسف أحمد', '+964-1-8000005', '+964-770-200-0005', 'nutrition@mednut.iq', 'بغداد', 'المنصور، بغداد، العراق', 'TRN-005', true)
ON CONFLICT (supplier_code) DO NOTHING;

-- =============================================================================
-- SAMPLE PATIENTS SEED DATA
-- =============================================================================
INSERT INTO patients (
    patient_id, patient_number, first_name_ar, first_name_en, middle_name,
    last_name_ar, last_name_en, full_name_ar, full_name_en, date_of_birth,
    gender, blood_group, national_id, phone, mobile, email, governorate,
    district, emergency_contact_name_ar, emergency_contact_phone,
    emergency_contact_relationship_ar, is_active
) VALUES 
    (uuid_generate_v4(), 'P-2024-00001', 'أحمد', 'Ahmed', 'محمد', 'علي', 'Ali', 'أحمد محمد علي', 'Ahmed Mohammed Ali', '1985-03-15', 'MALE', 'O+', '198503150001', '+964-1-3000001', '+964-770-300-0001', 'ahmed.ali@email.com', 'بغداد', 'الكرادة', 'محمد علي', '+964-770-300-0002', 'أب', true),
    (uuid_generate_v4(), 'P-2024-00002', 'فاطمة', 'Fatima', 'حسن', 'كريم', 'Karim', 'فاطمة حسن كريم', 'Fatima Hassan Karim', '1990-07-22', 'FEMALE', 'A+', '199007220002', '+964-1-3000002', '+964-770-300-0003', 'fatima.karim@email.com', 'بغداد', 'المنصور', 'حسن كريم', '+964-770-300-0004', 'زوج', true),
    (uuid_generate_v4(), 'P-2024-00003', 'علي', 'Ali', 'عبدالله', 'إبراهيم', 'Ibrahim', 'علي عبدالله إبراهيم', 'Ali Abdullah Ibrahim', '1978-11-10', 'MALE', 'B+', '197811100003', '+964-1-3000003', '+964-770-300-0005', 'ali.ibrahim@email.com', 'بغداد', 'السعدون', 'عبدالله إبراهيم', '+964-770-300-0006', 'أخ', true),
    (uuid_generate_v4(), 'P-2024-00004', 'نورة', 'Nora', 'سالم', 'خالد', 'Khalid', 'نورة سالم خالد', 'Nora Salem Khalid', '1995-05-30', 'FEMALE', 'AB+', '199505300004', '+964-1-3000004', '+964-770-300-0007', 'nora.khalid@email.com', 'بغداد', 'الاعظمية', 'سالم خالد', '+964-770-300-0008', 'زوجة', true),
    (uuid_generate_v4(), 'P-2024-00005', 'مريم', 'Mariam', 'يوسف', 'أحمد', 'Ahmed', 'مريم يوسف أحمد', 'Mariam Yousif Ahmed', '1988-09-18', 'FEMALE', 'O+', '198809180005', '+964-1-3000005', '+964-770-300-0009', 'mariam.ahmed@email.com', 'بغداد', 'الكرادة', 'يوسف أحمد', '+964-770-300-0010', 'أخت', true)
ON CONFLICT (patient_number) DO NOTHING;

-- =============================================================================
-- SAMPLE PATIENT INSURANCE SEED DATA
-- =============================================================================
DO $$
DECLARE
    patient_1_id UUID;
    patient_2_id UUID;
    patient_3_id UUID;
    patient_4_id UUID;
    patient_5_id UUID;
    ins_1_id UUID;
    ins_2_id UUID;
    ins_3_id UUID;
BEGIN
    -- Get patient IDs
    SELECT patient_id INTO patient_1_id FROM patients WHERE patient_number = 'P-2024-00001';
    SELECT patient_id INTO patient_2_id FROM patients WHERE patient_number = 'P-2024-00002';
    SELECT patient_id INTO patient_3_id FROM patients WHERE patient_number = 'P-2024-00003';
    SELECT patient_id INTO patient_4_id FROM patients WHERE patient_number = 'P-2024-00004';
    SELECT patient_id INTO patient_5_id FROM patients WHERE patient_number = 'P-2024-00005';
    
    -- Get insurance provider IDs
    SELECT provider_id INTO ins_1_id FROM insurance_providers WHERE provider_code = 'INS-001';
    SELECT provider_id INTO ins_2_id FROM insurance_providers WHERE provider_code = 'INS-002';
    SELECT provider_id INTO ins_3_id FROM insurance_providers WHERE provider_code = 'INS-003';
    
    -- Insert patient insurance records
    INSERT INTO patient_insurance (
        insurance_id, patient_id, provider_id, policy_number, policy_start_date,
        policy_end_date, coverage_type, coverage_percentage, coverage_amount_limit,
        coverage_amount_used, status, is_primary
    ) VALUES 
        (uuid_generate_v4(), patient_1_id, ins_1_id, 'POL-001-2024', '2024-01-01', '2024-12-31', 'FULL', 80, 5000000, 0, 'ACTIVE', true),
        (uuid_generate_v4(), patient_2_id, ins_2_id, 'POL-002-2024', '2024-01-01', '2024-12-31', 'FULL', 100, 10000000, 0, 'ACTIVE', true),
        (uuid_generate_v4(), patient_3_id, ins_3_id, 'POL-003-2024', '2024-01-01', '2024-12-31', 'PARTIAL', 70, 3000000, 0, 'ACTIVE', true),
        (uuid_generate_v4(), patient_4_id, ins_1_id, 'POL-004-2024', '2024-01-01', '2024-12-31', 'PARTIAL', 60, 4000000, 0, 'ACTIVE', true),
        (uuid_generate_v4(), patient_5_id, ins_2_id, 'POL-005-2024', '2024-01-01', '2024-12-31', 'FULL', 90, 8000000, 0, 'ACTIVE', true)
    ON CONFLICT DO NOTHING;
END $$;

-- =============================================================================
-- SAMPLE RECEPTION TODOs SEED DATA
-- =============================================================================
INSERT INTO reception_todos (
    todo_id, todo_number, title, description, assigned_to, priority, status, due_date, created_by
) VALUES 
    (uuid_generate_v4(), 'TODO-2024-00001', 'متابعة فاتورة المريض أحمد', 'متابعة دفع فاتورة المريض أحمد محمد علي', 'REC-001', 'NORMAL', 'PENDING', CURRENT_TIMESTAMP + INTERVAL '1 day', 'REC-001'),
    (uuid_generate_v4(), 'TODO-2024-00002', 'تأكيد موعد المريضة فاطمة', 'التأكيد مع المريضة فاطمة حسن كريم لموعد الغد', 'REC-002', 'HIGH', 'IN_PROGRESS', CURRENT_TIMESTAMP + INTERVAL '2 hours', 'REC-001'),
    (uuid_generate_v4(), 'TODO-2024-00003', 'تحديث بيانات التأمين', 'تحديث بيانات التأمين للمريض علي عبدالله', 'REC-001', 'NORMAL', 'PENDING', CURRENT_TIMESTAMP + INTERVAL '3 days', 'REC-002'),
    (uuid_generate_v4(), 'TODO-2024-00004', 'متابعة استلام الأدوية', 'متابعة استلام الأدوية من الصيدلية', 'REC-002', 'URGENT', 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'REC-001'),
    (uuid_generate_v4(), 'TODO-2024-00005', 'تنظيف منطقة الاستقبال', 'تنظيف وتنظيم منطقة الاستقبال', 'REC-001', 'LOW', 'PENDING', CURRENT_TIMESTAMP + INTERVAL '4 hours', 'REC-002')
ON CONFLICT (todo_number) DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE insurance_providers IS 'Seed data for 5 insurance providers including government and private companies';
COMMENT ON TABLE stakeholders IS 'Seed data for 14 healthcare providers including doctors, nurses, lab technicians, pharmacists, and anesthesiologists';
COMMENT ON TABLE medical_services IS 'Seed data for 29 medical services covering all categories (consultation, examination, lab, radiology, procedures, pharmacy, surgery, telemedicine)';
COMMENT ON TABLE service_share_templates IS 'Seed data for revenue sharing templates based on service categories and stakeholder roles';
COMMENT ON TABLE suppliers IS 'Seed data for 5 suppliers covering pharmaceuticals, medical supplies, equipment, and laboratory services';
COMMENT ON TABLE patients IS 'Seed data for 5 sample patients with complete demographic and contact information';
COMMENT ON TABLE patient_insurance IS 'Seed data for patient insurance policies linking patients to insurance providers';
COMMENT ON TABLE reception_todos IS 'Seed data for 5 sample reception desk tasks with different priorities and statuses';

-- Migration completed successfully
