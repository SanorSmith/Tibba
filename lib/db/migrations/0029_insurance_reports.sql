-- Create insurance_reports table
CREATE TABLE IF NOT EXISTS "insurance_reports" (
  "reportid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patientid" uuid NOT NULL REFERENCES "patients"("patientid") ON DELETE CASCADE,
  "reporttype" text NOT NULL,
  "insurancecompany" text NOT NULL,
  "diagnosis" text NOT NULL,
  "clinicalfindings" text,
  "treatmentplan" text,
  "medications" text,
  "investigations" text,
  "prognosis" text,
  "workstatus" text,
  "recommendations" text,
  "reportdata" jsonb,
  "createdat" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedat" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index on patientid for faster lookups
CREATE INDEX IF NOT EXISTS "insurance_reports_patient_idx" ON "insurance_reports" ("patientid");
CREATE INDEX IF NOT EXISTS "insurance_reports_created_idx" ON "insurance_reports" ("createdat");
