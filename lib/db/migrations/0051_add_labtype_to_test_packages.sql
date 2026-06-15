-- Add labtype column to test_packages table
ALTER TABLE "test_packages" ADD COLUMN IF NOT EXISTS "labtype" varchar(100);
