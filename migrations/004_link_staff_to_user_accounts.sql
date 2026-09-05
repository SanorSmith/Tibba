-- =============================================================================
-- 004  Link an ERP staff record to the platform user account it belongs to
-- =============================================================================
--
-- Both applications run on one database, and a facility is one `workspaces`
-- row shared by both. A person, however, was recorded twice with no link
-- between the halves:
--
--   users / workspaceusers   who you are, which facility, and what you may open
--   staff                    the employment record this ERP keeps
--
-- Nothing joined them. `staff` carried only `staffid` and `email`, so the ERP
-- could not tell which login a staff member uses, and the EHR could not tell
-- which staff record a signed-in doctor is.
--
-- That is why a receptionist's appointment never reached the doctor. The
-- booking form lists staff and sends `staff.staffid`; the doctor's dashboard
-- asks for `appointments.doctorid = users.userid`. Two different UUIDs for one
-- person, in a column with no foreign key to catch it: 12 of the 21
-- appointments on record hold a userid and 9 hold a staffid.
--
-- After this migration `doctorid` means a user account and nothing else, and
-- `staff_id` means the employment record. Both are constrained.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The link itself
-- ---------------------------------------------------------------------------
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS userid uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_userid_users_fk'
  ) THEN
    ALTER TABLE staff
      ADD CONSTRAINT staff_userid_users_fk
      FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS staff_userid_idx ON staff (userid);

-- ---------------------------------------------------------------------------
-- 2. A staff record may only be linked to a user who belongs to its facility
-- ---------------------------------------------------------------------------
--
-- This is the isolation rule stated as a constraint rather than as a habit.
-- Without it, an ERP administrator could attach one facility's employment
-- record to another facility's login and read across the boundary that
-- row-level security exists to hold.
--
-- SECURITY DEFINER because the check reads `workspaceusers`, which is itself
-- tenant-scoped: the question "is this person a member here" has to be
-- answerable while acting for the facility being written to.
CREATE OR REPLACE FUNCTION staff_userid_must_be_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.userid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM workspaceusers wu
     WHERE wu.userid = NEW.userid
       AND wu.workspaceid = NEW.workspaceid
  ) THEN
    RAISE EXCEPTION
      'User % is not a member of facility % and cannot be linked to a staff record there',
      NEW.userid, NEW.workspaceid
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS staff_userid_membership ON staff;
CREATE TRIGGER staff_userid_membership
  BEFORE INSERT OR UPDATE OF userid, workspaceid ON staff
  FOR EACH ROW EXECUTE FUNCTION staff_userid_must_be_member();

-- ---------------------------------------------------------------------------
-- 3. Backfill what can be established without guessing
-- ---------------------------------------------------------------------------
--
-- Email is the only field the two records share, so it is the only evidence
-- available. Two conditions, both required:
--
--   * exactly one user holds that address - several staff rows share
--     addresses like usertest@gmail.com, and a link that might be either
--     person is worse than none;
--   * that user is a member of the same facility - three rows match an
--     address belonging to someone who does not work there, and linking
--     those is precisely what the trigger above forbids.
--
-- 5 of 56 staff rows qualify. The remaining 51 have no platform account, or
-- an account at another facility, and stay unlinked until someone connects
-- them by hand. They are not broken, they simply have no login yet.
UPDATE staff s
   SET userid = u.userid
  FROM users u
 WHERE s.userid IS NULL
   AND s.email IS NOT NULL
   AND lower(trim(u.email)) = lower(trim(s.email))
   AND (SELECT count(*) FROM users u2
         WHERE lower(trim(u2.email)) = lower(trim(s.email))) = 1
   AND EXISTS (SELECT 1 FROM workspaceusers wu
                WHERE wu.userid = u.userid
                  AND wu.workspaceid = s.workspaceid);

-- ---------------------------------------------------------------------------
-- 4. Repair the appointments that hold a staffid where a userid belongs
-- ---------------------------------------------------------------------------

-- Keep the fact first: whoever the booking names, record them as the staff
-- member. This is the half that was always true and was being overwritten.
UPDATE appointments a
   SET staff_id = a.doctorid
  FROM staff s
 WHERE a.staff_id IS NULL
   AND s.staffid = a.doctorid;

-- An appointment can legitimately have no doctor *user*: booked with a staff
-- member who has no login. Nothing to point at, and pretending otherwise is
-- what produced this mess.
ALTER TABLE appointments ALTER COLUMN doctorid DROP NOT NULL;

-- Where the staff member does have an account, that account is the doctor.
UPDATE appointments a
   SET doctorid = s.userid
  FROM staff s
 WHERE s.staffid = a.doctorid
   AND s.userid IS NOT NULL;

-- Where they do not, say so rather than leaving a staffid masquerading as a
-- user id. `staff_id` above still records who the appointment is with.
UPDATE appointments a
   SET doctorid = NULL
 WHERE a.doctorid IS NOT NULL
   AND EXISTS (SELECT 1 FROM staff s WHERE s.staffid = a.doctorid);

-- ---------------------------------------------------------------------------
-- 5. Make the next mismatch fail loudly
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_doctorid_users_fk'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_doctorid_users_fk
      FOREIGN KEY (doctorid) REFERENCES users(userid) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_staff_id_staff_fk'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_staff_id_staff_fk
      FOREIGN KEY (staff_id) REFERENCES staff(staffid) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS appointments_doctorid_idx ON appointments (doctorid);

COMMIT;
