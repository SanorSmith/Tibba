-- A place on a user's own profile for preferences that are neither theme nor
-- language. First occupant: the pharmacy a doctor usually sends prescriptions
-- to, kept per prescribing facility --
--
--   {"defaultDispensingPharmacy": {"<facility>": "<pharmacy>"}}
--
-- so the "Send to" picker opens on their usual choice instead of empty.
--
-- Additive and defaulted, so every existing row reads as "no preferences" and
-- nothing that queries users has to change. `users` carries no row-level
-- policy: it is global, and a user's own row is reached by userid.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
