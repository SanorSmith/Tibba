-- Let a leave request be approved.
--
-- It cannot be, today, by anyone. An AFTER INSERT OR UPDATE trigger on
-- leave_requests writes the approved days into leave_balance, and the insert
-- names five columns without naming the facility. leave_balance.workspaceid is
-- NOT NULL, so the statement is refused.
--
-- The ON CONFLICT clause does not save it. Postgres checks NOT NULL in
-- ExecConstraints before it consults the conflict arbiter, so the insert fails
-- even when the balance row it wants to update is already sitting there. This
-- was reproduced against a balance row confirmed present: the failure is
-- unconditional, not an edge case.
--
-- The effect on the product is that the leave module can raise a request and
-- refuse one but cannot grant one. Nothing in the interface explains why,
-- because the error surfaces as a failed write rather than a rule.
--
-- Two things made this hard to find. The trigger appears in no migration in
-- either repository - it was created directly against the database, so reading
-- the code tells you nothing about it. And leave_balance is populated from the
-- HR screens as well, so the table is full of rows that look like proof the
-- path works.
--
-- The facility comes from the request. leave_requests.workspaceid is itself
-- NOT NULL, so there is always one to carry across, and it is by definition
-- the right one: a balance belongs to the same facility as the request that
-- moved it.
--
-- Checked before writing this: of the 16 trigger functions in this database,
-- this is the only one that writes to a facility-scoped table without naming
-- the facility. The other 15 are correct.

CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only when a request becomes approved, and only once.
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN

    INSERT INTO leave_balance (
      workspaceid,
      employee_id,
      leave_type_id,
      year,
      used,
      last_used_date
    )
    VALUES (
      NEW.workspaceid,
      NEW.employee_id,
      NEW.leave_type_id,
      EXTRACT(YEAR FROM NEW.start_date),
      NEW.working_days_count,
      NEW.start_date
    )
    -- The unique index behind this is (employee_id, leave_type_id, year). It
    -- does not include the facility, and it should not: an employee belongs to
    -- one facility, so the triple is already unique.
    ON CONFLICT (employee_id, leave_type_id, year)
    DO UPDATE SET
      used           = leave_balance.used + NEW.working_days_count,
      last_used_date = NEW.start_date,
      updated_at     = NOW();

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_leave_balance_on_approval() IS
  'Moves approved days onto the leave balance. Carries the facility from the request; leave_balance.workspaceid is NOT NULL and omitting it made every approval fail. See migrations/006.';
