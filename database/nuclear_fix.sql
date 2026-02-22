-- ============================================================
-- Nuclear Option: Drop and recreate service_catalog table
-- Run this in Supabase SQL Editor
-- WARNING: This will delete all existing service data
-- ============================================================

-- STEP 1: Drop ALL foreign key constraints on invoice_items
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'invoice_items' 
        AND tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- STEP 2: Drop service_catalog table completely
DROP TABLE IF EXISTS public.service_catalog CASCADE;

-- STEP 3: Recreate service_catalog with correct types
CREATE TABLE public.service_catalog (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  price_self_pay DECIMAL(10,2) DEFAULT 0,
  price_insurance DECIMAL(10,2) DEFAULT 0,
  price_government DECIMAL(10,2) DEFAULT 0,
  provider_id VARCHAR(50),
  provider_name VARCHAR(255),
  service_fee DECIMAL(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Change invoice_items.service_id from UUID to VARCHAR (if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' 
    AND column_name = 'service_id' 
    AND data_type = 'uuid'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.invoice_items ALTER COLUMN service_id TYPE VARCHAR(50) USING service_id::VARCHAR;
    RAISE NOTICE 'Changed invoice_items.service_id from UUID to VARCHAR(50)';
  END IF;
END $$;

-- STEP 5: Add missing columns to invoice_items
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS payment_batch_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- STEP 6: Seed service_catalog with provider info
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

-- STEP 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_provider_id ON public.invoice_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_payment_status ON public.invoice_items(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_payment_batch_id ON public.invoice_items(payment_batch_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON public.service_catalog(category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_provider_id ON public.service_catalog(provider_id);

-- STEP 8: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- STEP 9: Verify
SELECT '=== service_catalog structure ===' AS info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'service_catalog' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== service_catalog data ===' AS info;
SELECT id, code, name, provider_id, provider_name, service_fee FROM public.service_catalog ORDER BY id LIMIT 5;

SELECT '=== invoice_items payment columns ===' AS info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'invoice_items' AND table_schema = 'public'
AND column_name IN ('provider_id', 'provider_name', 'service_fee', 'payment_status', 'payment_batch_id', 'payment_date')
ORDER BY column_name;
