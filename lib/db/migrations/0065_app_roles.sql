-- Phase 02: separate the role the application connects as from the role that
-- owns the schema.
--
-- neondb_owner has BYPASSRLS, so while the app connects as it, every policy is
-- ignored — protection that reads as active while being off. It keeps
-- ownership and runs migrations; the application moves to app_user.
--
--   app_user   no BYPASSRLS, no ownership, DML only. Row-level security
--              applies. This is what the app connects as.
--   app_admin  retains BYPASSRLS. For the admin routes that read across
--              facilities by design, and the login flow, which must read
--              `users` before any tenant is known.
--
-- Passwords are generated per environment and are not recorded here.
-- Applied to production on 2026-08-22.

-- CREATE ROLE app_user  WITH LOGIN PASSWORD '<generated>' NOBYPASSRLS;
-- CREATE ROLE app_admin WITH LOGIN PASSWORD '<generated>' BYPASSRLS;

GRANT USAGE ON SCHEMA public TO app_user, app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user, app_admin;

-- so tables added by later migrations are reachable without a manual grant
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, app_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user, app_admin;
