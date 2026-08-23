-- Answering "which facility owns this record?" without seeing the record.
--
-- A handful of routes are reached with only a record id — a receipt, a shift,
-- a return, a sample — and derive the tenant from the row itself. Under
-- row-level security that is circular: the read needs a tenant, and the tenant
-- comes from the read.
--
-- SECURITY DEFINER breaks the circle. The function runs as its owner, so it
-- can see the row, but it returns a single workspace id and nothing else. The
-- caller learns which facility owns an id it already had, which is exactly
-- what it must know to decide whether the caller may proceed — and no more.
--
-- `kind` is compared against fixed literals rather than used as a table name,
-- so there is no identifier to inject. An unknown kind returns NULL, and a
-- NULL workspace fails the membership check that follows.

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
    ELSE
      RETURN NULL;
  END CASE;

  RETURN owner;
END;
$$;

REVOKE ALL ON FUNCTION public.app_owner_workspace(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_user;
GRANT EXECUTE ON FUNCTION public.app_owner_workspace(text, uuid) TO app_admin;
