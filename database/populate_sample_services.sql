-- Sample Services Population Script
-- This script adds sample services to the services table for testing

-- Sample services to populate the table
INSERT INTO services (
    code,
    name,
    name_ar,
    category,
    subcategory,
    description,
    price_self_pay,
    price_insurance,
    price_government,
    department_id,
    requires_appointment,
    duration_minutes,
    active
) VALUES 
-- Consultation Services
('GC001', 'General Consultation', 'استشارة عامة', 'Consultation', 'General Medicine', 'General medical consultation for common health issues', 50000.00, 45000.00, 40000.00, 'DEPT001', true, 30, true),
('SC001', 'Specialist Consultation', 'استشارة متخصصة', 'Consultation', 'Specialist Medicine', 'Specialist consultation with medical experts', 100000.00, 90000.00, 80000.00, 'DEPT002', true, 45, true),

-- Laboratory Services
('BT001', 'Blood Test', 'فحص الدم', 'Laboratory', 'Hematology', 'Complete blood count and basic blood analysis', 25000.00, 22500.00, 20000.00, 'DEPT003', false, 15, true),
('UR001', 'Urine Test', 'فحص البول', 'Laboratory', 'Clinical Chemistry', 'Urine analysis for various health markers', 20000.00, 18000.00, 16000.00, 'DEPT003', false, 10, true),

-- Radiology Services
('XR001', 'X-Ray', 'أشعة سينية', 'Radiology', 'Diagnostic Imaging', 'X-ray imaging for bone and chest examination', 75000.00, 67500.00, 60000.00, 'DEPT004', true, 20, true),
('US001', 'Ultrasound', 'الموجات فوق الصوتية', 'Radiology', 'Diagnostic Imaging', 'Ultrasound imaging for soft tissue examination', 150000.00, 135000.00, 120000.00, 'DEPT004', true, 30, true),
('CT001', 'CT Scan', 'أشعة مقطعية', 'Radiology', 'Diagnostic Imaging', 'Computed tomography scan for detailed imaging', 300000.00, 270000.00, 240000.00, 'DEPT004', true, 25, true),

-- Cardiology Services
('EC001', 'ECG', 'تخطيط القلب', 'Cardiology', 'Diagnostic', 'Electrocardiogram for heart activity monitoring', 30000.00, 27000.00, 24000.00, 'DEPT005', false, 15, true),
('ECHO001', 'Echocardiogram', 'صدى القلب', 'Cardiology', 'Diagnostic', 'Ultrasound imaging of the heart', 200000.00, 180000.00, 160000.00, 'DEPT005', true, 45, true),

-- Dental Services
('DC001', 'Dental Checkup', 'فحص الأسنان', 'Dental', 'General Dentistry', 'Comprehensive dental examination and cleaning', 80000.00, 72000.00, 64000.00, 'DEPT006', true, 30, true),
('EX001', 'Tooth Extraction', 'خلع الأسنان', 'Dental', 'Oral Surgery', 'Simple tooth extraction procedure', 50000.00, 45000.00, 40000.00, 'DEPT006', true, 20, true),

-- Preventive Services
('VC001', 'Vaccination', 'التطعيم', 'Preventive', 'Immunization', 'Routine vaccination for disease prevention', 20000.00, 18000.00, 16000.00, 'DEPT007', false, 10, true),
('HC001', 'Health Checkup', 'فحص شامل', 'Preventive', 'Screening', 'Comprehensive annual health examination', 150000.00, 135000.00, 120000.00, 'DEPT007', true, 60, true),

-- Therapy Services
('PT001', 'Physical Therapy', 'العلاج الطبيعي', 'Therapy', 'Rehabilitation', 'Physical therapy session for rehabilitation', 120000.00, 108000.00, 96000.00, 'DEPT008', true, 60, true),
('OT001', 'Occupational Therapy', 'العلاج الوظيفي', 'Therapy', 'Rehabilitation', 'Occupational therapy for daily living skills', 100000.00, 90000.00, 80000.00, 'DEPT008', true, 45, true),

-- Surgery Services
('MS001', 'Minor Surgery', 'جراحة بسيطة', 'Surgery', 'Outpatient', 'Minor surgical procedures under local anesthesia', 500000.00, 450000.00, 400000.00, 'DEPT009', true, 90, true),
('GS001', 'General Surgery', 'جراحة عامة', 'Surgery', 'Inpatient', 'General surgical procedures requiring hospitalization', 1000000.00, 900000.00, 800000.00, 'DEPT009', true, 120, true)

ON CONFLICT (code) DO NOTHING;

-- Verify insertion
SELECT 
    code,
    name,
    category,
    subcategory,
    price_self_pay,
    active,
    createdat
FROM services 
ORDER BY category, name;
