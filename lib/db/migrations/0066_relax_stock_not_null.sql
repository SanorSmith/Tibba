-- Temporarily relax the NOT NULL added in 0062.
--
-- 0062 made workspace_id NOT NULL on these four tables and fixed the 15 insert
-- sites that had to stamp it. Those code fixes are not deployed yet, and the
-- deployed application shares this database — so every stock write from it
-- (goods receipt, dispensing, lab pull, adjustments) failed the constraint.
--
-- The column, the backfilled values, the foreign key and the index all stay.
-- Only the NOT NULL is lifted, so existing rows keep their owner and the
-- policies in 0064 still work; a new row simply may arrive without one.
--
-- Restore it once the insert fixes are deployed:
--   UPDATE <table> SET workspace_id = w.workspace_id
--     FROM warehouses w WHERE w.id = <table>.warehouse_id AND workspace_id IS NULL;
--   ALTER TABLE <table> ALTER COLUMN workspace_id SET NOT NULL;
--
-- Applied to production on 2026-08-22.

ALTER TABLE stock_transactions   ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE warehouse_sections   ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE stock_adjustments    ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE purchase_order_items ALTER COLUMN workspace_id DROP NOT NULL;
