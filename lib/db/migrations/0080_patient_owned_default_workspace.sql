-- New patient-owned rows adopt the facility they were written in.
--
-- 0078 gave these tables a facility column and backfilled what the data could
-- support: 33 of 138 rows. The rest have no facility anywhere — 114 of 169
-- patients have no activity at all — and their policies admit NULL so they
-- stay visible rather than vanishing.
--
-- That leaves a hole going forward. The policy permits NULL on insert, so a
-- row written today would also arrive with no facility, and the unattributed
-- share would never shrink. Fixing that in the application means finding every
-- insert site for twelve tables and remembering the column each time somebody
-- adds a thirteenth.
--
-- A trigger cannot be forgotten. Any insert running inside `withTenant` picks
-- up that facility; an insert with a facility already set keeps it; an insert
-- outside any tenant still writes NULL, exactly as it does today. So this
-- changes no existing behaviour — it only stops the gap from growing, and the
-- isolation improves on its own as records accumulate.

CREATE OR REPLACE FUNCTION public.app_default_workspace()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.workspaceid IS NULL THEN
    NEW.workspaceid := NULLIF(current_setting('app.workspace_id', true), '')::uuid;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patient_medical_information',
    'patient_emergency_contacts',
    'patient_insurance_information',
    'patient_insurance',
    'insurance_reports',
    'patient_pain_records',
    'interaction_check_log',
    'home_collection_requests',
    'carts',
    'orders',
    'laborders',
    'labreviews'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_workspace_on_insert ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_workspace_on_insert BEFORE INSERT ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.app_default_workspace()', t);
  END LOOP;
END;
$$;
