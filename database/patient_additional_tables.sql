-- Patient Emergency Contacts Table
CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
    emergencycontactid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patientid UUID NOT NULL,
    contactname TEXT,
    contactphone TEXT,
    relationship TEXT,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_patient_emergency
        FOREIGN KEY (patientid) 
        REFERENCES patients(patientid)
        ON DELETE CASCADE
);

-- Patient Insurance Information Table
CREATE TABLE IF NOT EXISTS patient_insurance_information (
    insuranceid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patientid UUID NOT NULL,
    insurancecompany TEXT,
    insurancenumber TEXT,
    policytype TEXT,
    coveragedetails JSONB DEFAULT '{}',
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_patient_insurance
        FOREIGN KEY (patientid) 
        REFERENCES patients(patientid)
        ON DELETE CASCADE
);

-- Patient Medical Information Table
CREATE TABLE IF NOT EXISTS patient_medical_information (
    medicalinfoid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patientid UUID NOT NULL,
    allergies TEXT,
    chronicdiseases TEXT,
    currentmedications TEXT,
    medicalhistory TEXT,
    surgicalhistory TEXT,
    familyhistory TEXT,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_patient_medical
        FOREIGN KEY (patientid) 
        REFERENCES patients(patientid)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient ON patient_emergency_contacts(patientid);
CREATE INDEX IF NOT EXISTS idx_insurance_patient ON patient_insurance_information(patientid);
CREATE INDEX IF NOT EXISTS idx_medical_info_patient ON patient_medical_information(patientid);

-- Comments for documentation
COMMENT ON TABLE patient_emergency_contacts IS 'Stores emergency contact information for patients';
COMMENT ON TABLE patient_insurance_information IS 'Stores insurance details for patients';
COMMENT ON TABLE patient_medical_information IS 'Stores detailed medical information including allergies, chronic diseases, and medications';
