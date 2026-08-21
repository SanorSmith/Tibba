-- Lab POS: taking money for lab invoices, and accounting for it.
--
-- Payments attach to the existing `invoices` rows the Billing tab creates,
-- rather than duplicating them into a parallel sale record — one invoice is
-- the single source of what was owed, and payments are what came in against
-- it. Pharmacy keeps its own pos_sales stack because it sells stock directly;
-- the lab bills orders, so the invoice already exists by the time money moves.

DO $$ BEGIN
  CREATE TYPE lab_payment_method AS ENUM ('CASH','CARD','INSURANCE','TRANSFER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lab_shift_status AS ENUM ('OPEN','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A cashier's session. Money taken is attributed to whichever shift was open,
-- so the drawer can be reconciled at the end of it.
CREATE TABLE IF NOT EXISTS lab_shifts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL,
  shift_number   varchar(50) NOT NULL,
  cashier_id     uuid,
  cashier_name   varchar(200),
  status         lab_shift_status DEFAULT 'OPEN',
  opening_time   timestamptz DEFAULT now(),
  closing_time   timestamptz,
  opening_cash   numeric(12,2) DEFAULT 0,
  -- Filled at close: what the system thinks is in the drawer vs what was
  -- counted. Variance is kept rather than corrected so discrepancies stay
  -- visible.
  expected_cash  numeric(12,2),
  actual_cash    numeric(12,2),
  variance       numeric(12,2),
  variance_reason text,
  notes          text,
  createdat      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL,
  invoice_id        uuid NOT NULL,
  shift_id          uuid REFERENCES lab_shifts(id),
  amount            numeric(12,2) NOT NULL,
  method            lab_payment_method NOT NULL,
  -- Card / transfer detail, kept for reconciliation against the bank.
  card_last4        varchar(4),
  reference         varchar(120),
  -- Insurance detail: what the insurer covers vs what the patient pays.
  insurance_company varchar(200),
  insurance_covered numeric(12,2),
  patient_copay     numeric(12,2),
  -- Refunds are recorded as negative payments against the same invoice so the
  -- money trail stays in one place and totals stay honest.
  is_refund         boolean DEFAULT false,
  refund_of         uuid,
  refund_reason     text,
  received_by       uuid,
  received_by_name  varchar(200),
  notes             text,
  createdat         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_shifts_workspace_idx ON lab_shifts (workspace_id);
CREATE INDEX IF NOT EXISTS lab_shifts_status_idx ON lab_shifts (workspace_id, status);
CREATE INDEX IF NOT EXISTS lab_payments_workspace_idx ON lab_payments (workspace_id);
CREATE INDEX IF NOT EXISTS lab_payments_invoice_idx ON lab_payments (invoice_id);
CREATE INDEX IF NOT EXISTS lab_payments_shift_idx ON lab_payments (shift_id);
