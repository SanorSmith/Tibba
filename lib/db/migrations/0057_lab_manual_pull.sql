-- Manual reagent/consumable pulls from Lab Inventory.
--
-- lab_consumption_log already records "reagent used for a test run", but it
-- had no facility column, so pulls from different labs were indistinguishable.
-- Every read/write in the pull panel is scoped by this.
ALTER TABLE lab_consumption_log ADD COLUMN IF NOT EXISTS workspaceid uuid;

-- Manual pulls are ad-hoc: the user picks items themselves rather than the
-- quantity being derived from a reagent_assignments row, so there is no
-- assignment to reference. The column is already nullable in the database;
-- this documents that manual pulls rely on it.
ALTER TABLE lab_consumption_log ALTER COLUMN assignment_id DROP NOT NULL;

-- Who pulled it. Already present, but widened intent: for manual pulls this
-- holds the signed-in user's id so every pull is attributable.
ALTER TABLE lab_consumption_log ADD COLUMN IF NOT EXISTS created_by_name text;
ALTER TABLE lab_consumption_log ADD COLUMN IF NOT EXISTS warehouse_id uuid;

CREATE INDEX IF NOT EXISTS lab_consumption_log_workspace_idx ON lab_consumption_log (workspaceid);
CREATE INDEX IF NOT EXISTS lab_consumption_log_item_idx ON lab_consumption_log (item_id);
