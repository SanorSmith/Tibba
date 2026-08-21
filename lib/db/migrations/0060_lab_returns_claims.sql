-- Sending stock back to a supplier, and claiming for what arrived unusable.
--
-- lab_claim_damage (migration 0058) records damage found *during* a delivery,
-- against the receipt. This adds the two things that happen afterwards:
-- returning stock to the vendor, and tracking a claim through to settlement.

DO $$ BEGIN
  CREATE TYPE lab_return_status AS ENUM ('DRAFT','SENT','ACCEPTED','REJECTED','CREDITED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lab_claim_status AS ENUM ('OPEN','SUBMITTED','APPROVED','REJECTED','SETTLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS lab_vendor_returns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL,
  return_number  varchar(50) NOT NULL,
  vendor_id      uuid,
  vendor_name    varchar(200),
  receipt_id     uuid,
  warehouse_id   uuid,
  status         lab_return_status DEFAULT 'DRAFT',
  reason         text,
  total_value    numeric(12,2) DEFAULT 0,
  returned_by    uuid,
  returned_by_name varchar(200),
  notes          text,
  createdat      timestamptz DEFAULT now(),
  updatedat      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_vendor_return_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id   uuid NOT NULL REFERENCES lab_vendor_returns(id) ON DELETE CASCADE,
  item_id     uuid,
  item_name   varchar(200),
  batch_id    uuid,
  batch_number varchar(100),
  quantity    integer NOT NULL DEFAULT 0,
  unit_cost   numeric(10,2),
  reason      text,
  createdat   timestamptz DEFAULT now()
);

-- A claim is the commercial side of damaged goods: what we asked the vendor
-- for and what we actually got back. Kept separate from lab_claim_damage so
-- the physical record of what arrived broken is never rewritten by
-- negotiation over it.
CREATE TABLE IF NOT EXISTS lab_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL,
  claim_number  varchar(50) NOT NULL,
  vendor_id     uuid,
  vendor_name   varchar(200),
  receipt_id    uuid,
  status        lab_claim_status DEFAULT 'OPEN',
  claim_amount  numeric(12,2) DEFAULT 0,
  settled_amount numeric(12,2),
  reason        text,
  resolution    text,
  raised_by     uuid,
  raised_by_name varchar(200),
  createdat     timestamptz DEFAULT now(),
  updatedat     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_vendor_returns_ws_idx ON lab_vendor_returns (workspace_id);
CREATE INDEX IF NOT EXISTS lab_vendor_return_items_ret_idx ON lab_vendor_return_items (return_id);
CREATE INDEX IF NOT EXISTS lab_claims_ws_idx ON lab_claims (workspace_id);
