-- Give supplier claims and returns the columns their code already uses, and
-- scope them on their own facility rather than through the vendor.
--
-- /api/d/[workspaceid]/procurement/claims and .../returns were dead: every
-- request ended in `column "workspace_id" does not exist`. schema.ts described
-- tables that were never built that way - underscored names throughout, plus
-- workspaceid, claimdate and createdby, none of which the tables had.
--
-- Two ways to close that gap. The column names the tables already carry
-- (claimnumber, claimtype, quantityclaimed) match their neighbours -
-- goods_receipt_notes, vendors, suppliers all run unseparated - so the
-- database is left as it is and schema.ts is corrected to point at the real
-- columns. Only the three that genuinely do not exist are added here, in the
-- same style.
--
-- All three tables are empty, so NOT NULL needs no backfill and nothing has to
-- be guessed for existing rows.
--
-- On isolation: these were NOT unscoped. The existing policies read "visible
-- if a vendor with this vendorid is visible", and vendors is itself scoped to
-- app.workspace_id, so a claim was already reachable only by the facility that
-- owns its vendor - and a null vendorid failed closed rather than open. What
-- the indirection cost was legibility, and a dependency on vendors staying
-- scoped forever. Now that these rows carry their own facility, they are
-- matched on it directly, the way every other table is.
--
-- supplier_return_items keeps its parent chain through supplier_returns: it
-- has no facility of its own to carry, and its parent now names one directly.

ALTER TABLE supplier_claims
  ADD COLUMN IF NOT EXISTS workspaceid uuid REFERENCES workspaces(workspaceid),
  ADD COLUMN IF NOT EXISTS claimdate   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS createdby   text;

ALTER TABLE supplier_returns
  ADD COLUMN IF NOT EXISTS workspaceid uuid REFERENCES workspaces(workspaceid),
  ADD COLUMN IF NOT EXISTS createdby   text;

-- Stamp the facility on insert, exactly as goods_receipt_notes, vendors and
-- pharmacy_orders do. Without it a NOT NULL column would simply reject every
-- insert from a route that does not name the facility by hand.
DROP TRIGGER IF EXISTS set_workspace_on_insert ON supplier_claims;
CREATE TRIGGER set_workspace_on_insert
  BEFORE INSERT ON supplier_claims
  FOR EACH ROW EXECUTE FUNCTION app_default_workspace();

DROP TRIGGER IF EXISTS set_workspace_on_insert ON supplier_returns;
CREATE TRIGGER set_workspace_on_insert
  BEFORE INSERT ON supplier_returns
  FOR EACH ROW EXECUTE FUNCTION app_default_workspace();

-- Safe without a backfill: both tables hold 0 rows.
ALTER TABLE supplier_claims  ALTER COLUMN workspaceid SET NOT NULL;
ALTER TABLE supplier_returns ALTER COLUMN workspaceid SET NOT NULL;

-- Scope on the row's own facility instead of the vendor's.
DROP POLICY IF EXISTS tenant_isolation ON supplier_claims;
CREATE POLICY tenant_isolation ON supplier_claims
  FOR ALL
  USING      (workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON supplier_returns;
CREATE POLICY tenant_isolation ON supplier_returns
  FOR ALL
  USING      (workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

COMMENT ON COLUMN supplier_claims.workspaceid  IS 'Facility that raised the claim. Stamped on insert from app.workspace_id.';
COMMENT ON COLUMN supplier_returns.workspaceid IS 'Facility that raised the return. Stamped on insert from app.workspace_id.';
