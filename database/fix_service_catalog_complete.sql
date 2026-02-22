-- ============================================================
-- Complete Fix for Service Share Payments System
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- STEP 1: Drop foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoice_line_items_service_id_fkey' 
    AND table_name = 'invoice_items' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.invoice_items DROP CONSTRAINT invoice_line_items_service_id_fkey;
    RAISE NOTICE 'Dropped foreign key constraint';
  END IF;
END $$;

-- STEP 2: Change service_catalog.id from UUID to VARCHAR
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

-- STEP 3: Change invoice_items.service_id from UUID to VARCHAR (if it exists)
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

-- STEP 4: Add missing columns to invoice_items for payment tracking
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS payment_batch_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- STEP 5: Add missing columns to service_catalog
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0;

-- STEP 6: Clear and reseed service_catalog with provider info
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

-- STEP 7: Recreate foreign key constraint with VARCHAR types
ALTER TABLE public.invoice_items 
ADD CONSTRAINT invoice_line_items_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES public.service_catalog(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- STEP 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_provider_id ON public.invoice_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_payment_status ON public.invoice_items(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_payment_batch_id ON public.invoice_items(payment_batch_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON public.service_catalog(category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_provider_id ON public.service_catalog(provider_id);

-- STEP 9: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- STEP 10: Verify everything
SELECT '=== invoice_items columns ===' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'invoice_items' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== service_catalog columns ===' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'service_catalog' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== service_catalog data ===' AS info;
SELECT id, code, name, provider_id, provider_name, service_fee FROM public.service_catalog ORDER BY id;

SELECT '=== constraints ===' AS info;
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND (table_name = 'invoice_items' OR table_name = 'service_catalog')
AND constraint_type = 'FOREIGN KEY';
