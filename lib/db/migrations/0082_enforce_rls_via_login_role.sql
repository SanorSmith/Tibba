-- Turn row-level security on, from inside the database.
--
-- Everything else has been in place for days: 242 tables with policies, 251
-- policies, every route establishing a facility. None of it did anything,
-- because the application connects as `neondb_owner` and that role holds
-- BYPASSRLS — it ignores every policy by definition.
--
-- The obvious fix is `ALTER ROLE neondb_owner NOBYPASSRLS`. It is not
-- available: changing BYPASSRLS needs superuser, and Neon grants superuser to
-- nobody, including the account owner. Tried, refused, in the console too.
--
-- The other obvious fix is to point DATABASE_URL at `app_user` in Vercel.
-- That was done, twice, and the application went on connecting as the owner —
-- confirmed from pg_stat_activity, three minutes of live traffic, peak 31
-- connections, not one of them app_user.
--
-- So instead: make `neondb_owner` *become* `app_user` on login. It is already
-- a member, with ADMIN OPTION, so it can grant itself the right to SET ROLE —
-- and a role may always alter its own settings. `current_user` becomes
-- `app_user`, which has no BYPASSRLS, so the policies apply. No superuser, no
-- environment variable, no deploy.
--
-- Rollback, which needs no more privilege than this did:
--
--   ALTER ROLE neondb_owner RESET role;
--
-- Takes effect on the next connection, so enforcement fades in as pooled
-- connections are recycled rather than switching at once.
--
-- Note what this also does: migrations and scripts connecting as
-- `neondb_owner` now run as `app_user` too, which cannot create tables. Reset
-- the setting before running DDL, or connect as `app_admin`, which keeps
-- BYPASSRLS for exactly this.

GRANT app_user TO neondb_owner WITH SET TRUE;

ALTER ROLE neondb_owner SET role = 'app_user';
