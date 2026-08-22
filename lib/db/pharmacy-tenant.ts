/**
 * Pharmacy Schema-per-Tenant
 *
 * Each pharmacy workspace gets its own Postgres schema:
 *   schema name = "pharmacy_<workspaceid without dashes>"
 *
 * This module provides:
 *   1. provisionPharmacySchema(workspaceid) – creates the schema + all tables
 *   2. withPharmacySchema(workspaceid, fn) – executes a callback within the tenant schema
 *   3. getPharmacySchemaName(workspaceid) – returns the schema name for a workspace
 *   4. dropPharmacySchema(workspaceid) – tears down (for cleanup)
 */
import postgres from "postgres";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a safe schema name from a workspace UUID */
export function getPharmacySchemaName(workspaceid: string): string {
  return `pharmacy_${workspaceid.replace(/-/g, "")}`;
}

// ─── DDL for tenant schema ────────────────────────────────────────────────────

function getPharmacyDDL(schemaName: string): string {
  return `
-- Create schema
CREATE SCHEMA IF NOT EXISTS "${schemaName}";

-- Pharmacy profile
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacies (
  pharmacyid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  namear text,
  nameku text,
  address text,
  city text,
  phone text,
  email text,
  latitude numeric,
  longitude numeric,
  openinghours jsonb,
  deliveryfee numeric DEFAULT 0,
  minorderamount numeric DEFAULT 0,
  avgdeliverytimeminutes integer DEFAULT 30,
  rating numeric DEFAULT 0,
  totalreviews integer DEFAULT 0,
  isactive boolean DEFAULT true,
  logourl text,
  createdat timestamptz DEFAULT now() NOT NULL,
  updatedat timestamptz DEFAULT now() NOT NULL
);

-- Drug catalog (workspace-specific)
CREATE TABLE IF NOT EXISTS "${schemaName}".drugs (
  drugid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  globaldrugid uuid,
  itemid uuid,
  name text NOT NULL,
  genericname text,
  atccode text,
  form text NOT NULL,
  strength text NOT NULL,
  unit text NOT NULL DEFAULT 'tablet',
  barcode text,
  manufacturer text,
  nationalcode text,
  category text,
  route text,
  interaction text,
  warning text,
  pregnancy text,
  sideeffect text,
  storagetype text,
  indication text,
  traffic text,
  notes text,
  insuranceapproved boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  requiresprescription boolean NOT NULL DEFAULT true,
  isactive boolean NOT NULL DEFAULT true,
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drugs_barcode_idx ON "${schemaName}".drugs(barcode);
CREATE INDEX IF NOT EXISTS drugs_atc_idx ON "${schemaName}".drugs(atccode);
CREATE INDEX IF NOT EXISTS drugs_global_drug_idx ON "${schemaName}".drugs(globaldrugid);

-- Drug batches
CREATE TABLE IF NOT EXISTS "${schemaName}".drug_batches (
  batchid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugid uuid NOT NULL REFERENCES "${schemaName}".drugs(drugid) ON DELETE CASCADE,
  lotnumber text NOT NULL,
  expirydate date NOT NULL,
  purchaseprice numeric(12,2),
  sellingprice numeric(12,2),
  barcode text,
  createdat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drug_batches_drug_idx ON "${schemaName}".drug_batches(drugid);
CREATE INDEX IF NOT EXISTS drug_batches_expiry_idx ON "${schemaName}".drug_batches(expirydate);

-- Stock locations
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_stock_locations (
  locationid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'shelf',
  description text,
  createdat timestamptz NOT NULL DEFAULT now()
);

-- Stock levels
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_stock_levels (
  stocklevelid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugid uuid NOT NULL REFERENCES "${schemaName}".drugs(drugid) ON DELETE CASCADE,
  batchid uuid REFERENCES "${schemaName}".drug_batches(batchid) ON DELETE SET NULL,
  locationid uuid NOT NULL REFERENCES "${schemaName}".pharmacy_stock_locations(locationid) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  reservedquantity integer NOT NULL DEFAULT 0,
  updatedat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_stock_levels_drug_idx ON "${schemaName}".pharmacy_stock_levels(drugid);
CREATE INDEX IF NOT EXISTS pharmacy_stock_levels_loc_idx ON "${schemaName}".pharmacy_stock_levels(locationid);

-- Stock movements
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_stock_movements (
  movementid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drugid uuid NOT NULL REFERENCES "${schemaName}".drugs(drugid) ON DELETE CASCADE,
  batchid uuid REFERENCES "${schemaName}".drug_batches(batchid) ON DELETE SET NULL,
  locationid uuid NOT NULL REFERENCES "${schemaName}".pharmacy_stock_locations(locationid) ON DELETE CASCADE,
  type text NOT NULL,
  quantity integer NOT NULL,
  reason text,
  referenceid text,
  performedby uuid,
  createdat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_stock_movements_drug_idx ON "${schemaName}".pharmacy_stock_movements(drugid);
CREATE INDEX IF NOT EXISTS pharmacy_stock_movements_type_idx ON "${schemaName}".pharmacy_stock_movements(type);

-- Insurance companies
CREATE TABLE IF NOT EXISTS "${schemaName}".insurance_companies (
  insuranceid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  company_name varchar(255) NOT NULL,
  company_code varchar(20),
  contact_phone varchar(50),
  contact_email varchar(255),
  address text,
  coverage_percentage numeric(5,2) DEFAULT 80.00,
  active boolean DEFAULT true,
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- Patient insurance links (patientid references public.patients)
CREATE TABLE IF NOT EXISTS "${schemaName}".patient_insurance (
  patientinsuranceid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patientid uuid NOT NULL,
  insuranceid uuid NOT NULL REFERENCES "${schemaName}".insurance_companies(insuranceid) ON DELETE CASCADE,
  policynumber text NOT NULL,
  groupnumber text,
  startdate date,
  enddate date,
  isprimary boolean NOT NULL DEFAULT true,
  isactive boolean NOT NULL DEFAULT true,
  createdat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_insurance_patient_idx ON "${schemaName}".patient_insurance(patientid);

-- Pharmacy orders
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_orders (
  orderid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patientid uuid,
  prescriberid uuid,
  prescribername text,
  status text NOT NULL DEFAULT 'PENDING',
  source text NOT NULL DEFAULT 'manual',
  openehrorderid text,
  dispensecompositionuid text,
  priority text NOT NULL DEFAULT 'routine',
  notes text,
  metadata jsonb DEFAULT '{}',
  dispensedby uuid,
  dispensedat timestamptz,
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_orders_patient_idx ON "${schemaName}".pharmacy_orders(patientid);
CREATE INDEX IF NOT EXISTS pharmacy_orders_status_idx ON "${schemaName}".pharmacy_orders(status);
CREATE INDEX IF NOT EXISTS pharmacy_orders_openehr_idx ON "${schemaName}".pharmacy_orders(openehrorderid);

-- Order items
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_order_items (
  itemid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orderid uuid NOT NULL REFERENCES "${schemaName}".pharmacy_orders(orderid) ON DELETE CASCADE,
  drugid uuid REFERENCES "${schemaName}".drugs(drugid) ON DELETE SET NULL,
  batchid uuid REFERENCES "${schemaName}".drug_batches(batchid) ON DELETE SET NULL,
  dispenselocationid uuid REFERENCES "${schemaName}".pharmacy_stock_locations(locationid) ON DELETE SET NULL,
  drugname text NOT NULL,
  dosage text,
  quantity integer NOT NULL DEFAULT 1,
  quantitydispensed integer DEFAULT 0,
  unitprice numeric(12,2),
  status text NOT NULL DEFAULT 'PENDING',
  scannedbarcode text,
  scannedat timestamptz,
  notes text,
  createdat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_order_items_order_idx ON "${schemaName}".pharmacy_order_items(orderid);
CREATE INDEX IF NOT EXISTS pharmacy_order_items_drug_idx ON "${schemaName}".pharmacy_order_items(drugid);

-- Invoices
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_invoices (
  invoiceid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orderid uuid NOT NULL REFERENCES "${schemaName}".pharmacy_orders(orderid) ON DELETE CASCADE,
  patientid uuid,
  insuranceid uuid REFERENCES "${schemaName}".insurance_companies(insuranceid) ON DELETE SET NULL,
  invoicenumber text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  insurancecovered numeric(12,2) NOT NULL DEFAULT 0,
  patientcopay numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_invoices_order_idx ON "${schemaName}".pharmacy_invoices(orderid);
CREATE INDEX IF NOT EXISTS pharmacy_invoices_patient_idx ON "${schemaName}".pharmacy_invoices(patientid);

-- Invoice lines
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_invoice_lines (
  lineid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoiceid uuid NOT NULL REFERENCES "${schemaName}".pharmacy_invoices(invoiceid) ON DELETE CASCADE,
  drugid uuid REFERENCES "${schemaName}".drugs(drugid) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unitprice numeric(12,2) NOT NULL,
  linetotal numeric(12,2) NOT NULL,
  insurancecovered numeric(12,2) NOT NULL DEFAULT 0,
  patientpays numeric(12,2) NOT NULL DEFAULT 0,
  createdat timestamptz NOT NULL DEFAULT now()
);

-- Substitutions
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_substitutions (
  substitutionid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orderitemid uuid NOT NULL REFERENCES "${schemaName}".pharmacy_order_items(itemid) ON DELETE CASCADE,
  originaldrugid uuid REFERENCES "${schemaName}".drugs(drugid) ON DELETE SET NULL,
  newdrugid uuid NOT NULL REFERENCES "${schemaName}".drugs(drugid) ON DELETE CASCADE,
  reason text NOT NULL,
  approvedby uuid,
  createdat timestamptz NOT NULL DEFAULT now()
);

-- Procurement: Purchase Orders
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(50) NOT NULL,
  ordered_by varchar(120) NOT NULL,
  order_date timestamptz DEFAULT now(),
  expected_date timestamptz,
  supplier_id uuid,
  supplier_name varchar(200),
  supplier_email varchar(200),
  supplier_phone varchar(50),
  status text DEFAULT 'PENDING',
  notes text,
  total_amount numeric(12,2) DEFAULT 0,
  is_edited boolean DEFAULT false,
  cancel_reason text,
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- Procurement: PO Items
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES "${schemaName}".pharmacy_purchase_orders(id) ON DELETE CASCADE,
  item_id uuid,
  item_name varchar(200),
  uom varchar(50),
  ordered_qty integer NOT NULL DEFAULT 0,
  unit_cost numeric(10,2),
  total_cost numeric(12,2),
  notes text,
  createdat timestamptz DEFAULT now()
);

-- Procurement: Goods Receipt
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_goods_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number varchar(50) NOT NULL,
  order_id uuid REFERENCES "${schemaName}".pharmacy_purchase_orders(id),
  order_number varchar(50),
  delivery_note_number varchar(100),
  received_by varchar(120) NOT NULL,
  receipt_date timestamptz DEFAULT now(),
  supplier_name varchar(200),
  supplier_email varchar(200),
  status text DEFAULT 'PENDING',
  notes text,
  is_reversal boolean DEFAULT false,
  correction_of uuid,
  correction_reason text,
  corrected_by varchar(120),
  correction_type varchar(20),
  createdat timestamptz DEFAULT now(),
  updatedat timestamptz DEFAULT now()
);

-- Procurement: GRN Items
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_goods_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES "${schemaName}".pharmacy_goods_receipt(id) ON DELETE CASCADE,
  item_id uuid,
  item_name varchar(200),
  uom varchar(50),
  ordered_qty integer DEFAULT 0,
  received_qty integer NOT NULL DEFAULT 0,
  delivered_total integer,
  return_claim integer DEFAULT 0,
  dn_reg_num varchar(100),
  unit_cost numeric(10,2),
  batch_number varchar(100),
  lot_number varchar(100),
  expiry_date timestamptz,
  manufacture_date timestamptz,
  notes text,
  correction_of_item_id uuid,
  createdat timestamptz DEFAULT now()
);

-- Procurement: Claim Damage
CREATE TABLE IF NOT EXISTS "${schemaName}".pharmacy_claim_damage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES "${schemaName}".pharmacy_goods_receipt(id) ON DELETE CASCADE,
  item_id uuid,
  item_name varchar(200),
  quantity integer DEFAULT 0,
  note varchar(200),
  createdat timestamptz DEFAULT now()
);

-- POS: Shifts
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_shifts (
  shiftid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashierid uuid NOT NULL,
  shiftnumber text NOT NULL UNIQUE,
  isactive boolean NOT NULL DEFAULT true,
  openingtime timestamptz NOT NULL DEFAULT now(),
  closingtime timestamptz,
  openingcash numeric(12,2) NOT NULL DEFAULT 0,
  expectedcash numeric(12,2),
  actualcash numeric(12,2),
  variance numeric(12,2),
  variancereason text,
  totalsales numeric(12,2) NOT NULL DEFAULT 0,
  totalcashsales numeric(12,2) NOT NULL DEFAULT 0,
  totalcardsales numeric(12,2) NOT NULL DEFAULT 0,
  totalinsurancesales numeric(12,2) NOT NULL DEFAULT 0,
  totalcreditsales numeric(12,2) NOT NULL DEFAULT 0,
  transactioncount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN',
  notes text,
  createdat timestamptz NOT NULL DEFAULT now(),
  closedat timestamptz
);

-- POS: Sales
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_sales (
  saleid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salenumber text NOT NULL UNIQUE,
  saledate timestamptz NOT NULL DEFAULT now(),
  patientid uuid,
  customername text,
  customernationalid text,
  customerphone text,
  pharmacyorderid uuid REFERENCES "${schemaName}".pharmacy_orders(orderid) ON DELETE SET NULL,
  prescriptionid text,
  saletype text NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  taxamount numeric(12,2) NOT NULL DEFAULT 0,
  discountamount numeric(12,2) NOT NULL DEFAULT 0,
  totalamount numeric(12,2) NOT NULL,
  paidamount numeric(12,2) NOT NULL,
  changeamount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'COMPLETED',
  cashierid uuid NOT NULL,
  shiftid uuid REFERENCES "${schemaName}".pos_shifts(shiftid) ON DELETE SET NULL,
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_date ON "${schemaName}".pos_sales(saledate);
CREATE INDEX IF NOT EXISTS idx_pos_sales_patient ON "${schemaName}".pos_sales(patientid);
CREATE INDEX IF NOT EXISTS idx_pos_sales_status ON "${schemaName}".pos_sales(status);

-- POS: Sale Items
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_sale_items (
  itemid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saleid uuid NOT NULL REFERENCES "${schemaName}".pos_sales(saleid) ON DELETE CASCADE,
  drugid uuid REFERENCES "${schemaName}".drugs(drugid),
  drugname text NOT NULL,
  batchid uuid,
  lotnumber text,
  expirydate date,
  quantity integer NOT NULL,
  unitprice numeric(10,2) NOT NULL,
  discountpercent numeric(5,2) NOT NULL DEFAULT 0,
  discountamount numeric(10,2) NOT NULL DEFAULT 0,
  taxamount numeric(10,2) NOT NULL DEFAULT 0,
  totalamount numeric(10,2) NOT NULL,
  pharmacyorderitemid uuid REFERENCES "${schemaName}".pharmacy_order_items(itemid) ON DELETE SET NULL,
  createdat timestamptz NOT NULL DEFAULT now()
);

-- POS: Payments
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_payments (
  paymentid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saleid uuid NOT NULL REFERENCES "${schemaName}".pos_sales(saleid) ON DELETE CASCADE,
  paymentmethod text NOT NULL,
  amount numeric(12,2) NOT NULL,
  cardtype text,
  cardlast4 text,
  cardholder text,
  transactionid text,
  authorizationcode text,
  insurancecompanyid uuid REFERENCES "${schemaName}".insurance_companies(insuranceid) ON DELETE SET NULL,
  insuranceclaimnumber text,
  insurancecoverage numeric(12,2),
  patientcopay numeric(12,2),
  approvalcode text,
  creditaccountid uuid,
  creditbalancebefore numeric(12,2),
  creditbalanceafter numeric(12,2),
  status text NOT NULL DEFAULT 'COMPLETED',
  createdat timestamptz NOT NULL DEFAULT now()
);

-- POS: Return Reasons
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_return_reasons (
  reasonid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reasoncode text NOT NULL,
  reasonname text NOT NULL,
  reasondescription text,
  requiresapproval boolean NOT NULL DEFAULT false,
  allowsexchange boolean NOT NULL DEFAULT true,
  applyrestockingfee boolean NOT NULL DEFAULT false,
  restockingfeepercentage numeric(5,2) NOT NULL DEFAULT 0,
  isactive boolean NOT NULL DEFAULT true,
  displayorder integer NOT NULL DEFAULT 0,
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz NOT NULL DEFAULT now()
);

-- POS: Returns
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_returns (
  returnid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  returnnumber text NOT NULL UNIQUE,
  originalsaleid uuid NOT NULL REFERENCES "${schemaName}".pos_sales(saleid) ON DELETE RESTRICT,
  originalsalenumber text,
  originalsaledate timestamptz,
  returntype text NOT NULL,
  returndate timestamptz NOT NULL DEFAULT now(),
  returnreasonid uuid REFERENCES "${schemaName}".pos_return_reasons(reasonid) ON DELETE SET NULL,
  returnnotes text,
  patientid uuid,
  customername text,
  customerphone text,
  totalreturnamount numeric(12,2) NOT NULL DEFAULT 0,
  restockingfee numeric(12,2) NOT NULL DEFAULT 0,
  refundamount numeric(12,2) NOT NULL DEFAULT 0,
  refundmethod text,
  status text NOT NULL DEFAULT 'PENDING',
  requiresapproval boolean NOT NULL DEFAULT false,
  approvedby uuid,
  approvedat timestamptz,
  rejectionreason text,
  processedby uuid,
  processedat timestamptz,
  shiftid uuid REFERENCES "${schemaName}".pos_shifts(shiftid) ON DELETE SET NULL,
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz NOT NULL DEFAULT now()
);

-- POS: Return Items
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_return_items (
  returnitemid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  returnid uuid NOT NULL REFERENCES "${schemaName}".pos_returns(returnid) ON DELETE CASCADE,
  originalsaleitemid uuid REFERENCES "${schemaName}".pos_sale_items(itemid) ON DELETE SET NULL,
  drugid uuid,
  drugname text NOT NULL,
  batchid uuid,
  lotnumber text,
  quantityreturned integer NOT NULL,
  originalquantity integer,
  unitprice numeric(10,2) NOT NULL,
  totalprice numeric(10,2) NOT NULL,
  itemcondition text DEFAULT 'OPENED',
  restockeligible boolean NOT NULL DEFAULT true,
  restocked boolean NOT NULL DEFAULT false,
  itemnotes text,
  createdat timestamptz NOT NULL DEFAULT now()
);

-- POS: Refund Transactions
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_refund_transactions (
  refundtransactionid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  returnid uuid NOT NULL REFERENCES "${schemaName}".pos_returns(returnid) ON DELETE CASCADE,
  refundamount numeric(12,2) NOT NULL,
  refundmethod text NOT NULL,
  paymentreference text,
  cardlast4 text,
  storecreditcode text,
  transactiondate timestamptz NOT NULL DEFAULT now(),
  processedby uuid,
  createdat timestamptz NOT NULL DEFAULT now()
);

-- POS: Receipt Reprints
CREATE TABLE IF NOT EXISTS "${schemaName}".pos_receipt_reprints (
  reprintid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saleid uuid REFERENCES "${schemaName}".pos_sales(saleid) ON DELETE SET NULL,
  returnid uuid REFERENCES "${schemaName}".pos_returns(returnid) ON DELETE SET NULL,
  shiftid uuid REFERENCES "${schemaName}".pos_shifts(shiftid) ON DELETE SET NULL,
  receipttype text NOT NULL,
  reprintdate timestamptz NOT NULL DEFAULT now(),
  cashierid uuid NOT NULL,
  printformat text NOT NULL,
  reason text,
  createdat timestamptz NOT NULL DEFAULT now()
);

-- Patient Credit Accounts (patientid references public.patients)
CREATE TABLE IF NOT EXISTS "${schemaName}".patient_credit_accounts (
  accountid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patientid uuid NOT NULL,
  creditlimit numeric(12,2) NOT NULL DEFAULT 0,
  currentbalance numeric(12,2) NOT NULL DEFAULT 0,
  availablecredit numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE',
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patientid)
);
`;
}

// ─── Provisioning ─────────────────────────────────────────────────────────────

/**
 * Creates (provisions) a pharmacy tenant schema with all required tables.
 * Safe to call multiple times — uses IF NOT EXISTS.
 */
export async function provisionPharmacySchema(
  sql: postgres.Sql,
  workspaceid: string
): Promise<string> {
  const schemaName = getPharmacySchemaName(workspaceid);
  const ddl = getPharmacyDDL(schemaName);
  await sql.unsafe(ddl);
  return schemaName;
}

/**
 * Execute a callback with the search_path set to the pharmacy tenant schema.
 * Uses a transaction with SET LOCAL so the path resets after the transaction.
 */
export async function withPharmacySchema<T>(
  sql: postgres.Sql,
  workspaceid: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  const schemaName = getPharmacySchemaName(workspaceid);
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    return fn(tx) as T;
  }) as Promise<T>;
}

/**
 * Drops a pharmacy tenant schema (use with caution!).
 */
export async function dropPharmacySchema(
  sql: postgres.Sql,
  workspaceid: string
): Promise<void> {
  const schemaName = getPharmacySchemaName(workspaceid);
  await sql.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
}
