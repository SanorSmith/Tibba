-- Row-level security for the tables that hang off a patient.
--
-- Migration 0068 made patients readable across facilities on purpose: the same
-- person may be treated at more than one, and a shared demographic record is
-- the point. Their clinical and financial detail is a different matter, and
-- these tables -- medical history, allergies, emergency contacts, insurance,
-- pain records, lab orders -- were readable by every facility.
--
-- They cannot inherit from patients, because that table is shared-read: a
-- policy anchored there would filter nothing. So each gets its own facility
-- column, taken from the patient record where it has one and otherwise from
-- where the patient was actually seen, when the answer is unambiguous.
--
-- 160 of 169 patients carry no facility, and only 37 of those can be resolved
-- from activity -- 114 have none anywhere. Rows that stay NULL remain visible
-- to everyone, exactly as they are today. This is deliberate: a wrong facility
-- on a medical record is worse than an unattributed one, and silently hiding
-- clinical data is worse than both. Isolation improves as attribution does.
-- The same NULL tolerance the patients UPDATE policy already uses.

-- Note the casts in the activity union: `samples.workspaceid` is text while
-- every other table's is uuid, so the columns are matched as text and cast
-- back on assignment.

ALTER TABLE public.patient_medical_information ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.patient_medical_information c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patientid::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.patient_medical_information c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patientid::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS patient_medical_information_ws_idx ON public.patient_medical_information (workspaceid);
ALTER TABLE public.patient_medical_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medical_information FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.patient_medical_information;
CREATE POLICY tenant_isolation ON public.patient_medical_information
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.patient_emergency_contacts ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.patient_emergency_contacts c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patientid::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.patient_emergency_contacts c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patientid::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS patient_emergency_contacts_ws_idx ON public.patient_emergency_contacts (workspaceid);
ALTER TABLE public.patient_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_emergency_contacts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.patient_emergency_contacts;
CREATE POLICY tenant_isolation ON public.patient_emergency_contacts
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.patient_insurance_information ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.patient_insurance_information c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patientid::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.patient_insurance_information c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patientid::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS patient_insurance_information_ws_idx ON public.patient_insurance_information (workspaceid);
ALTER TABLE public.patient_insurance_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_insurance_information FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.patient_insurance_information;
CREATE POLICY tenant_isolation ON public.patient_insurance_information
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.patient_insurance ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.patient_insurance c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patientid::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.patient_insurance c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patientid::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS patient_insurance_ws_idx ON public.patient_insurance (workspaceid);
ALTER TABLE public.patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_insurance FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.patient_insurance;
CREATE POLICY tenant_isolation ON public.patient_insurance
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.insurance_reports ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.insurance_reports c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patientid::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.insurance_reports c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patientid::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS insurance_reports_ws_idx ON public.insurance_reports (workspaceid);
ALTER TABLE public.insurance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.insurance_reports;
CREATE POLICY tenant_isolation ON public.insurance_reports
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.patient_pain_records ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.patient_pain_records c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patient_id::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.patient_pain_records c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patient_id::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS patient_pain_records_ws_idx ON public.patient_pain_records (workspaceid);
ALTER TABLE public.patient_pain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_pain_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.patient_pain_records;
CREATE POLICY tenant_isolation ON public.patient_pain_records
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.interaction_check_log ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.interaction_check_log c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patientid::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.interaction_check_log c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patientid::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS interaction_check_log_ws_idx ON public.interaction_check_log (workspaceid);
ALTER TABLE public.interaction_check_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_check_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.interaction_check_log;
CREATE POLICY tenant_isolation ON public.interaction_check_log
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.home_collection_requests ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.home_collection_requests c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patient_id::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.home_collection_requests c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patient_id::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS home_collection_requests_ws_idx ON public.home_collection_requests (workspaceid);
ALTER TABLE public.home_collection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_collection_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.home_collection_requests;
CREATE POLICY tenant_isolation ON public.home_collection_requests
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.carts c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patient_id::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.carts c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patient_id::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS carts_ws_idx ON public.carts (workspaceid);
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.carts;
CREATE POLICY tenant_isolation ON public.carts
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.orders c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patient_id::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.orders c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patient_id::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS orders_ws_idx ON public.orders (workspaceid);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.orders;
CREATE POLICY tenant_isolation ON public.orders
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.laborders ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.laborders c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patientid::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.laborders c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patientid::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS laborders_ws_idx ON public.laborders (workspaceid);
ALTER TABLE public.laborders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laborders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.laborders;
CREATE POLICY tenant_isolation ON public.laborders
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.labreviews ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- the facility on the patient record, where there is one
UPDATE public.labreviews c SET workspaceid = p.workspaceid
  FROM public.patients p
 WHERE p.patientid::text = c.patientid::text
   AND p.workspaceid IS NOT NULL AND c.workspaceid IS NULL;

-- otherwise the facility the patient was actually seen at, when only one
  WITH activity AS (
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.appointments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.emergency_doctor_assignments WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operation_prices WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.operations WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.patient_credit_accounts WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pharmacy_orders WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_returns WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.pos_sales WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
    UNION ALL
    SELECT patientid::text AS pid, workspaceid::text AS ws FROM public.samples WHERE patientid IS NOT NULL AND workspaceid IS NOT NULL
  ),
  sole AS (
    SELECT pid, min(ws) AS ws FROM activity GROUP BY pid HAVING count(DISTINCT ws) = 1
  )
UPDATE public.labreviews c SET workspaceid = s.ws::uuid FROM sole s
 WHERE s.pid = c.patientid::text AND c.workspaceid IS NULL;

CREATE INDEX IF NOT EXISTS labreviews_ws_idx ON public.labreviews (workspaceid);
ALTER TABLE public.labreviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labreviews FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.labreviews;
CREATE POLICY tenant_isolation ON public.labreviews
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.cart_items;
CREATE POLICY tenant_isolation ON public.cart_items
  USING (EXISTS (SELECT 1 FROM public.carts p WHERE p.id::text = cart_items.cart_id::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts p WHERE p.id::text = cart_items.cart_id::text));

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.order_items;
CREATE POLICY tenant_isolation ON public.order_items
  USING (EXISTS (SELECT 1 FROM public.orders p WHERE p.id::text = order_items.order_id::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders p WHERE p.id::text = order_items.order_id::text));

