-- Facility details that belong on printed documents.
--
-- The pharmacy receipt carried a licence number, an address and a telephone
-- number hardcoded into the component, so every facility's receipt claimed
-- "License: PH-2024-001", "Baghdad, Iraq" and one shared phone number. A
-- licence number printed on a pharmacy receipt is a legal assertion, and
-- asserting the same one for every pharmacy is wrong for all but at most one
-- of them, so those lines were removed from the receipt. These columns give
-- them somewhere real to live.
--
-- `workspaces` held only a name, which is why there was nowhere to put them.
--
-- All three are nullable and have no default. No facility has any of this
-- recorded yet, and a receipt that omits a line it has no value for is
-- correct, while one that invents the value is not. Nullable columns with no
-- default are also a catalogue-only change in Postgres - no table rewrite, no
-- lock held while rows are touched.
--
-- No policy changes: `workspaces` is already shared-read with writes scoped to
-- the facility's own row (tenant_update matches workspaceid against
-- app.workspace_id), which is exactly the permission a facility needs to
-- maintain its own details.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS address        text;

COMMENT ON COLUMN workspaces.license_number IS
  'Facility licence number as printed on receipts and dispensing records. Null until recorded.';
COMMENT ON COLUMN workspaces.phone IS
  'Facility contact telephone as printed on receipts. Null until recorded.';
COMMENT ON COLUMN workspaces.address IS
  'Facility street address as printed on receipts. Null until recorded.';
