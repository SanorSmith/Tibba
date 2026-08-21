-- Lab procurement: purchase orders and goods receipt for reagents and
-- consumables. Mirrors the pharmacy_* procurement tables so receiving behaves
-- the same on both sides, with its own tables scoped by workspace_id.

DO $$ BEGIN
  CREATE TYPE lab_po_status AS ENUM ('PENDING','PARTIALLY_DELIVERED','DELIVERED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lab_grn_status AS ENUM ('PENDING','PARTIAL','COMPLETE','CORRECTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS lab_purchase_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL,
  order_number   varchar(50) NOT NULL,
  ordered_by     varchar(120) NOT NULL,
  order_date     timestamptz DEFAULT now(),
  expected_date  timestamptz,
  supplier_id    uuid,
  supplier_name  varchar(200),
  supplier_email varchar(200),
  supplier_phone varchar(50),
  status         lab_po_status DEFAULT 'PENDING',
  notes          text,
  total_amount   numeric(12,2) DEFAULT 0,
  is_edited      boolean DEFAULT false,
  cancel_reason  text,
  createdat      timestamptz DEFAULT now(),
  updatedat      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_purchase_order_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES lab_purchase_orders(id) ON DELETE CASCADE,
  item_id     uuid,
  item_name   varchar(200),
  uom         varchar(50),
  ordered_qty integer NOT NULL DEFAULT 0,
  unit_cost   numeric(10,2),
  total_cost  numeric(12,2),
  notes       text,
  createdat   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_goods_receipt (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid NOT NULL,
  receipt_number       varchar(50) NOT NULL,
  order_id             uuid REFERENCES lab_purchase_orders(id),
  order_number         varchar(50),
  delivery_note_number varchar(100),
  received_by          varchar(120) NOT NULL,
  receipt_date         timestamptz DEFAULT now(),
  supplier_name        varchar(200),
  supplier_email       varchar(200),
  status               lab_grn_status DEFAULT 'PENDING',
  notes                text,
  is_reversal          boolean DEFAULT false,
  correction_of        uuid,
  correction_reason    text,
  corrected_by         varchar(120),
  correction_type      varchar(20),
  createdat            timestamptz DEFAULT now(),
  updatedat            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_goods_receipt_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id             uuid NOT NULL REFERENCES lab_goods_receipt(id) ON DELETE CASCADE,
  item_id                uuid,
  item_name              varchar(200),
  uom                    varchar(50),
  ordered_qty            integer DEFAULT 0,
  received_qty           integer NOT NULL DEFAULT 0,
  return_claim           integer DEFAULT 0,
  dn_reg_num             varchar(100),
  unit_cost              numeric(10,2),
  batch_number           varchar(100),
  lot_number             varchar(100),
  expiry_date            timestamptz,
  manufacture_date       timestamptz,
  notes                  text,
  correction_of_item_id  uuid,
  createdat              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_claim_damage (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES lab_goods_receipt(id) ON DELETE CASCADE,
  item_id    uuid,
  item_name  varchar(200),
  quantity   integer DEFAULT 0,
  note       varchar(200),
  createdat  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_po_workspace_idx ON lab_purchase_orders (workspace_id);
CREATE INDEX IF NOT EXISTS lab_po_items_order_idx ON lab_purchase_order_items (order_id);
CREATE INDEX IF NOT EXISTS lab_grn_workspace_idx ON lab_goods_receipt (workspace_id);
CREATE INDEX IF NOT EXISTS lab_grn_items_receipt_idx ON lab_goods_receipt_items (receipt_id);
