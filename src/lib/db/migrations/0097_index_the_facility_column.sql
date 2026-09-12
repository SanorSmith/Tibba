-- Index the facility column where a table of any size is missing one.
--
-- Every tenant query filters on this column and row-level security adds the
-- same predicate again, so an unindexed one is a sequential scan on every
-- request that touches the table.
--
-- One table qualifies, not the eight originally reported. That count came
-- from a query that treated "has no facility column" as "has no index on the
-- facility column", so reference tables with no tenancy at all - the drug
-- catalogue, the medication list - were counted as defects. They are not:
-- a catalogue shared by every facility is meant to be shared.
--
-- CONCURRENTLY is deliberately not used. It cannot run inside a transaction,
-- and at 292 rows the lock is measured in milliseconds. On a table of real
-- size the trade would go the other way.

CREATE INDEX IF NOT EXISTS hospital_history_workspace_id_idx
  ON hospital_history (workspace_id);

COMMENT ON INDEX hospital_history_workspace_id_idx IS
  'Every read of this table is scoped to one facility, by the query and again by row-level security.';
