-- ============================================================
-- Fix service_catalog table for Service Share Payments
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- STEP 1: Change id column from UUID to VARCHAR (if it's UUID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_catalog' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.service_catalog ALTER COLUMN id TYPE VARCHAR(50) USING id::VARCHAR;
    RAISE NOTICE 'Changed service_catalog.id from UUID to VARCHAR(50)';
  END IF;
END $$;

-- STEP 2: Add missing provider columns if they don't exist
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0;

-- STEP 3: Clear existing data and seed with provider info
DELETE FROM public.service_catalog;

INSERT INTO public.service_catalog (id, code, name, name_ar, category, price_self_pay, price_insurance, price_government, provider_id, provider_name, service_fee) VALUES
  ('svc-001', 'CONS-001', 'General Consultation', 'استشارة عامة', 'CONSULTATION', 25000, 20000, 15000, 'PRV001', 'Baghdad Medical Center', 8000),
  ('svc-002', 'CONS-002', 'Specialist Consultation', 'استشارة متخصصة', 'CONSULTATION', 50000, 40000, 30000, 'PRV001', 'Baghdad Medical Center', 16000),
  ('svc-003', 'LAB-001', 'Complete Blood Count', 'تعداد الدم الكامل', 'LAB', 15000, 12000, 10000, 'PRV003', 'National Laboratory Services', 9000),
  ('svc-004', 'LAB-002', 'Blood Chemistry Panel', 'لوحة الكيمياء الدموية', 'LAB', 35000, 28000, 20000, 'PRV003', 'National Laboratory Services', 14000),
  ('svc-005', 'IMG-001', 'Chest X-Ray', 'أشعة الصدر', 'IMAGING', 30000, 25000, 20000, 'PRV002', 'Al-Rasheed Radiology Lab', 14000),
  ('svc-006', 'IMG-002', 'Abdominal Ultrasound', 'الموجات فوق الصوتية للبطن', 'IMAGING', 45000, 36000, 25000, 'PRV002', 'Al-Rasheed Radiology Lab', 18000),
  ('svc-007', 'IMG-003', 'CT Scan', 'التصوير المقطعي', 'IMAGING', 150000, 120000, 90000, 'PRV002', 'Al-Rasheed Radiology Lab', 48000),
  ('svc-008', 'PROC-001', 'Minor Surgery', 'جراحة بسيطة', 'PROCEDURE', 200000, 160000, 120000, 'PRV008', 'Al-Zahrawi Surgical Center', 120000),
  ('svc-009', 'PROC-002', 'IV Infusion', 'التسريب الوريدي', 'PROCEDURE', 20000, 16000, 12000, 'PRV006', 'Emergency Care Solutions', 6500),
  ('svc-010', 'DIAG-001', 'ECG', 'تخطيط القلب', 'DIAGNOSTIC', 25000, 20000, 15000, 'PRV001', 'Baghdad Medical Center', 8000),
  ('svc-011', 'DIAG-002', 'Echocardiogram', 'صدى القلب', 'DIAGNOSTIC', 80000, 64000, 48000, 'PRV001', 'Baghdad Medical Center', 28000),
  ('svc-012', 'LAB-003', 'Urinalysis', 'تحليل البول', 'LAB', 10000, 8000, 6000, 'PRV003', 'National Laboratory Services', 4000);

-- STEP 4: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- STEP 5: Verify
SELECT 'service_catalog structure:' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'service_catalog' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'service_catalog data:' AS info;
SELECT id, code, name, provider_id, provider_name, service_fee FROM public.service_catalog ORDER BY id;
