-- =============================================================================
-- 005  One staff record per person, per facility
-- =============================================================================
--
-- Nothing stopped the same person being registered twice. Sanor Smith had two
-- records in Hospital 1, created eight days apart, and they had drifted into
-- complementary halves: one carried the employment file, the other the
-- attendance history and most of the appointments. Neither was wrong; both
-- were incomplete, and no screen showed that the other existed.
--
-- The route already believed this was handled - it catches "unique constraint"
-- on insert and answers "Staff member with this email already exists". There
-- was no such constraint, so that branch had never once run.
--
-- Scoped per facility rather than globally, because working at two hospitals
-- is a normal thing to do and each employment is its own record. What is not
-- normal is the same person twice in one of them.
--
-- Case- and whitespace-insensitive: " Sanor@X.com " and "sanor@x.com" are the
-- same address to everyone except a plain unique index.

BEGIN;

-- Blank and NULL are excluded rather than compared. A facility with three
-- staff who have no email yet is ordinary; a unique index that treated '' as
-- a value would refuse the second one.
CREATE UNIQUE INDEX IF NOT EXISTS staff_one_email_per_facility
  ON staff (workspaceid, lower(trim(email)))
  WHERE email IS NOT NULL AND trim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS national_id_one_per_facility
  ON national_id (workspaceid, lower(trim(national_id)))
  WHERE national_id IS NOT NULL AND trim(national_id) <> '';

COMMIT;
