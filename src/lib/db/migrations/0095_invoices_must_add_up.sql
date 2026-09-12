-- An invoice must add up.
--
-- Twenty-three of the sixty invoices in Hospital 1 have a total that is not
-- what was paid plus what is owed, so the reported revenue exceeds collected
-- plus outstanding by 1,031,030. That was not bad data arriving from
-- somewhere; the invoice route accepted whatever balance the browser sent,
-- and when it sent none it subtracted from patient responsibility rather than
-- from the total. On an insured invoice those differ by exactly the insurer's
-- share, which is why insured invoices failed at three times the rate of
-- uninsured ones.
--
-- The application no longer computes it that way. This makes the database
-- refuse to store a figure that does not add up, so the next route to get it
-- wrong fails loudly instead of quietly filing another broken row.
--
-- The rule is that the total is what is owed to the facility. Who settles it,
-- patient or insurer, is a separate fact and does not change the arithmetic.
--
-- A negative balance is allowed and means the payer is owed money back. That
-- is deliberate: clamping an overpayment at zero is exactly what left two
-- invoices with more collected than they were for while claiming nothing was
-- outstanding.
--
-- NOT VALID, on purpose. It applies to every insert and update from now on,
-- and tolerates the rows already in this state. Those are repaired separately,
-- with a backup, and this constraint is validated at the end of that work:
--
--   ALTER TABLE invoices VALIDATE CONSTRAINT invoices_balance_adds_up;
--
-- Validating before the repair would fail and leave the table unguarded while
-- the repair is written.

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_balance_adds_up;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_balance_adds_up
  CHECK (
    -- Rounding: these are money columns stored to two decimal places, and a
    -- half-fils discrepancy is arithmetic noise rather than a wrong invoice.
    abs(
      COALESCE(total_amount, 0)
      - COALESCE(amount_paid, 0)
      - COALESCE(balance_due, 0)
    ) < 0.01
  )
  NOT VALID;

COMMENT ON CONSTRAINT invoices_balance_adds_up ON invoices IS
  'total_amount = amount_paid + balance_due. A negative balance_due means the payer is owed a refund. NOT VALID until the rows predating it are repaired.';
