-- ============================================================
-- Migration 011: Service Share Payments
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Fix provider_id column type on invoice_items
-- Change from UUID to VARCHAR so we can use codes like 'PRV001'
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' 
    AND column_name = 'provider_id' 
    AND data_type = 'uuid'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.invoice_items ALTER COLUMN provider_id TYPE VARCHAR(50) USING provider_id::VARCHAR;
    RAISE NOTICE 'Changed provider_id from UUID to VARCHAR(50)';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Add missing columns to invoice_items for payment tracking
-- ============================================================
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS payment_batch_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- ============================================================
-- STEP 3: Create service_catalog table (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_catalog (
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

-- ============================================================
-- STEP 4: Seed service_catalog with default services
-- ============================================================
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
  ('svc-012', 'LAB-003', 'Urinalysis', 'تحليل البول', 'LAB', 10000, 8000, 6000, 'PRV003', 'National Laboratory Services', 4000)
ON CONFLICT (id) DO UPDATE SET
  provider_id = EXCLUDED.provider_id,
  provider_name = EXCLUDED.provider_name,
  service_fee = EXCLUDED.service_fee,
  updated_at = NOW();

-- ============================================================
-- STEP 5: Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoice_items_provider_id ON public.invoice_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_payment_status ON public.invoice_items(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_payment_batch_id ON public.invoice_items(payment_batch_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON public.service_catalog(category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_provider_id ON public.service_catalog(provider_id);

-- ============================================================
-- STEP 6: Refresh PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- STEP 7: Verify
-- ============================================================
SELECT 'invoice_items columns:' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'invoice_items' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'service_catalog count:' AS info;
SELECT COUNT(*) AS total_services FROM public.service_catalog;
