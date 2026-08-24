-- Restoring what migration 0066 had to give up.
--
-- 0066 dropped these NOT NULLs because a live deployment was writing stock
-- rows with no facility, and the constraint turned that into an outage. The
-- honest fix was never the constraint — it was the eight raw-SQL inserts that
-- bypassed Drizzle and never named a workspace: pharmacy adjustments, storage
-- sections, POS checkout, POS returns, return approvals, and the legacy
-- procurement API. All eight now set it, as do the fourteen Drizzle paths.
--
-- Checked before applying: zero rows in any of these tables have a null
-- tenant, so nothing existing is invalidated.
--
-- !! RUN THIS ONLY AFTER THE INSERT FIXES ARE DEPLOYED. !!
--
-- I applied it once while the deployed build still had the old inserts, and
-- had to roll it back within the minute. Existing rows were never the risk —
-- the risk is the code that is running right now. The constraint is safe when
-- `git merge-base --is-ancestor <this commit> <deployed ref>` is true, and not
-- before. Checking the table is not the check; checking the deployment is.

ALTER TABLE stock_transactions   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE warehouse_sections   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE stock_adjustments    ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE purchase_order_items ALTER COLUMN workspace_id SET NOT NULL;
