-- Reprinting a receipt is an audit event, not just a print job: it is how a
-- second copy of a paid receipt gets into circulation. Pharmacy already logs
-- this (pos_receipt_reprints); the lab counter needs the same record so a
-- duplicate can always be traced back to who produced it and when.

CREATE TABLE IF NOT EXISTS lab_receipt_reprints (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL,
  receipt_type  text NOT NULL,          -- PAYMENT | REFUND | SHIFT
  invoice_id    uuid,
  payment_id    uuid,
  shift_id      uuid,
  print_format  text NOT NULL,          -- THERMAL | PDF | BROWSER
  reason        text,
  reprinted_by      uuid,
  reprinted_by_name varchar(200),
  createdat     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_reprints_ws ON lab_receipt_reprints (workspace_id, createdat DESC);
