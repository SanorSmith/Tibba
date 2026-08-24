-- Two things row-level security cannot answer for itself.
--
-- 1. THE MEMBERSHIP DEADLOCK
--
-- `isWorkspaceMember` reads `workspaceusers` to decide whether a caller may
-- enter a workspace. That read necessarily happens *before* any tenant is
-- established — it is what establishes it. But `workspaceusers` is itself
-- tenant-scoped, so under the restricted role it returns nothing, every guard
-- answers 403, and the entire application locks itself out the moment the
-- connection string moves off the bypassing role.
--
-- The check has to stand outside the scheme it is guarding. `app_user_role_in`
-- runs as its owner and returns a single role string for one (user, workspace)
-- pair — the caller learns only about a membership it named.
--
-- 2. SHARED GENERAL INFORMATION
--
-- The rule this system is built to: every facility may read a patient's
-- general information, and no facility may read another's orders, results,
-- bills or stock. Tenant isolation as written enforces the second half and
-- breaks the first — a lab cannot see a patient registered at the hospital
-- that referred them, and the lab picker cannot list the labs to route to.
--
-- So for the three tables that carry shared information, reads are open and
-- writes stay scoped: a facility can look up any patient, and can still only
-- change its own records. Clinical data — orders, samples, results, invoices,
-- stock — is untouched by this and remains fully isolated.

CREATE OR REPLACE FUNCTION public.app_user_role_in(p_userid uuid, p_workspaceid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM workspaceusers
  WHERE userid = p_userid AND workspaceid = p_workspaceid
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.app_user_role_in(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_user_role_in(uuid, uuid) TO app_user;
GRANT EXECUTE ON FUNCTION public.app_user_role_in(uuid, uuid) TO app_admin;

-- Shared reads, scoped writes.

-- patients: general information, readable from any facility. Note the write
-- expression keeps the existing allowance for global patients (workspaceid
-- NULL), which is a deliberate state, not an unattributed row.
DROP POLICY IF EXISTS tenant_isolation ON patients;
CREATE POLICY tenant_read_shared ON patients
  FOR SELECT USING (true);
CREATE POLICY tenant_write ON patients
  FOR INSERT WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );
CREATE POLICY tenant_update ON patients
  FOR UPDATE USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR workspaceid IS NULL
  );
CREATE POLICY tenant_delete ON patients
  FOR DELETE USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );

-- workspaces: facilities need to see each other by name to route an order to
-- a lab or a prescription to a pharmacy.
DROP POLICY IF EXISTS tenant_isolation ON workspaces;
CREATE POLICY tenant_read_shared ON workspaces
  FOR SELECT USING (true);
CREATE POLICY tenant_write ON workspaces
  FOR INSERT WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );
CREATE POLICY tenant_update ON workspaces
  FOR UPDATE USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );
CREATE POLICY tenant_delete ON workspaces
  FOR DELETE USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );

-- insurance_companies: reference data. Everyone bills against the same list.
DROP POLICY IF EXISTS tenant_isolation ON insurance_companies;
CREATE POLICY tenant_read_shared ON insurance_companies
  FOR SELECT USING (true);
CREATE POLICY tenant_write ON insurance_companies
  FOR INSERT WITH CHECK (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );
CREATE POLICY tenant_update ON insurance_companies
  FOR UPDATE USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );
CREATE POLICY tenant_delete ON insurance_companies
  FOR DELETE USING (
    workspaceid = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  );
