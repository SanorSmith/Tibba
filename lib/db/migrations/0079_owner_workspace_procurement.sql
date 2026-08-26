-- Three more record kinds for the owning-facility lookup.
--
-- The procurement and inventory routes are handed a warehouse, vendor or
-- purchase-order id and nothing else — no workspace in the path, the body or
-- the query string. Same circularity as 0067: finding the row's facility by
-- reading the row needs a facility to read it with.
--
-- Same answer as before. One uuid comes back, nothing about the record leaks,
-- and the caller learns the owner of an id it already had — which is what it
-- needs to ask the question that matters: does this user belong to that
-- facility?
--
-- Note the two spellings. `warehouses` uses `workspace_id`, `vendors` and
-- `purchase_orders` use `workspaceid`. Both are live; neither is a typo to
-- fix here.

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
      -- with the parameter name inside PL/pgSQL. Same below.
      SELECT g.workspaceid INTO owner FROM goods_receipt_notes g WHERE g.id = app_owner_workspace.id;
    WHEN 'warehouse' THEN
      SELECT w.workspace_id INTO owner FROM warehouses w WHERE w.id = app_owner_workspace.id;
    WHEN 'vendor' THEN
      SELECT v.workspaceid INTO owner FROM vendors v WHERE v.id = app_owner_workspace.id;
    WHEN 'purchase_order' THEN
      SELECT o.workspaceid INTO owner FROM purchase_orders o WHERE o.id = app_owner_workspace.id;
    ELSE
      RETURN NULL;
  END CASE;

  RETURN owner;
END;
$$;

REVOKE ALL ON FUNCTION public.app_owner_workspace(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_user;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_admin;
