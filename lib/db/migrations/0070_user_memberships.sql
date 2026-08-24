-- Listing the facilities a user belongs to, without being in one yet.
--
-- The same deadlock as `app_user_role_in` (migration 0068), one layer up.
-- `getUserWorkspaces` is how 124 files decide whether to render a page or
-- redirect, and it reads `workspaceusers` before any tenant is established —
-- because choosing the facility is exactly what it is for. Tenant-scoped,
-- that read returns nothing under the restricted role, so every page in the
-- application would bounce the user back to the picker, and the picker would
-- be empty.
--
-- Returns memberships only: a workspace id and the caller's role in it, for
-- one named user. The workspace rows themselves are read normally afterwards,
-- since migration 0068 opened SELECT on `workspaces`.

CREATE OR REPLACE FUNCTION public.app_user_memberships(p_userid uuid)
RETURNS TABLE (workspaceid uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT wu.workspaceid, wu.role
  FROM workspaceusers wu
  WHERE wu.userid = p_userid;
$$;

REVOKE ALL ON FUNCTION public.app_user_memberships(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_user_memberships(uuid) TO app_user;
GRANT EXECUTE ON FUNCTION public.app_user_memberships(uuid) TO app_admin;
