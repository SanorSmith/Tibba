-- Create insurance_pre_approvals table for tracking pre-authorization requests
CREATE TABLE IF NOT EXISTS insurance_pre_approvals (
  preapprovalid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patientid UUID NOT NULL REFERENCES patients(patientid) ON DELETE CASCADE,
  insuranceid UUID NOT NULL REFERENCES insurance_companies(insuranceid) ON DELETE CASCADE,
  patientinsuranceid UUID REFERENCES patient_insurance(patientinsuranceid) ON DELETE CASCADE,
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  authorization_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'approved_with_conditions'
  cpt_codes TEXT[],
  icd10_codes TEXT[],
  authorized_amount NUMERIC(10,2),
  expiration_date DATE,
  conditions TEXT[],
  denial_reason TEXT,
  appeal_deadline DATE,
  response_date TIMESTAMP WITH TIME ZONE,
  clinical_justification TEXT,
  requested_services JSONB,
  cost_breakdown JSONB,
  supporting_documents TEXT[],
  createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_insurance_pre_approvals_patientid ON insurance_pre_approvals(patientid);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_approvals_insuranceid ON insurance_pre_approvals(insuranceid);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_approvals_status ON insurance_pre_approvals(status);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_approvals_authorization_number ON insurance_pre_approvals(authorization_number);

-- Add comment to table
COMMENT ON TABLE insurance_pre_approvals IS 'Tracks prior authorization requests from insurance companies';
