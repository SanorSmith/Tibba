-- Phase 01 of the tenant-isolation work: give the four stock-side tables that
-- had no tenant column one of their own, so row-level security can guard them
-- directly instead of through a join someone has to remember to write.
--
-- Applied to production on 2026-08-22 together with a data correction: Pharma
-- had no warehouse at all (nothing provisions one), so its 25 stock rows and
-- 25 stock transactions sat in the hand-seeded "Main Pharmacy" warehouse
-- belonging to Alis. A "Pharma Main Store" warehouse was created and those
-- rows moved before the backfill, so item and warehouse agree on every row.
--
-- Backfill sources:
--   stock_transactions, warehouse_sections, stock_adjustments <- warehouse
--     (stock belongs where it physically sits)
--   purchase_order_items <- vendor via the purchase order
--     (every purchase_orders.warehouseid is NULL, so the warehouse path is
--     dead; vendors are workspace-scoped and all POs name one)

ALTER TABLE stock_transactions   ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE warehouse_sections   ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE stock_adjustments    ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE stock_transactions st SET workspace_id = w.workspace_id
  FROM warehouses w WHERE w.id = st.warehouse_id AND st.workspace_id IS NULL;
UPDATE warehouse_sections s SET workspace_id = w.workspace_id
  FROM warehouses w WHERE w.id = s.warehouse_id AND s.workspace_id IS NULL;
UPDATE stock_adjustments s SET workspace_id = w.workspace_id
  FROM warehouses w WHERE w.id = s.warehouse_id AND s.workspace_id IS NULL;
UPDATE purchase_order_items poi SET workspace_id = v.workspaceid
  FROM purchase_orders po JOIN vendors v ON v.id = po.vendorid
  WHERE po.id = poi.poid AND poi.workspace_id IS NULL;

ALTER TABLE stock_transactions   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE warehouse_sections   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE stock_adjustments    ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE purchase_order_items ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE stock_transactions   ADD CONSTRAINT stock_transactions_workspace_fk   FOREIGN KEY (workspace_id) REFERENCES workspaces(workspaceid);
ALTER TABLE warehouse_sections   ADD CONSTRAINT warehouse_sections_workspace_fk   FOREIGN KEY (workspace_id) REFERENCES workspaces(workspaceid);
ALTER TABLE stock_adjustments    ADD CONSTRAINT stock_adjustments_workspace_fk    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspaceid);
ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(workspaceid);

CREATE INDEX IF NOT EXISTS stock_transactions_workspace_idx   ON stock_transactions (workspace_id);
CREATE INDEX IF NOT EXISTS warehouse_sections_workspace_idx   ON warehouse_sections (workspace_id);
CREATE INDEX IF NOT EXISTS stock_adjustments_workspace_idx    ON stock_adjustments (workspace_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_workspace_idx ON purchase_order_items (workspace_id);
