-- Migration: Rename 'description' column to 'route' in drugs and global_drugs tables
-- Purpose: Better reflect that this field stores the administration route (oral, IV, etc.)
-- Date: 2026-05-08

-- Rename column in global_drugs table
ALTER TABLE global_drugs 
RENAME COLUMN description TO route;

-- Rename column in drugs table
ALTER TABLE drugs 
RENAME COLUMN description TO route;

-- Update comments for clarity
COMMENT ON COLUMN global_drugs.route IS 'Administration route (e.g., oral, IV, topical, sublingual)';
COMMENT ON COLUMN drugs.route IS 'Administration route (e.g., oral, IV, topical, sublingual)';
