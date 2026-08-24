-- One more record kind for the owning-facility lookup.
--
-- The legacy procurement API is handed a goods-receipt id and nothing else,
-- so the same circularity applies as in 0067: reading the row to find its
-- facility needs a facility. Same answer — one uuid, nothing else.

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
    WHEN 'goods_receipt_note' THEN
      -- aliased: this table's primary key is literally `id`, which collides
      -- with the parameter name inside PL/pgSQL.
      SELECT g.workspaceid INTO owner FROM goods_receipt_notes g WHERE g.id = app_owner_workspace.id;
    ELSE
      RETURN NULL;
  END CASE;

  RETURN owner;
END;
$$;

REVOKE ALL ON FUNCTION public.app_owner_workspace(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_user;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_admin;
