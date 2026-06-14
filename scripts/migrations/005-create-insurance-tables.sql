-- Create insurance_companies table
CREATE TABLE IF NOT EXISTS insurance_companies (
  insuranceid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspaceid UUID,
  name TEXT NOT NULL,
  code TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  coveragepercent NUMERIC(5,2) DEFAULT 80.00,
  api_endpoint TEXT,
  api_key TEXT,
  edi_payer_id TEXT,
  claim_submission_method TEXT,
  pre_approval_required BOOLEAN DEFAULT true,
  isactive BOOLEAN DEFAULT true,
  createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create patient_insurance table
CREATE TABLE IF NOT EXISTS patient_insurance (
  patientinsuranceid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patientid UUID,
  insuranceid UUID,
  policynumber TEXT NOT NULL,
  groupnumber TEXT,
  startdate DATE,
  enddate DATE,
  isprimary BOOLEAN DEFAULT true,
  isactive BOOLEAN DEFAULT true,
  createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for patient_insurance
CREATE INDEX IF NOT EXISTS idx_patient_insurance_patientid ON patient_insurance(patientid);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_insuranceid ON patient_insurance(insuranceid);

-- Create insurance_pre_approvals table
CREATE TABLE IF NOT EXISTS insurance_pre_approvals (
  preapprovalid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patientid UUID,
  insuranceid UUID,
  patientinsuranceid UUID,
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  authorization_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
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

-- Create indexes for insurance_pre_approvals
CREATE INDEX IF NOT EXISTS idx_insurance_pre_approvals_patientid ON insurance_pre_approvals(patientid);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_approvals_insuranceid ON insurance_pre_approvals(insuranceid);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_approvals_status ON insurance_pre_approvals(status);
CREATE INDEX IF NOT EXISTS idx_insurance_pre_approvals_authorization_number ON insurance_pre_approvals(authorization_number);

-- Add comments
COMMENT ON TABLE insurance_companies IS 'Master list of insurance providers';
COMMENT ON TABLE patient_insurance IS 'Links patients to their insurance plans';
COMMENT ON TABLE insurance_pre_approvals IS 'Tracks prior authorization requests from insurance companies';
