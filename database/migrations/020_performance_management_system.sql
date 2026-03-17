-- ============================================================================
-- Performance Management System - Complete Database Schema
-- ============================================================================
-- This migration creates all tables for the performance management system
-- including reviews, patient feedback, recognitions, and promotions.
-- All tables are properly linked to existing staff and patients tables.
-- ============================================================================

-- ============================================================================
-- 1. PERFORMANCE REVIEWS TABLE
-- ============================================================================
-- Stores employee performance evaluations with competency ratings
-- Links to: staff (employee_id, reviewer_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_reviews (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys to existing tables
    employee_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    
    -- Review Cycle Information
    cycle_id VARCHAR(50) NOT NULL,
    cycle_name VARCHAR(200),
    review_period_start DATE,
    review_period_end DATE,
    review_date DATE DEFAULT CURRENT_DATE,
    
    -- Competency Ratings (1.0 to 5.0)
    clinical_competence DECIMAL(2,1) CHECK (clinical_competence >= 1.0 AND clinical_competence <= 5.0),
    patient_care DECIMAL(2,1) CHECK (patient_care >= 1.0 AND patient_care <= 5.0),
    professionalism DECIMAL(2,1) CHECK (professionalism >= 1.0 AND professionalism <= 5.0),
    teamwork DECIMAL(2,1) CHECK (teamwork >= 1.0 AND teamwork <= 5.0),
    quality_safety DECIMAL(2,1) CHECK (quality_safety >= 1.0 AND quality_safety <= 5.0),
    
    -- Auto-calculated scores (from other tables)
    attendance_score INTEGER CHECK (attendance_score >= 0 AND attendance_score <= 100),
    attendance_rating VARCHAR(20), -- EXCELLENT, GOOD, FAIR, POOR
    patient_feedback_score DECIMAL(2,1),
    recognition_bonus DECIMAL(3,2),
    
    -- Overall Rating (weighted average)
    overall_rating DECIMAL(2,1) CHECK (overall_rating >= 1.0 AND overall_rating <= 5.0),
    
    -- Text Fields
    strengths TEXT,
    improvements TEXT,
    achievements TEXT,
    goals_next_period TEXT,
    recommendation VARCHAR(100), -- Standard Increase, Merit Increase, Promotion, PIP
    
    -- Status Workflow
    status VARCHAR(20) DEFAULT 'NOT_STARTED' CHECK (status IN (
        'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'FINALIZED', 'ARCHIVED'
    )),
    
    -- Approval Workflow
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    finalized_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    updated_by UUID REFERENCES staff(staffid) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_date ON performance_reviews(review_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_performance_reviews_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER performance_reviews_update_timestamp
    BEFORE UPDATE ON performance_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_reviews_timestamp();

-- ============================================================================
-- 2. PATIENT FEEDBACK TABLE
-- ============================================================================
-- Stores patient satisfaction ratings for healthcare providers
-- Links to: staff (employee_id), patients (patient_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_feedback (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    employee_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(patientid) ON DELETE SET NULL,
    
    -- Feedback Date
    feedback_date DATE DEFAULT CURRENT_DATE,
    appointment_date DATE,
    
    -- Ratings (1 to 5)
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    care_quality_rating INTEGER CHECK (care_quality_rating >= 1 AND care_quality_rating <= 5),
    overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
    
    -- Text Feedback
    positive_comments TEXT,
    improvement_areas TEXT,
    additional_comments TEXT,
    
    -- Metadata
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_feedback_employee ON patient_feedback(employee_id);
CREATE INDEX IF NOT EXISTS idx_patient_feedback_patient ON patient_feedback(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_feedback_date ON patient_feedback(feedback_date);
CREATE INDEX IF NOT EXISTS idx_patient_feedback_rating ON patient_feedback(overall_satisfaction);

-- ============================================================================
-- 3. EMPLOYEE RECOGNITIONS TABLE
-- ============================================================================
-- Stores employee awards and recognitions
-- Links to: staff (employee_id, recognized_by, approved_by)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_recognitions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    employee_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE,
    recognized_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    approved_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    
    -- Recognition Details
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'SPOT_AWARD', 'EXCELLENCE_AWARD', 'PERFECT_ATTENDANCE', 
        'TEAM_PLAYER', 'INNOVATION', 'CUSTOMER_SERVICE', 
        'SAFETY_AWARD', 'LEADERSHIP', 'MENTORSHIP', 'OTHER'
    )),
    title VARCHAR(200) NOT NULL,
    reason TEXT NOT NULL,
    
    -- Dates
    recognition_date DATE DEFAULT CURRENT_DATE,
    
    -- Monetary Reward
    monetary_reward DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'PAID'
    )),
    
    -- Auto-suggested flag
    is_auto_suggested BOOLEAN DEFAULT FALSE,
    suggestion_reason TEXT,
    
    -- Approval workflow
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    paid_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recognitions_employee ON employee_recognitions(employee_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_type ON employee_recognitions(type);
CREATE INDEX IF NOT EXISTS idx_recognitions_status ON employee_recognitions(status);
CREATE INDEX IF NOT EXISTS idx_recognitions_date ON employee_recognitions(recognition_date);
CREATE INDEX IF NOT EXISTS idx_recognitions_auto_suggested ON employee_recognitions(is_auto_suggested);

-- Trigger for updated_at
CREATE TRIGGER recognitions_update_timestamp
    BEFORE UPDATE ON employee_recognitions
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_reviews_timestamp();

-- ============================================================================
-- 4. PROMOTIONS TABLE
-- ============================================================================
-- Tracks employee promotions and career progression
-- Links to: staff (employee_id, approved_by, created_by)
-- ============================================================================

CREATE TABLE IF NOT EXISTS promotions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    employee_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE,
    approved_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    created_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    
    -- Position Details
    from_position VARCHAR(100) NOT NULL,
    to_position VARCHAR(100) NOT NULL,
    from_department VARCHAR(100),
    to_department VARCHAR(100),
    
    -- Salary Details
    current_salary DECIMAL(10,2),
    new_salary DECIMAL(10,2),
    salary_increase DECIMAL(10,2),
    salary_increase_percentage DECIMAL(5,2),
    
    -- Dates
    promotion_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    announcement_date DATE,
    
    -- Justification
    reason TEXT NOT NULL,
    performance_score DECIMAL(2,1),
    attendance_score INTEGER,
    years_of_service DECIMAL(4,2),
    
    -- Supporting Documents (references to performance reviews, etc.)
    performance_review_id UUID REFERENCES performance_reviews(id) ON DELETE SET NULL,
    supporting_documents JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CANCELLED'
    )),
    
    -- Approval Workflow
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    implemented_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_employee ON promotions(employee_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_effective_date ON promotions(effective_date);
CREATE INDEX IF NOT EXISTS idx_promotions_review ON promotions(performance_review_id);

-- Trigger for updated_at
CREATE TRIGGER promotions_update_timestamp
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_reviews_timestamp();

-- ============================================================================
-- 5. PERFORMANCE GOALS TABLE
-- ============================================================================
-- Stores individual and team goals/objectives
-- Links to: staff (employee_id, created_by)
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_goals (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    employee_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE,
    created_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    
    -- Goal Details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) CHECK (category IN (
        'CLINICAL', 'PATIENT_CARE', 'PROFESSIONAL_DEVELOPMENT', 
        'TEAMWORK', 'QUALITY', 'SAFETY', 'EFFICIENCY', 'OTHER'
    )),
    
    -- Timeline
    start_date DATE NOT NULL,
    target_date DATE NOT NULL,
    completed_date DATE,
    
    -- Progress
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status VARCHAR(20) DEFAULT 'NOT_STARTED' CHECK (status IN (
        'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'
    )),
    
    -- Measurement
    is_measurable BOOLEAN DEFAULT TRUE,
    target_metric VARCHAR(100),
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    
    -- Review
    review_notes TEXT,
    reviewed_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_employee ON performance_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON performance_goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON performance_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_category ON performance_goals(category);

-- Trigger for updated_at
CREATE TRIGGER goals_update_timestamp
    BEFORE UPDATE ON performance_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_reviews_timestamp();

-- ============================================================================
-- 6. AUDIT LOG FOR PERFORMANCE SYSTEM
-- ============================================================================
-- Tracks all changes to performance-related records
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES staff(staffid) ON DELETE SET NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON performance_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON performance_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON performance_audit_log(changed_at);

-- ============================================================================
-- GRANT PERMISSIONS (if needed)
-- ============================================================================
-- Grant appropriate permissions to application user
-- Uncomment if you have a specific application user

-- GRANT SELECT, INSERT, UPDATE, DELETE ON performance_reviews TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON patient_feedback TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON employee_recognitions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON promotions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON performance_goals TO your_app_user;
-- GRANT SELECT, INSERT ON performance_audit_log TO your_app_user;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify tables were created successfully

-- Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'performance_reviews', 
    'patient_feedback', 
    'employee_recognitions', 
    'promotions', 
    'performance_goals',
    'performance_audit_log'
  )
ORDER BY table_name;

-- Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN (
    'performance_reviews', 
    'patient_feedback', 
    'employee_recognitions', 
    'promotions', 
    'performance_goals'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All performance management tables created successfully
-- Foreign keys properly linked to existing staff and patients tables
-- No existing tables were modified or broken
-- ============================================================================
