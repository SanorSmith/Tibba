-- More record kinds for the owning-facility lookup.
--
-- Same shape and same reasoning as 0067: these routes are reached with one
-- record id and no workspace, so the tenant has to be resolved before any
-- scoped read can happen. Each branch returns a single workspace id.

CREATE OR REPLACE FUNCTION public.app_owner_workspace(kind text, id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  owner uuid;
BEGIN
  IF id IS NULL THEN
    RETURN NULL;
  END IF;

  CASE kind
    WHEN 'pos_sale' THEN
      SELECT workspaceid INTO owner FROM pos_sales WHERE saleid = id;
    WHEN 'pos_shift' THEN
      SELECT workspaceid INTO owner FROM pos_shifts WHERE shiftid = id;
    WHEN 'pos_return' THEN
      SELECT workspaceid INTO owner FROM pos_returns WHERE returnid = id;
    WHEN 'accession_sample' THEN
      SELECT workspaceid INTO owner FROM accession_samples WHERE sampleid = id;
    WHEN 'worklist' THEN
      SELECT workspaceid INTO owner FROM worklists WHERE worklistid = id;
    WHEN 'sample_storage' THEN
      SELECT workspaceid INTO owner FROM sample_storage WHERE storageid = id;
    WHEN 'storage_location' THEN
      SELECT workspaceid INTO owner FROM storage_locations WHERE locationid = id;
    WHEN 'pharmacy_order' THEN
      SELECT workspaceid INTO owner FROM pharmacy_orders WHERE orderid = id;
    WHEN 'pharmacy' THEN
      SELECT workspaceid INTO owner FROM pharmacies WHERE pharmacyid = id;
    ELSE
      RETURN NULL;
  END CASE;

  RETURN owner;
END;
$$;

REVOKE ALL ON FUNCTION public.app_owner_workspace(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_user;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_admin;
