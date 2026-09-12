-- An invoice may not name a patient or an insurer that does not exist.
--
-- Twenty-seven invoices did. They carried real patient names, real dates and
-- real money, but the patient record each pointed at was gone, so any screen
-- joining the two showed a blank and the insurance report printed with the
-- patient section empty. Four of them also named an insurance company that is
-- not on file. Those invoices were removed, on the owner's instruction, after
-- being shown that they were 7,549,000 of a 17,242,577 book.
--
-- Removing them fixes today. This stops it happening again, which is the part
-- worth keeping.
--
-- `patient_id` was varchar against a uuid column, which is why no foreign key
-- could be declared. Every remaining value is a well-formed uuid, so the type
-- is changed first and the key follows. Nullable throughout: an invoice with
-- no patient is legitimate, and a walk-in is not a data error. What is not
-- legitimate is naming a patient who is not there.
--
-- ON DELETE RESTRICT rather than CASCADE. Deleting a patient should not
-- silently take their billing history with it; it should fail and make
-- somebody decide, which is the same reasoning that keeps a staff member with
-- recorded work from being deleted.

-- 1. The patient reference.
ALTER TABLE invoices
  ALTER COLUMN patient_id TYPE uuid USING NULLIF(patient_id, '')::uuid;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_patient_id_fkey;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients (patientid)
  ON DELETE RESTRICT;

-- 2. The insurer reference.
--
-- Both sides are already varchar, so only the key is needed. The empty string
-- is normalised to null first: seven invoices carry '' to mean "no insurer",
-- which a foreign key would read as an insurer whose id is the empty string.
-- The billing screens already treat '' as no insurer, so this makes the column
-- say what the application already believes.
UPDATE invoices SET insurance_company_id = NULL WHERE insurance_company_id = '';

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_insurance_company_id_fkey;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_insurance_company_id_fkey
  FOREIGN KEY (insurance_company_id) REFERENCES insurance_companies (company_id)
  ON DELETE RESTRICT;

COMMENT ON CONSTRAINT invoices_patient_id_fkey ON invoices IS
  'An invoice names a patient who exists, or names none at all. RESTRICT so deleting a patient fails rather than quietly removing their billing history.';

COMMENT ON CONSTRAINT invoices_insurance_company_id_fkey ON invoices IS
  'An invoice names an insurer on file, or none. Null means uninsured; the empty string is no longer used.';
