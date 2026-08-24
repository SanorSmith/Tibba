-- Making Postgres the authority on which facility a composition belongs to.
--
-- EHRbase has no notion of a workspace. The way a test order currently
-- reaches the right lab is that the ordering clinician's choice is written
-- into a free-text Description field as `LabWorkspaceId: <uuid>`, and each
-- lab fetches *every composition in the instance* and then discards, in
-- JavaScript, the ones whose regex did not match.
--
-- Two things are wrong with that. The separation exists only in application
-- code, so a bug in the filter, or anything else holding the EHRbase
-- credentials, sees every facility's clinical data. And a tenant identity
-- parsed out of prose is not an identity — change the wording of that field
-- and the routing silently stops working.
--
-- This table records ownership where it can be enforced rather than merely
-- observed. A composition is registered to a facility when it is created;
-- reads ask Postgres which ids belong to the caller and then fetch only
-- those. Row-level security applies to this table like any other, so the
-- question "which compositions are mine" is answered by the database.
--
-- It does not encrypt or move the clinical data — EHRbase still holds that,
-- and anyone with its credentials can still read it. What it fixes is the
-- application handing out the wrong rows, which is the part in reach.

CREATE TABLE IF NOT EXISTS composition_ownership (
  composition_uid text PRIMARY KEY,
  workspaceid uuid NOT NULL REFERENCES workspaces(workspaceid) ON DELETE CASCADE,
  -- Who it was routed to, when that differs from who created it: a test
  -- order is written by a hospital and belongs to the lab it names.
  ownerworkspaceid uuid REFERENCES workspaces(workspaceid) ON DELETE SET NULL,
  ehrid text,
  patientid uuid,
  kind text NOT NULL DEFAULT 'composition',
  createdat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS composition_ownership_workspace_idx
  ON composition_ownership (workspaceid);
CREATE INDEX IF NOT EXISTS composition_ownership_owner_idx
  ON composition_ownership (ownerworkspaceid);
CREATE INDEX IF NOT EXISTS composition_ownership_ehr_idx
  ON composition_ownership (ehrid);

ALTER TABLE composition_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE composition_ownership FORCE ROW LEVEL SECURITY;

-- Visible to the facility that created it and to the facility it was routed
-- to, and to nobody else. This is what makes "a lab sees the orders directed
-- to it, and no others" a property of the database rather than of a regex.
DROP POLICY IF EXISTS tenant_isolation ON composition_ownership;
CREATE POLICY tenant_isolation ON composition_ownership
  USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR ownerworkspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  )
  WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON composition_ownership TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON composition_ownership TO app_admin;
