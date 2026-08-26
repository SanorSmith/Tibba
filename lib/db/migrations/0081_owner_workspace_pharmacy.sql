-- Three more record kinds: items, storage sections, shop orders.
--
-- The pharmacy routes that edit one of these are reached as
-- `/api/pharmacy/items/<id>` and carry no facility. Same circularity as 0067,
-- same answer: one uuid, nothing about the record disclosed.
--
-- Three spellings of the key in three tables -- `items.id` with
-- `workspace_id`, `shop_orders.orderid` with `workspaceid`. Both are live.

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
    WHEN 'item' THEN
      SELECT i.workspace_id INTO owner FROM items i WHERE i.id = app_owner_workspace.id;
    WHEN 'warehouse_section' THEN
      SELECT s.workspace_id INTO owner FROM warehouse_sections s WHERE s.id = app_owner_workspace.id;
    WHEN 'shop_order' THEN
      SELECT o.workspaceid INTO owner FROM shop_orders o WHERE o.orderid = app_owner_workspace.id;
    ELSE
      RETURN NULL;
  END CASE;

  RETURN owner;
END;
$$;

REVOKE ALL ON FUNCTION public.app_owner_workspace(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_user;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_admin;
