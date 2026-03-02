-- Insert services into service_catalog table
-- With explicit UUID generation

INSERT INTO service_catalog (
  id,
  code, 
  name, 
  name_ar, 
  category,
  price_self_pay, 
  price_insurance, 
  price_government,
  active
) VALUES 
(gen_random_uuid(), 'CONS-001', 'General Consultation', 'استشارة عامة', 'CONSULTATION', 25000.00, 20000.00, 15000.00, true),
(gen_random_uuid(), 'CONS-002', 'Specialist Consultation', 'استشارة متخصصة', 'CONSULTATION', 50000.00, 40000.00, 30000.00, true),
(gen_random_uuid(), 'LAB-001', 'Complete Blood Count', 'تعداد الدم الكامل', 'LAB', 15000.00, 12000.00, 10000.00, true),
(gen_random_uuid(), 'LAB-002', 'Blood Chemistry Panel', 'لوحة الكيمياء الدموية', 'LAB', 35000.00, 28000.00, 20000.00, true),
(gen_random_uuid(), 'IMG-001', 'Chest X-Ray', 'أشعة الصدر', 'IMAGING', 30000.00, 25000.00, 20000.00, true),
(gen_random_uuid(), 'IMG-002', 'Abdominal Ultrasound', 'الموجات فوق الصوتية للبطن', 'IMAGING', 45000.00, 36000.00, 25000.00, true),
(gen_random_uuid(), 'IMG-003', 'CT Scan', 'التصوير المقطعي', 'IMAGING', 150000.00, 120000.00, 90000.00, true),
(gen_random_uuid(), 'PROC-001', 'Minor Surgery', 'جراحة بسيطة', 'PROCEDURE', 200000.00, 160000.00, 120000.00, true),
(gen_random_uuid(), 'PROC-002', 'IV Infusion', 'التسريب الوريدي', 'PROCEDURE', 20000.00, 16000.00, 12000.00, true),
(gen_random_uuid(), 'DIAG-001', 'ECG', 'تخطيط القلب', 'DIAGNOSTIC', 25000.00, 20000.00, 15000.00, true),
(gen_random_uuid(), 'DIAG-002', 'Echocardiogram', 'صدى القلب', 'DIAGNOSTIC', 80000.00, 64000.00, 48000.00, true),
(gen_random_uuid(), 'LAB-003', 'Urinalysis', 'تحليل البول', 'LAB', 10000.00, 8000.00, 6000.00, true);
