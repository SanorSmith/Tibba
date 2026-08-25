-- Giving Tibbna back the labs table it lost.
--
-- Migration 0007 created `labs` as a per-facility table: a workspace's own
-- laboratories, with a `workspaceid` and a foreign key to `workspaces`.
--
-- At some point the patient marketplace's schema was run against this same
-- database, and its `labs` — a public directory with ratings, coordinates,
-- opening hours and home-collection fees — took the name. Tibbna's version
-- is gone, and every query against `labs.workspaceid` has failed since:
-- `/api/d/[workspaceid]/labs` and `/api/lims/laboratories` both 500.
--
-- The marketplace table is deliberately left alone. Something may still read
-- it, and renaming a table out from under an app is how this happened in the
-- first place. Tibbna gets a differently-named table instead, and its schema
-- points there.
--
-- It starts empty. The original rows went with the original table, and
-- inventing replacements would be worse than an honest zero.

CREATE TABLE IF NOT EXISTS facility_labs (
  labid       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspaceid uuid NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  email       text,
  address     text,
  createdat   timestamp NOT NULL DEFAULT now(),
  updatedat   timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS facility_labs_workspace_idx ON facility_labs (workspaceid);

-- Tenant-scoped like everything else that carries a facility.
ALTER TABLE facility_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_labs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON facility_labs;
CREATE POLICY tenant_isolation ON facility_labs
  USING (workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON facility_labs TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON facility_labs TO app_admin;
